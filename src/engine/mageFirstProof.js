const MISSION_SCHEMA_V2 = 'securedme.education.algoquest.mission-envelope.v2';
const ARTIFACT_SCHEMA_V2 = 'securedme.education.algorithm-builder.algorithm-artifact-receipt.v2';
const LEARNER_PROFILE_SCHEMA_V1 = 'securedme.education.learner-profile.v1';

export const MAGE_CARD_TYPES = Object.freeze([
  'character-sheet',
  'deterministic-die',
  'force-vector',
  'trajectory',
  'variable-comparison',
  'model-limit',
  'test-run',
  'receipt',
]);

export const MAGE_CARD_SEQUENCE = Object.freeze([...MAGE_CARD_TYPES]);

const CARD_DEFAULTS = Object.freeze({
  'character-sheet': { role: 'apprenti-des-deux-horizons', level: 1 },
  'deterministic-die': { sides: 6, seed: 'seed:mage:first-proof' },
  'force-vector': { force_x: 2, force_y: 1 },
  trajectory: { duration: 4, origin_x: 0, origin_y: 0 },
  'variable-comparison': { variable: 'force_x', control: 2, changed: 3 },
  'model-limit': { explanation: '' },
  'test-run': { requested_tests: ['trajectory_changes', 'model_limit_is_written'] },
  receipt: { status: 'draft' },
});

export function canonicalJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export async function sha256Digest(value) {
  const payload = canonicalJson(value);
  if (globalThis.crypto && globalThis.crypto.subtle) {
    const bytes = new TextEncoder().encode(payload);
    const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
    return `sha256:${Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('')}`;
  }
  throw new Error('Web Crypto SHA-256 is required.');
}

export function createLearnerProfile(partial = {}) {
  return {
    schema: LEARNER_PROFILE_SCHEMA_V1,
    audience_band: partial.audience_band || 'primary-5-6',
    role: partial.role || 'student',
    language: partial.language || 'fr-CA',
    reading_density: partial.reading_density || 'guided',
    motion_preference: partial.motion_preference || 'reduced-when-requested',
    input_preference: partial.input_preference || 'pointer-and-keyboard',
    pacing_preference: partial.pacing_preference || 'self-paced',
    support_preference: partial.support_preference || 'graduated-hints',
    organization_ref: partial.organization_ref || null,
    organization_verified: partial.organization_verified === true,
    inferred_traits: false,
    reversible_preferences: true,
    raw_identity_stored: false,
    contract_version: 'v1',
  };
}

export function validateLearnerProfile(profile) {
  const allowedRoles = new Set(['student', 'teacher', 'educator-player', 'adult-learner']);
  const errors = [];
  if (!profile || typeof profile !== 'object' || Array.isArray(profile)) errors.push('profile-not-object');
  else {
    if (profile.schema !== LEARNER_PROFILE_SCHEMA_V1) errors.push('schema-mismatch');
    if (!allowedRoles.has(profile.role)) errors.push('role-not-allowed');
    if (!profile.audience_band || !profile.language) errors.push('profile-routing-incomplete');
    if (profile.organization_ref && profile.organization_verified !== true) errors.push('unverified-organization-reference');
    if (profile.inferred_traits !== false || profile.raw_identity_stored !== false) errors.push('hidden-profile-data-not-allowed');
  }
  return { valid: errors.length === 0, errors };
}

export function createMageCard(type, properties = {}, id = '') {
  if (!MAGE_CARD_TYPES.includes(type)) throw new Error(`Unsupported Mage card: ${type}`);
  return {
    id: id || `mage-card-${type}`,
    type,
    properties: { ...CARD_DEFAULTS[type], ...properties },
  };
}

export function createMagePrefab() {
  return MAGE_CARD_SEQUENCE.map((type) => createMageCard(type));
}

