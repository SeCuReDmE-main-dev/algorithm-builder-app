import { createMagePrefab, generateMagePython, validateCardProgram, validateMissionEnvelopeV2 } from './engine/mageFirstProof';

/** Builder is a forge: these handlers can stage work or return receipts but
 * never issue tokens, select prompts, or mutate AlgoQuest progress. */
const MODES = Object.freeze({ READ: 'READ', STAGE: 'STAGE', EXECUTE: 'EXECUTE' });
const secretLike = /(password|cookie|authorization|access_token|client_secret|raw_prompt|student_email)/i;
const safe = (input = {}) => { if (secretLike.test(JSON.stringify(input))) throw new Error('SECRET_OR_PERSONAL_DATA_REJECTED'); return input; };
const adapter = () => globalThis.AlgorithmBuilderAlgoQuestQbitAdapter;
const mission = (input) => safe(input).mission || null;
const cards = (input) => Array.isArray(safe(input).cards) ? input.cards : createMagePrefab();
const status = (input) => ({ state: 'local-only', run_id: typeof input.run_id === 'string' ? input.run_id : null, canonical_state_owner: 'algoquest', raw_secret_stored: false });
const EXECUTE_TOOLS = new Set(['builder_submit_artifact', 'builder_prepare_colab_handoff']);
const issuedApprovals = new Map();
const idempotentResults = new Map();

/** Only a visible approval UI may mint this short-lived, one-use token. */
export function grantBuilderOneUseApproval(tool_name, audience, nonce, expires_at) {
  if (!EXECUTE_TOOLS.has(tool_name) || !audience || !nonce || !Number.isFinite(expires_at) || expires_at <= Date.now()) throw new Error('INVALID_HUMAN_APPROVAL');
  const approval = { tool_name, audience, nonce, expires_at, human_confirmed: true };
  issuedApprovals.set(nonce, approval);
  return approval;
}
function executeWithApproval(toolName, input, operation) {
  const value = safe(input);
  const key = typeof value.idempotencyKey === 'string' ? value.idempotencyKey : '';
  if (!/^[a-z0-9_-]{12,128}$/i.test(key)) throw new Error('IDEMPOTENCY_KEY_REQUIRED');
  const resultKey = `${toolName}:${key}`;
  if (idempotentResults.has(resultKey)) return idempotentResults.get(resultKey);
  const approval = value.approval;
  const issued = approval?.nonce ? issuedApprovals.get(approval.nonce) : null;
  if (!issued || !approval || issued.tool_name !== toolName || issued.audience !== value.audience || issued.expires_at <= Date.now() || approval.human_confirmed !== true) throw new Error('HUMAN_APPROVAL_REQUIRED_OR_EXPIRED');
  issuedApprovals.delete(issued.nonce);
  const result = operation(value);
  idempotentResults.set(resultKey, result);
  return result;
}
const approvalSchema = { type: 'object', properties: { tool_name: { type: 'string' }, audience: { type: 'string' }, nonce: { type: 'string' }, expires_at: { type: 'number' }, human_confirmed: { const: true } }, required: ['tool_name', 'audience', 'nonce', 'expires_at', 'human_confirmed'], additionalProperties: false };
function valueSchema(key) {
  if (['mission', 'context', 'component', 'artifact_receipt'].includes(key)) return { type: 'object' };
  if (key === 'cards') return { type: 'array' };
  if (key === 'sides') return { type: 'integer' };
  return { type: 'string' };
}
function closedToolSchema(tool) {
  const properties = Object.fromEntries(Object.keys(tool.inputSchema).map((key) => [key, valueSchema(key)]));
  return { type: 'object', properties: { ...properties, approval: approvalSchema, audience: { type: 'string', minLength: 1 }, idempotencyKey: { type: 'string', pattern: '^[A-Za-z0-9_-]{12,128}$' } }, required: tool.mode === MODES.EXECUTE ? [...Object.keys(tool.inputSchema), 'approval', 'audience', 'idempotencyKey'] : Object.keys(tool.inputSchema), additionalProperties: false };
}

