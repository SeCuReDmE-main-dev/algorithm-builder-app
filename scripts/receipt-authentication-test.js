const assert = require('assert');
const { buildExecutionReceiptV2, verifyExecutionReceiptV2 } = require('../server/contracts');

const signingKey = 'test-only-signing-key';
const run = {
  run_id: 'run-auth-test',
  subject_ref: 'subject-hash-a',
  attempt: 1,
  artifact_digest: 'sha256:artifact',
  artifact: { generated_code: { digest: 'sha256:code' }, attempt_id: 'attempt-1' },
  mission: { mission_id: 'mission-1', adaptation_id: 'adaptation-1', prompt_assignment_id: 'prompt-1' },
};
const payload = {
  provider: 'local-sandbox',
  execution_result: { trajectory_changed: true },
  model_limit_response: 'This model compares a trajectory and cannot prove physical reality.',
  tests: [{ test_id: 'trajectory', status: 'passed' }],
};
const receipt = buildExecutionReceiptV2({ run, payload, signingKey, timestamp: '2026-09-08T12:00:00.000Z' });
assert.strictEqual(verifyExecutionReceiptV2(receipt, { run, signingKey }).valid, true);
assert(verifyExecutionReceiptV2({ ...receipt, execution_result: { trajectory_changed: false } }, { run, signingKey }).errors.includes('receipt-digest-mismatch'));
assert(verifyExecutionReceiptV2({ ...receipt, server_attestation: { ...receipt.server_attestation, signature: 'hmac-sha256:deadbeef' } }, { run, signingKey }).errors.includes('receipt-signature-invalid'));
assert(verifyExecutionReceiptV2(receipt, { run: { ...run, run_id: 'another-run' }, signingKey }).errors.includes('run-binding-mismatch'));
assert(verifyExecutionReceiptV2(receipt, { run: { ...run, subject_ref: 'subject-hash-b' }, signingKey }).errors.includes('owner-binding-mismatch'));
assert(verifyExecutionReceiptV2(receipt, { run: { ...run, mission: { ...run.mission, prompt_assignment_id: 'prompt-2' } }, signingKey }).errors.includes('run-binding-mismatch'));
assert(verifyExecutionReceiptV2(receipt, { run: { ...run, artifact_digest: 'sha256:other-artifact' }, signingKey }).errors.includes('assignment-binding-mismatch'));
assert(verifyExecutionReceiptV2(receipt, { run: { ...run, attempt: 2 }, signingKey }).errors.includes('attempt-binding-mismatch'));
console.log('Broker receipt authentication: digest, HMAC signature, owner, assignment, artifact and attempt binding passed.');
