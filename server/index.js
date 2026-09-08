const crypto = require('crypto');
require('./loadSuiteEnv');
const express = require('express');
const path = require('path');
const { Pool } = require('pg');
const { auth } = require('express-oauth2-jwt-bearer');
const {
  buildExecutionReceiptV2,
  hashOpaque,
  safeEqual,
  sha256Digest,
  validateArtifactReceiptV2,
  validateExecutionPayload,
  validateMissionEnvelopeV2,
  verifyExecutionReceiptV2,
} = require('./contracts');
const { notebookForRun } = require('./notebook');
const { MemoryRunStore, PostgresRunStore } = require('./runStore');

const CALLBACK_TTL_MS = 15 * 60 * 1000;

function parseOrigins(value) {
  return String(value || 'http://localhost:5173,http://127.0.0.1:5173,https://algoquest.securedme.ca')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function safeRun(run) {
  if (!run) return null;
  return {
    schema: 'securedme.education.mage-first-proof.broker-run.v1',
    run_id: run.run_id,
    mission_id: run.mission.mission_id,
    prompt_assignment_id: run.mission.prompt_assignment_id,
    status: run.status,
    attempt: run.attempt,
    artifact_digest: run.artifact_digest || null,
    callback_expires_at: run.callback_expires_at || null,
    execution_receipt: run.execution_receipt || null,
    created_at: run.created_at,
    updated_at: run.updated_at,
    raw_identity_stored: false,
    hidden_telemetry_stored: false,
  };
}

function bearerMiddleware(options) {
  if (typeof options.authenticate === 'function') {
    return async (request, response, next) => {
      try {
        const identity = await options.authenticate(request);
        if (!identity || !identity.sub) return response.status(401).json({ error: 'authentication-required' });
        request.auth = { payload: identity };
        return next();
      } catch (_error) {
        return response.status(401).json({ error: 'authentication-required' });
      }
    };
  }
  const issuerBaseURL = options.auth0IssuerBaseUrl || process.env.AUTH0_ISSUER_BASE_URL;
  const audience = options.auth0Audience || process.env.AUTH0_AUDIENCE;
  if (!issuerBaseURL || !audience) {
    return (_request, response) => response.status(503).json({ error: 'auth0-not-configured', recovery: 'Configure Auth0 OIDC or use the explicit JSON fallback.' });
  }
  return auth({ issuerBaseURL, audience, tokenSigningAlg: 'RS256' });
}

function createDefaultStore(options) {
  if (options.runStore) return options.runStore;
  if (options.pool) return new PostgresRunStore(options.pool);
  if (process.env.DATABASE_URL || process.env.PGHOST) return new PostgresRunStore(new Pool(process.env.DATABASE_URL ? { connectionString: process.env.DATABASE_URL } : undefined));
  return new MemoryRunStore();
}

function createApp(options = {}) {
  const app = express();
  const staticDirectory = options.staticDirectory || path.resolve(__dirname, '..', 'dist');
  const runStore = createDefaultStore(options);
  const signingKey = options.signingKey || process.env.BROKER_RECEIPT_SIGNING_KEY || '';
  const subjectPepper = options.subjectPepper || process.env.SUBJECT_HASH_PEPPER || 'local-development-subject-domain';
  const brokerBaseUrl = options.brokerBaseUrl || process.env.BROKER_BASE_URL || 'http://127.0.0.1:3000';
  const allowedOrigins = new Set(options.allowedOrigins || parseOrigins(process.env.BROKER_ALLOWED_ORIGINS));
  const requireBearer = bearerMiddleware(options);

  app.disable('x-powered-by');
  app.use(express.json({ limit: '512kb' }));
  app.use((request, response, next) => {
    const origin = request.get('origin');
    if (origin && allowedOrigins.has(origin)) {
      response.set('Access-Control-Allow-Origin', origin);
      response.set('Vary', 'Origin');
      response.set('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Run-Capability, Idempotency-Key');
      response.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    }
    if (request.method === 'OPTIONS') {
      if (origin && !allowedOrigins.has(origin)) return response.status(403).end();
      return response.status(204).end();
    }
    return next();
  });

  app.locals.runStore = runStore;
  app.locals.ready = Promise.resolve().then(() => runStore.initialize());

  app.get('/health', async (_request, response) => {
    try {
      await app.locals.ready;
      response.json({ status: 'healthy', service: 'algorithm-builder-app', broker: 'mage-first-proof-v1', auth_configured: Boolean(options.authenticate || (process.env.AUTH0_ISSUER_BASE_URL && process.env.AUTH0_AUDIENCE)), signing_configured: Boolean(signingKey) });
    } catch (_error) {
      response.status(503).json({ status: 'unhealthy', service: 'algorithm-builder-app' });
    }
  });

  app.post('/api/v1/runs', requireBearer, async (request, response, next) => {
    try {
      await app.locals.ready;
      const mission = request.body && request.body.mission_envelope;
      const learnerProfile = request.body && request.body.learner_profile;
      const validation = validateMissionEnvelopeV2(mission);
      if (!validation.valid) return response.status(422).json({ error: 'mission-rejected', validation_errors: validation.errors });
      if (!learnerProfile || learnerProfile.schema !== 'securedme.education.learner-profile.v1' || learnerProfile.raw_identity_stored !== false || learnerProfile.inferred_traits !== false) {
        return response.status(422).json({ error: 'learner-profile-rejected' });
      }
      const now = new Date().toISOString();
      const run = {
        run_id: mission.run_id,
        subject_ref: hashOpaque(`${subjectPepper}:${request.auth.payload.sub}`),
        idempotency_key: mission.idempotency_key,
        mission,
        learner_profile: learnerProfile,
        status: 'mission-admitted',
        attempt: 1,
        artifact: null,
        artifact_digest: null,
        callback_hash: null,
        callback_expires_at: null,
        callback_used_at: null,
        execution_input_digest: null,
        execution_receipt: null,
        created_at: now,
        updated_at: now,
      };
      const result = await runStore.createRun(run);
      return response.status(result.created ? 201 : 200).json({ created: result.created, run: safeRun(result.run) });
    } catch (error) {
      return next(error);
    }
  });

  async function ownedRun(request, response) {
    const run = await runStore.getRun(request.params.runId);
    if (!run) {
      response.status(404).json({ error: 'run-not-found' });
      return null;
    }
    const subjectRef = hashOpaque(`${subjectPepper}:${request.auth.payload.sub}`);
    if (!safeEqual(run.subject_ref, subjectRef)) {
      response.status(403).json({ error: 'run-owner-mismatch' });
      return null;
    }
    return run;
  }

  app.get('/api/v1/runs/:runId/mission', requireBearer, async (request, response, next) => {
    try {
      const run = await ownedRun(request, response);
      if (!run) return undefined;
      return response.json({ mission_envelope: run.mission, run: safeRun(run) });
    } catch (error) { return next(error); }
  });

  app.post('/api/v1/runs/:runId/artifact', requireBearer, async (request, response, next) => {
    try {
      if (!signingKey) return response.status(503).json({ error: 'broker-signing-not-configured' });
      const run = await ownedRun(request, response);
      if (!run) return undefined;
      const artifact = request.body && request.body.artifact_receipt;
      const validation = validateArtifactReceiptV2(artifact, run.mission);
      if (!validation.valid) return response.status(422).json({ error: 'artifact-rejected', validation_errors: validation.errors });
      if (run.artifact_digest === artifact.artifact_digest && run.callback_hash && Date.parse(run.callback_expires_at) > Date.now()) {
        return response.status(200).json({ duplicate: true, callback_issued: false, run: safeRun(run), recovery: 'Use the callback capability returned by the first successful submission, or request a calm retry.' });
      }
      const callbackCapability = crypto.randomBytes(32).toString('base64url');
      const callbackExpiresAt = new Date(Date.now() + CALLBACK_TTL_MS).toISOString();
      const saved = await runStore.saveArtifact(run.run_id, artifact, hashOpaque(callbackCapability), callbackExpiresAt);
      return response.status(201).json({ duplicate: false, callback_issued: true, callback_capability: callbackCapability, callback_expires_at: callbackExpiresAt, run: safeRun(saved) });
    } catch (error) { return next(error); }
  });

  app.get('/api/v1/runs/:runId/notebook', requireBearer, async (request, response, next) => {
    try {
      const run = await ownedRun(request, response);
      if (!run) return undefined;
      const capability = request.get('X-Run-Capability') || '';
      if (!run.callback_hash || !safeEqual(hashOpaque(capability), run.callback_hash) || Date.parse(run.callback_expires_at) <= Date.now()) return response.status(401).json({ error: 'callback-capability-invalid-or-expired' });
      const notebook = notebookForRun({ run, callbackCode: capability, brokerBaseUrl });
      response.set('Content-Type', 'application/x-ipynb+json');
      response.set('Content-Disposition', `attachment; filename="algoquest-mage-${run.run_id}.ipynb"`);
      return response.send(JSON.stringify(notebook, null, 2));
    } catch (error) { return next(error); }
  });

  app.post('/api/v1/runs/:runId/colab-callback', async (request, response, next) => {
    try {
      if (!signingKey) return response.status(503).json({ error: 'broker-signing-not-configured' });
      const run = await runStore.getRun(request.params.runId);
      if (!run) return response.status(404).json({ error: 'run-not-found' });
      const capability = request.get('X-Run-Capability') || '';
      if (!run.callback_hash || !safeEqual(hashOpaque(capability), run.callback_hash)) return response.status(401).json({ error: 'callback-capability-invalid' });
      if (Date.parse(run.callback_expires_at) <= Date.now()) return response.status(410).json({ error: 'callback-capability-expired', recovery: 'Return to the side panel and choose Retry. Your build is preserved.' });
      const validation = validateExecutionPayload(request.body, run);
      if (!validation.valid) return response.status(422).json({ error: 'execution-rejected', validation_errors: validation.errors, recovery: 'Correct the highlighted notebook cell and run it again. Nothing was lost.' });
      const inputDigest = sha256Digest(request.body);
      const receipt = buildExecutionReceiptV2({ run, payload: request.body, signingKey });
      const saved = await runStore.saveExecution(run.run_id, inputDigest, receipt);
      return response.status(saved.duplicate ? 200 : 201).json({ duplicate: saved.duplicate, execution_receipt: saved.run.execution_receipt, run: safeRun(saved.run) });
    } catch (error) { return next(error); }
  });

  app.get('/api/v1/runs/:runId', requireBearer, async (request, response, next) => {
    try {
      const run = await ownedRun(request, response);
      if (!run) return undefined;
      const receiptAuthentication = run.execution_receipt
        ? verifyExecutionReceiptV2(run.execution_receipt, { run, signingKey })
        : { valid: false, errors: ['execution-receipt-pending'] };
      if (run.execution_receipt && !receiptAuthentication.valid) return response.status(500).json({ error: 'stored-receipt-authentication-failed' });
      return response.json({ run: safeRun(run), receipt_authentication: { verified: receiptAuthentication.valid, errors: receiptAuthentication.errors } });
    } catch (error) { return next(error); }
  });

  app.post('/api/v1/runs/:runId/retry', requireBearer, async (request, response, next) => {
    try {
      const run = await ownedRun(request, response);
      if (!run) return undefined;
      const callbackCapability = crypto.randomBytes(32).toString('base64url');
      const callbackExpiresAt = new Date(Date.now() + CALLBACK_TTL_MS).toISOString();
      const saved = await runStore.rotateCallback(run.run_id, hashOpaque(callbackCapability), callbackExpiresAt);
      return response.json({ penalized: false, work_preserved: true, callback_capability: callbackCapability, callback_expires_at: callbackExpiresAt, run: safeRun(saved) });
    } catch (error) { return next(error); }
  });

  app.post('/api/v1/runs/:runId/cancel', requireBearer, async (request, response, next) => {
    try {
      const run = await ownedRun(request, response);
      if (!run) return undefined;
      const cancelled = await runStore.cancel(run.run_id);
      return response.json({ work_preserved: true, run: safeRun(cancelled) });
    } catch (error) { return next(error); }
  });

  app.use(express.static(staticDirectory));
  app.use((error, _request, response, _next) => {
    const code = error && error.code;
    if (code === 'ARTIFACT_CONFLICT' || code === 'EXECUTION_CONFLICT' || code === 'RUN_ID_CONFLICT') return response.status(409).json({ error: code.toLowerCase(), recovery: 'Refresh the run before retrying. Your admitted work was not replaced.' });
    if (error && error.status) return response.status(error.status).json({ error: error.code || 'request-rejected' });
    return response.status(500).json({ error: 'broker-operation-failed', recovery: 'Your build remains saved. Retry when the connection returns.' });
  });

  return app;
}

async function startServer(options = {}) {
  const port = Number(options.port || process.env.PORT || 3000);
  const host = options.host || process.env.HOST || '127.0.0.1';
  const app = createApp(options);
  await app.locals.ready;
  const server = app.listen(port, host, () => {
    console.log(`Algorithm Builder server listening on http://${host}:${port}`);
  });
  return server;
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error('Algorithm Builder failed to start safely:', error.message);
    process.exitCode = 1;
  });
}

module.exports = { createApp, safeRun, startServer };