export const BUILDER_WEBMCP_TOOLS = [
  { name: 'builder_validate_mission', mode: MODES.READ, description: 'Validate an AlgoQuest mission without claiming mission authority.', inputSchema: { mission: 'MissionEnvelope.v2' }, handler: (input) => validateMissionEnvelopeV2(mission(input)) },
  { name: 'builder_create_hero_prefab', mode: MODES.STAGE, description: 'Stage the deterministic Builder card prefab.', inputSchema: {}, handler: (input) => ({ staged: true, prefab: cards(input), canonical_state_owner: 'algoquest' }) },
  { name: 'builder_inspect_character_sheet', mode: MODES.READ, description: 'Read a Builder character-sheet projection.', inputSchema: { context: 'optional sanitized context' }, handler: (input) => adapter()?.buildCharacterSheet(safe(input).context || {}) || { unavailable: true, reason: 'adapter-not-loaded' } },
  { name: 'builder_roll_deterministic_die', mode: MODES.STAGE, description: 'Stage a reproducible die result; it does not award progression.', inputSchema: { seed: 'string', sides: 'integer' }, handler: (input) => { const safeInput = safe(input); const sides = Number(safeInput.sides || 6); if (!Number.isInteger(sides) || sides < 2 || sides > 100) throw new Error('INVALID_DIE_SIDES'); const seed = String(safeInput.seed || 'builder'); return { staged: true, seed, sides, result: adapter()?.deterministicDie(seed, sides), deterministic: true }; } },
  { name: 'builder_stage_inventory_action', mode: MODES.STAGE, description: 'Stage an inventory action for AlgoQuest review; symbolic weapons are narrative only.', inputSchema: { item_id: 'string', action: 'equip|lock|consume' }, handler: (input) => { const value = safe(input); if (!['equip', 'lock', 'consume'].includes(String(value.action))) throw new Error('INVALID_INVENTORY_ACTION'); return { staged: true, item_id: String(value.item_id || ''), action: value.action, requires_algoquest_commit: true, real_weapon_instruction: false }; } },
  { name: 'builder_validate_card_program', mode: MODES.READ, description: 'Validate a card program locally.', inputSchema: { cards: 'Card[]', mission: 'MissionEnvelope.v2' }, handler: (input) => validateCardProgram(cards(input), mission(input)) },
  { name: 'builder_preview_generated_code', mode: MODES.STAGE, description: 'Preview deterministic generated code without execution.', inputSchema: { cards: 'Card[]', mission: 'MissionEnvelope.v2' }, handler: (input) => ({ staged: true, code: generateMagePython(cards(input), mission(input)), executable: false }) },
  { name: 'builder_submit_artifact', mode: MODES.EXECUTE, description: 'Create an opaque Builder artifact receipt for AlgoQuest admission.', inputSchema: { component: 'Card', context: 'sanitized mission context' }, handler: (input) => executeWithApproval('builder_submit_artifact', input, async (value) => { if (!adapter()) throw new Error('BUILDER_ADAPTER_UNAVAILABLE'); return adapter().emitAlgorithmArtifactReceipt(value.component || { id: 'webmcp-artifact', type: 'receipt', properties: {} }, value.context || {}); }) },
  { name: 'builder_prepare_colab_handoff', mode: MODES.EXECUTE, description: 'Prepare an opaque Colab handoff reference; no notebook DOM access.', inputSchema: { artifact_receipt: 'opaque receipt' }, handler: (input) => executeWithApproval('builder_prepare_colab_handoff', input, (value) => { const receipt = value.artifact_receipt; if (!receipt || typeof receipt !== 'object' || typeof receipt.receipt_id !== 'string') throw new Error('INVALID_ARTIFACT_RECEIPT'); return { handoff_id: `colab:${receipt.receipt_id}`, source: 'algorithm-builder', target: 'colab', raw_payload_embedded: false, canonical_state_owner: 'algoquest' }; }) },
  { name: 'builder_get_run_status', mode: MODES.READ, description: 'Read only local Builder run status.', inputSchema: { run_id: 'optional string' }, handler: (input) => status(safe(input)) },
  { name: 'securedme_companion_context', mode: MODES.READ, description: 'Read the sanitized companion context supplied by AlgoQuest.', inputSchema: { context: 'sanitized context' }, handler: (input) => ({ context: safe(input).context || null, canonical_state_owner: 'algoquest', raw_secret_stored: false }) },
  { name: 'securedme_qbit_plan_handoff', mode: MODES.STAGE, description: 'Stage a Qbit return plan without changing progression.', inputSchema: { receipt_ref: 'opaque string' }, handler: (input) => ({ staged: true, receipt_ref: String(safe(input).receipt_ref || ''), return_channel: 'qbit-plan-handoff', canonical_state_owner: 'algoquest' }) },
].map((tool) => ({
  ...tool,
  inputSchema: closedToolSchema(tool),
}));

export function executeBuilderWebMcp(name, input = {}) { const tool = BUILDER_WEBMCP_TOOLS.find((candidate) => candidate.name === name); if (!tool) throw new Error('UNKNOWN_WEBMCP_TOOL'); return tool.handler(input); }
export function registerBuilderWebMcp(target = typeof document === 'undefined' ? null : document) { const registry = target?.modelContext?.registerTool; if (typeof registry !== 'function') return 0; BUILDER_WEBMCP_TOOLS.forEach((tool) => registry.call(target.modelContext, { name: tool.name, description: tool.description, inputSchema: tool.inputSchema, execute: tool.handler })); return BUILDER_WEBMCP_TOOLS.length; }