export function validateMissionEnvelopeV2(envelope, now = Date.now()) {
  const errors = [];
  if (!envelope || typeof envelope !== 'object' || Array.isArray(envelope)) return { valid: false, errors: ['mission-not-object'] };
  if (envelope.schema !== MISSION_SCHEMA_V2) errors.push('schema-mismatch');
  for (const field of ['run_id', 'mission_id', 'adaptation_id', 'hero_book_id', 'prompt_assignment_id', 'idempotency_key', 'prefab_digest', 'expires_at']) {
    if (typeof envelope[field] !== 'string' || envelope[field].length === 0) errors.push(`missing-${field}`);
  }
  if (envelope.canonical_state_owner !== 'algoquest') errors.push('authority-inversion');
  if (!Array.isArray(envelope.allowed_capabilities) || !envelope.allowed_capabilities.length) errors.push('capabilities-missing');
  else if (envelope.allowed_capabilities.some((capability) => !MAGE_CARD_TYPES.includes(capability))) errors.push('capability-not-allowed');
  if (!envelope.profile_projection || envelope.profile_projection.raw_identity_stored !== false || envelope.profile_projection.inferred_traits !== false) errors.push('unsafe-profile-projection');
  const expiry = Date.parse(envelope.expires_at);
  if (!Number.isFinite(expiry) || expiry <= now) errors.push('mission-expired');
  if (envelope.raw_secret_stored !== false || envelope.contains_canonical_state !== false) errors.push('unsafe-mission-payload');
  return { valid: errors.length === 0, errors };
}

export function validateCardProgram(cards, mission) {
  const errors = [];
  const guidance = [];
  if (!Array.isArray(cards)) return { valid: false, errors: ['cards-not-array'], guidance: ['Restore the saved Mage prefab and try again.'] };
  const seen = new Set();
  cards.forEach((card, index) => {
    if (!card || !MAGE_CARD_TYPES.includes(card.type)) {
      errors.push(`card-${index}-unsupported`);
      return;
    }
    if (seen.has(card.type)) errors.push(`duplicate-${card.type}`);
    seen.add(card.type);
    const expectedIndex = MAGE_CARD_SEQUENCE.indexOf(card.type);
    if (expectedIndex !== index) {
      errors.push(`out-of-order-${card.type}`);
      guidance.push(`${card.type} belongs in slot ${expectedIndex + 1}. Move it back whenever you are ready.`);
    }
  });
  const missing = MAGE_CARD_SEQUENCE.filter((type) => !seen.has(type));
  missing.forEach((type) => errors.push(`missing-${type}`));
  const limitCard = cards.find((card) => card.type === 'model-limit');
  if (!limitCard || String(limitCard.properties.explanation || '').trim().length < 20) {
    errors.push('model-limit-too-short');
    guidance.push('Explain what the trajectory model shows and what it cannot prove.');
  }
  if (mission && validateMissionEnvelopeV2(mission).valid === false) errors.push('mission-invalid');
  return { valid: errors.length === 0, errors, guidance };
}

function cardProperties(cards, type) {
  return cards.find((card) => card.type === type)?.properties || CARD_DEFAULTS[type];
}

export function executeMageProgram(cards) {
  const force = cardProperties(cards, 'force-vector');
  const trajectory = cardProperties(cards, 'trajectory');
  const comparison = cardProperties(cards, 'variable-comparison');
  const duration = Number(trajectory.duration);
  const buildPath = (forceX) => {
    let x = Number(trajectory.origin_x);
    let y = Number(trajectory.origin_y);
    const positions = [];
    for (let step = 1; step <= duration; step += 1) {
      x += Number(forceX);
      y += Number(force.force_y);
      positions.push({ step, x, y });
    }
    return positions;
  };
  const control = buildPath(Number(comparison.control));
  const changed = buildPath(Number(comparison.changed));
  return {
    control,
    changed,
    changed_variable: comparison.variable,
    trajectory_changed: canonicalJson(control) !== canonicalJson(changed),
  };
}

