const assert = require('assert');
const { spawnSync } = require('child_process');
const { createApp } = require('../server');
const { MemoryRunStore } = require('../server/runStore');
const { validateMissionEnvelopeV2 } = require('../server/contracts');
const { loadMageEngine } = require('./test-engine-loader');

async function request(base, path, { token = 'learner-a', method = 'GET', body, capability } = {}) {
  const headers = { Authorization: `Bearer ${token}` };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (capability) headers['X-Run-Capability'] = capability;
  const response = await fetch(`${base}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await response.text();
  let payload;
  try { payload = JSON.parse(text); } catch (_error) { payload = text; }
  return { status: response.status, payload };
}

(async () => {
  const engine = loadMageEngine();
  const app = createApp({
    runStore: new MemoryRunStore(),
    signingKey: 'test-signing-key-not-a-production-secret',
    subjectPepper: 'test-subject-domain',
    authenticate: async (req) => ({ sub: String(req.get('authorization') || '').replace(/^Bearer\s+/i, '') }),
    brokerBaseUrl: 'http://127.0.0.1:1',
  });
  await app.locals.ready;
  const server = await new Promise((resolve) => { const value = app.listen(0, '127.0.0.1', () => resolve(value)); });
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const mission = {
      schema: engine.MageFirstProofSchemas.mission, run_id: 'mage-run-broker-test', mission_id: 'mage-force-and-trajectory',
      adaptation_id: 'two-horizons-primary-fr', hero_book_id: 'hero-book-mage', prompt_assignment_id: 'prompt-once',
      idempotency_key: 'idempotency-once', allowed_capabilities: [...engine.MAGE_CARD_TYPES], prefab_version: 'mage-prefab.v1',
      prefab_digest: 'sha256:prefab-test-fixture', profile_projection: { raw_identity_stored: false, inferred_traits: false },
      expires_at: new Date(Date.now() + 60_000).toISOString(), return_channel_ref: 'extension:runtime', canonical_state_owner: 'algoquest',
      contains_canonical_state: false, raw_secret_stored: false,
    };
    const profile = engine.createLearnerProfile();
    const createBody = { mission_envelope: mission, learner_profile: profile };
    let result = await request(base, '/api/v1/runs', { method: 'POST', body: createBody });
    assert.strictEqual(result.status, 201);
    result = await request(base, '/api/v1/runs', { method: 'POST', body: createBody });
    assert.strictEqual(result.status, 200, 'same mission is consumed idempotently');
    result = await request(base, '/api/v1/runs', { token: 'learner-b', method: 'POST', body: createBody });
    assert.strictEqual(result.status, 409, 'run id cannot be rebound to another account');
    result = await request(base, `/api/v1/runs/${mission.run_id}`, { token: 'learner-b' });
    assert.strictEqual(result.status, 403);

    const cards = engine.createMagePrefab();
    cards.find((card) => card.type === 'model-limit').properties.explanation = 'This model compares two trajectories but cannot prove how a real object will move.';
    const artifact = await engine.buildAlgorithmArtifactReceiptV2({ mission, cards });
    const tampered = JSON.parse(JSON.stringify(artifact));
    tampered.generated_code.source += '\nprint(999)';
    result = await request(base, `/api/v1/runs/${mission.run_id}/artifact`, { method: 'POST', body: { artifact_receipt: tampered } });
    assert.strictEqual(result.status, 422);
    result = await request(base, `/api/v1/runs/${mission.run_id}/artifact`, { method: 'POST', body: { artifact_receipt: artifact } });
    assert.strictEqual(result.status, 201);
    const capability = result.payload.callback_capability;
    assert(capability && !JSON.stringify(result.payload.run).includes(capability));

    const notebook = await request(base, `/api/v1/runs/${mission.run_id}/notebook`, { capability });
    assert.strictEqual(notebook.status, 200);
    const code = notebook.payload.cells[1].source.join('');
    const python = spawnSync('python', ['-c', code], { encoding: 'utf8' });
    assert.strictEqual(python.status, 0, python.stderr);
    const pythonResult = JSON.parse(python.stdout.trim());
    assert.deepStrictEqual(pythonResult.control, engine.executeMageProgram(cards).control);

    const execution = {
      provider: 'google-colab', run_id: mission.run_id, mission_id: mission.mission_id, artifact_digest: artifact.artifact_digest,
      execution_result: { trajectory_changed: true }, model_limit_response: cards.find((card) => card.type === 'model-limit').properties.explanation,
      tests: [{ test_id: 'trajectory_changes', status: 'passed' }, { test_id: 'model_limit_is_written', status: 'passed' }],
      executed_at: new Date().toISOString(), contains_identity: false, contains_secret: false, contains_canonical_state: false,
    };
    result = await request(base, `/api/v1/runs/${mission.run_id}/colab-callback`, { method: 'POST', body: execution, capability });
    assert.strictEqual(result.status, 201);
    assert.strictEqual(result.payload.execution_receipt.raw_secret_stored, false);
    assert(!JSON.stringify(result.payload.execution_receipt).includes(capability));
    const firstReceipt = result.payload.execution_receipt;
    result = await request(base, `/api/v1/runs/${mission.run_id}/colab-callback`, { method: 'POST', body: execution, capability });
    assert.strictEqual(result.status, 200);
    assert.deepStrictEqual(result.payload.execution_receipt, firstReceipt, 'duplicate callback returns identical receipt');

    result = await request(base, `/api/v1/runs/${mission.run_id}/retry`, { method: 'POST' });
    assert.strictEqual(result.status, 200);
    assert.strictEqual(result.payload.penalized, false);
    assert.strictEqual(result.payload.work_preserved, true);
    assert.strictEqual(result.payload.run.artifact_digest, artifact.artifact_digest);
    assert(validateMissionEnvelopeV2({ ...mission, expires_at: new Date(Date.now() - 1).toISOString() }).errors.includes('mission-expired'));
    console.log('Mage broker: auth binding, idempotency, tamper rejection, notebook parity, duplicate callback, and calm retry passed.');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
