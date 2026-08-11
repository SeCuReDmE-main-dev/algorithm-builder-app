const assert = require('assert');
const { loadMageEngine } = require('./test-engine-loader');

(async () => {
  const engine = loadMageEngine();
  const mission = {
    schema: engine.MageFirstProofSchemas.mission,
    run_id: 'mage-run-contract-test',
    mission_id: 'mage-force-and-trajectory',
    adaptation_id: 'two-horizons-primary-fr',
    hero_book_id: 'hero-book-mage',
    prompt_assignment_id: 'prompt-assignment-once',
    idempotency_key: 'idempotency-once',
    allowed_capabilities: [...engine.MAGE_CARD_TYPES],
    prefab_version: 'mage-prefab.v1',
    prefab_digest: 'sha256:prefab-test-fixture',
    profile_projection: { language: 'fr-CA', raw_identity_stored: false, inferred_traits: false },
    expires_at: new Date(Date.now() + 60_000).toISOString(),
    return_channel_ref: 'extension:runtime',
    canonical_state_owner: 'algoquest',
    contains_canonical_state: false,
    raw_secret_stored: false,
  };
  assert.deepStrictEqual(engine.validateMissionEnvelopeV2(mission).errors, []);
  assert(engine.validateMissionEnvelopeV2({ ...mission, expires_at: new Date(Date.now() - 1).toISOString() }).errors.includes('mission-expired'));

  const cards = engine.createMagePrefab();
  cards.find((card) => card.type === 'model-limit').properties.explanation = 'This path model compares forces but cannot prove what happens in the physical world.';
  const receipt = await engine.buildAlgorithmArtifactReceiptV2({ mission, cards });
  assert((await engine.validateAlgorithmArtifactReceiptV2(receipt, mission)).valid);
  assert(engine.executeMageProgram(cards).trajectory_changed);
  assert(engine.generateMagePython(cards, mission).includes("mission_id = 'mage-force-and-trajectory'"));

  const tampered = JSON.parse(JSON.stringify(receipt));
  tampered.graph.nodes[2].properties.force_x = 999;
  assert((await engine.validateAlgorithmArtifactReceiptV2(tampered, mission)).errors.includes('artifact-digest-mismatch'));
  const invalidOrder = [...cards];
  [invalidOrder[0], invalidOrder[1]] = [invalidOrder[1], invalidOrder[0]];
  assert.strictEqual(engine.validateCardProgram(invalidOrder, mission).valid, false);
  assert(engine.validateCardProgram(invalidOrder, mission).guidance.length >= 2);

  const unsafeProfile = engine.createLearnerProfile({ organization_ref: 'school:unverified' });
  assert(engine.validateLearnerProfile(unsafeProfile).errors.includes('unverified-organization-reference'));
  assert.strictEqual(engine.createLearnerProfile().inferred_traits, false);
  console.log('Mage first-proof engine: contracts, digests, deterministic program, reversibility, and privacy passed.');
})().catch((error) => { console.error(error); process.exitCode = 1; });