export function generateMagePython(cards, mission) {
  const force = cardProperties(cards, 'force-vector');
  const trajectory = cardProperties(cards, 'trajectory');
  const comparison = cardProperties(cards, 'variable-comparison');
  const limit = String(cardProperties(cards, 'model-limit').explanation || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  return [
    'import json',
    `mission_id = '${mission.mission_id}'`,
    `force_y = ${Number(force.force_y)}`,
    `duration = ${Number(trajectory.duration)}`,
    `origin_x = ${Number(trajectory.origin_x)}`,
    `origin_y = ${Number(trajectory.origin_y)}`,
    'def build_path(force_x):',
    '    x, y = origin_x, origin_y',
    '    positions = []',
    '    for step in range(1, duration + 1):',
    '        x += force_x',
    '        y += force_y',
    "        positions.append({'step': step, 'x': x, 'y': y})",
    '    return positions',
    `control = build_path(${Number(comparison.control)})`,
    `changed = build_path(${Number(comparison.changed)})`,
    `model_limit = '${limit}'`,
    "result = {'control': control, 'changed': changed, 'changed_variable': 'force_x', 'trajectory_changed': control != changed, 'model_limit': model_limit}",
    'print(json.dumps(result, sort_keys=True))',
    '',
  ].join('\n');
}

export async function buildAlgorithmArtifactReceiptV2({ mission, cards, attempt_id = 'attempt-1' }) {
  const missionValidation = validateMissionEnvelopeV2(mission);
  if (!missionValidation.valid) throw new Error(`Mission rejected: ${missionValidation.errors.join(', ')}`);
  const validation = validateCardProgram(cards, mission);
  const generatedCode = generateMagePython(cards, mission);
  const result = executeMageProgram(cards);
  const codeDigest = await sha256Digest(generatedCode);
  const graph = {
    nodes: cards.map((card, index) => ({ id: card.id, type: card.type, position: index, properties: card.properties })),
    edges: cards.slice(1).map((card, index) => ({ id: `edge-${index + 1}`, from: cards[index].id, to: card.id, type: 'sequence' })),
  };
  const body = {
    schema: ARTIFACT_SCHEMA_V2,
    receipt_id: `algorithm-artifact:${mission.run_id}:${attempt_id}`,
    source_app: 'algorithm-builder',
    target_app: 'algoquest',
    run_id: mission.run_id,
    mission_id: mission.mission_id,
    adaptation_id: mission.adaptation_id,
    hero_book_id: mission.hero_book_id,
    prompt_assignment_id: mission.prompt_assignment_id,
    idempotency_key: mission.idempotency_key,
    attempt_id,
    prefab_version: mission.prefab_version,
    prefab_digest: mission.prefab_digest,
    capability_refs: [...mission.allowed_capabilities],
    graph,
    generated_code: { language: 'python', digest: codeDigest, source: generatedCode },
    requested_tests: cardProperties(cards, 'test-run').requested_tests,
    local_tests: [
      { test_id: 'card_program_valid', status: validation.valid ? 'passed' : 'failed', details: validation.errors },
      { test_id: 'trajectory_changes', status: result.trajectory_changed ? 'passed' : 'failed' },
      { test_id: 'model_limit_is_written', status: String(cardProperties(cards, 'model-limit').explanation || '').trim().length >= 20 ? 'passed' : 'failed' },
    ],
    provenance: { engine: 'mage-first-proof', engine_version: 'v1', deterministic: true },
    raw_secret_stored: false,
    raw_identity_stored: false,
    hidden_telemetry_stored: false,
    contains_canonical_state: false,
    contract_version: 'v2',
  };
  return { ...body, artifact_digest: await sha256Digest(body) };
}

export async function validateAlgorithmArtifactReceiptV2(receipt, mission) {
  const errors = [];
  if (!receipt || receipt.schema !== ARTIFACT_SCHEMA_V2) return { valid: false, errors: ['schema-mismatch'] };
  if (!mission || receipt.run_id !== mission.run_id || receipt.mission_id !== mission.mission_id || receipt.prompt_assignment_id !== mission.prompt_assignment_id) errors.push('mission-binding-mismatch');
  if (receipt.raw_secret_stored !== false || receipt.raw_identity_stored !== false || receipt.hidden_telemetry_stored !== false || receipt.contains_canonical_state !== false) errors.push('unsafe-artifact');
  if (!receipt.generated_code || await sha256Digest(receipt.generated_code.source) !== receipt.generated_code.digest) errors.push('code-digest-mismatch');
  const body = { ...receipt };
  delete body.artifact_digest;
  if (await sha256Digest(body) !== receipt.artifact_digest) errors.push('artifact-digest-mismatch');
  if (!Array.isArray(receipt.local_tests) || receipt.local_tests.some((test) => test.status !== 'passed')) errors.push('local-tests-not-passed');
  return { valid: errors.length === 0, errors };
}

export const MageFirstProofSchemas = Object.freeze({
  mission: MISSION_SCHEMA_V2,
  artifact: ARTIFACT_SCHEMA_V2,
  learnerProfile: LEARNER_PROFILE_SCHEMA_V1,
});
