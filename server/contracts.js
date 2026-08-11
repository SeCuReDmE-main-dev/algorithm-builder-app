const crypto = require('crypto');

const MISSION_SCHEMA_V2 = 'securedme.education.algoquest.mission-envelope.v2';
const ARTIFACT_SCHEMA_V2 = 'securedme.education.algorithm-builder.algorithm-artifact-receipt.v2';
const EXECUTION_SCHEMA_V2 = 'securedme.education.colab.execution-receipt.v2';

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function sha256Digest(value) {
  return `sha256:${crypto.createHash('sha256').update(canonicalJson(value)).digest('hex')}`;
}

function hashOpaque(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function validateMissionEnvelopeV2(mission, now = Date.now()) {
  const errors = [];
  if (!mission || typeof mission !== 'object' || Array.isArray(mission)) return { valid: false, errors: ['mission-not-object'] };
  if (mission.schema !== MISSION_SCHEMA_V2) errors.push('schema-mismatch');
  for (const field of ['run_id', 'mission_id', 'adaptation_id', 'hero_book_id', 'prompt_assignment_id', 'idempotency_key', 'prefab_digest', 'expires_at']) {
    if (typeof mission[field] !== 'string' || !mission[field]) errors.push(`missing-${field}`);
  }
  if (mission.canonical_state_owner !== 'algoquest' || mission.contains_canonical_state !== false) errors.push('authority-inversion');
  if (!Array.isArray(mission.allowed_capabilities) || mission.allowed_capabilities.length === 0) errors.push('capabilities-missing');
  if (mission.raw_secret_stored !== false || !mission.profile_projection || mission.profile_projection.raw_identity_stored !== false || mission.profile_projection.inferred_traits !== false) errors.push('unsafe-mission');
  if (!Number.isFinite(Date.parse(mission.expires_at)) || Date.parse(mission.expires_at) <= now) errors.push('mission-expired');
  return { valid: errors.length === 0, errors };
}

function validateArtifactReceiptV2(receipt, mission) {
  const errors = [];
  if (!receipt || receipt.schema !== ARTIFACT_SCHEMA_V2) return { valid: false, errors: ['schema-mismatch'] };
  if (!mission || receipt.run_id !== mission.run_id || receipt.mission_id !== mission.mission_id || receipt.prompt_assignment_id !== mission.prompt_assignment_id) errors.push('mission-binding-mismatch');
  if (receipt.raw_secret_stored !== false || receipt.raw_identity_stored !== false || receipt.hidden_telemetry_stored !== false || receipt.contains_canonical_state !== false) errors.push('unsafe-artifact');
  if (!receipt.generated_code || sha256Digest(receipt.generated_code.source) !== receipt.generated_code.digest) errors.push('code-digest-mismatch');
  const body = { ...receipt };
  delete body.artifact_digest;
  if (sha256Digest(body) !== receipt.artifact_digest) errors.push('artifact-digest-mismatch');
  if (!Array.isArray(receipt.local_tests) || receipt.local_tests.some((test) => test.status !== 'passed')) errors.push('local-tests-not-passed');
  return { valid: errors.length === 0, errors };
}

function buildExecutionReceiptV2({ run, payload, signingKey, timestamp = new Date().toISOString() }) {
  const executionTests = Array.isArray(payload.tests) ? payload.tests : [];
  const body = {
    schema: EXECUTION_SCHEMA_V2,
    receipt_id: `colab-execution:${run.run_id}:${run.attempt}`,
    provider: payload.provider === 'local-sandbox' ? 'local-sandbox' : 'google-colab',
    run_id: run.run_id,
    mission_id: run.mission.mission_id,
    adaptation_id: run.mission.adaptation_id,
    prompt_assignment_id: run.mission.prompt_assignment_id,
    artifact_digest: run.artifact_digest,
    generated_code_digest: run.artifact.generated_code.digest,
    attempt_id: run.artifact.attempt_id,
    execution_result: payload.execution_result,
    model_limit_response: String(payload.model_limit_response || '').trim(),
    tests: executionTests,
    executed_at: payload.executed_at || timestamp,
    admitted_at: timestamp,
    contains_identity: false,
    contains_secret: false,
    contains_canonical_state: false,
    hidden_telemetry_stored: false,
    raw_secret_stored: false,
    contract_version: 'v2',
  };
  const receiptDigest = sha256Digest(body);
  const signature = crypto.createHmac('sha256', signingKey).update(receiptDigest).digest('hex');
  return {
    ...body,
    receipt_digest: receiptDigest,
    server_attestation: { alg: 'HS256', key_ref: 'broker-receipt-key', signature: `hmac-sha256:${signature}` },
  };
}

function validateExecutionPayload(payload, run) {
  const errors = [];
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return { valid: false, errors: ['payload-not-object'] };
  if (!run.artifact || payload.artifact_digest !== run.artifact_digest) errors.push('artifact-binding-mismatch');
  if (payload.run_id !== run.run_id || payload.mission_id !== run.mission.mission_id) errors.push('run-binding-mismatch');
  if (!Array.isArray(payload.tests) || payload.tests.length === 0 || payload.tests.some((test) => !test || test.status !== 'passed')) errors.push('execution-tests-not-passed');
  if (String(payload.model_limit_response || '').trim().length < 20) errors.push('model-limit-too-short');
  if (payload.contains_identity !== false || payload.contains_secret !== false || payload.contains_canonical_state !== false) errors.push('unsafe-execution-payload');
  return { valid: errors.length === 0, errors };
}

module.exports = {
  ARTIFACT_SCHEMA_V2,
  EXECUTION_SCHEMA_V2,
  MISSION_SCHEMA_V2,
  buildExecutionReceiptV2,
  canonicalJson,
  hashOpaque,
  safeEqual,
  sha256Digest,
  validateArtifactReceiptV2,
  validateExecutionPayload,
  validateMissionEnvelopeV2,
};
