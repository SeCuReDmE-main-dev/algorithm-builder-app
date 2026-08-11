const crypto = require('crypto');

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

class MemoryRunStore {
  constructor() {
    this.runs = new Map();
  }

  async initialize() {}

  async createRun(run) {
    const byRunId = this.runs.get(run.run_id);
    if (byRunId) {
      if (byRunId.subject_ref !== run.subject_ref || byRunId.idempotency_key !== run.idempotency_key) {
        throw Object.assign(new Error('The run id is already bound to another request.'), { code: 'RUN_ID_CONFLICT' });
      }
      return { run: clone(byRunId), created: false };
    }
    const existing = [...this.runs.values()].find((item) => item.subject_ref === run.subject_ref && item.idempotency_key === run.idempotency_key);
    if (existing) return { run: clone(existing), created: false };
    this.runs.set(run.run_id, clone(run));
    return { run: clone(run), created: true };
  }

  async getRun(runId) {
    return clone(this.runs.get(runId) || null);
  }

  async saveArtifact(runId, artifact, callbackHash, callbackExpiresAt) {
    const run = this.runs.get(runId);
    if (!run) return null;
    if (run.artifact_digest && run.artifact_digest !== artifact.artifact_digest) throw Object.assign(new Error('A different artifact is already bound.'), { code: 'ARTIFACT_CONFLICT' });
    run.artifact = clone(artifact);
    run.artifact_digest = artifact.artifact_digest;
    run.callback_hash = callbackHash;
    run.callback_expires_at = callbackExpiresAt;
    run.callback_used_at = null;
    run.status = 'artifact-admitted';
    run.updated_at = new Date().toISOString();
    return clone(run);
  }

  async saveExecution(runId, executionInputDigest, receipt) {
    const run = this.runs.get(runId);
    if (!run) return null;
    if (run.execution_receipt) {
      if (run.execution_input_digest !== executionInputDigest) throw Object.assign(new Error('Execution callback conflicts with the admitted result.'), { code: 'EXECUTION_CONFLICT' });
      return { run: clone(run), duplicate: true };
    }
    run.execution_input_digest = executionInputDigest;
    run.execution_receipt = clone(receipt);
    run.callback_used_at = new Date().toISOString();
    run.status = 'execution-returned';
    run.updated_at = new Date().toISOString();
    return { run: clone(run), duplicate: false };
  }

  async rotateCallback(runId, callbackHash, callbackExpiresAt) {
    const run = this.runs.get(runId);
    if (!run) return null;
    run.attempt += 1;
    run.callback_hash = callbackHash;
    run.callback_expires_at = callbackExpiresAt;
    run.callback_used_at = null;
    run.execution_receipt = null;
    run.execution_input_digest = null;
    run.status = run.artifact ? 'artifact-admitted' : 'mission-admitted';
    run.updated_at = new Date().toISOString();
    return clone(run);
  }

  async cancel(runId) {
    const run = this.runs.get(runId);
    if (!run) return null;
    run.status = 'cancelled';
    run.callback_hash = null;
    run.updated_at = new Date().toISOString();
    return clone(run);
  }
}

class PostgresRunStore {
  constructor(pool) {
    this.pool = pool;
  }

  async initialize() {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS mage_first_proof_runs (
        run_id TEXT PRIMARY KEY,
        subject_ref TEXT NOT NULL,
        idempotency_key TEXT NOT NULL,
        mission JSONB NOT NULL,
        learner_profile JSONB NOT NULL,
        status TEXT NOT NULL,
        attempt INTEGER NOT NULL DEFAULT 1,
        artifact JSONB,
        artifact_digest TEXT,
        callback_hash TEXT,
        callback_expires_at TIMESTAMPTZ,
        callback_used_at TIMESTAMPTZ,
        execution_input_digest TEXT,
        execution_receipt JSONB,
        created_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL,
        UNIQUE(subject_ref, idempotency_key)
      )
    `);
  }

  _row(row) {
    if (!row) return null;
    return {
      ...row,
      attempt: Number(row.attempt),
      callback_expires_at: row.callback_expires_at ? new Date(row.callback_expires_at).toISOString() : null,
      callback_used_at: row.callback_used_at ? new Date(row.callback_used_at).toISOString() : null,
      created_at: new Date(row.created_at).toISOString(),
      updated_at: new Date(row.updated_at).toISOString(),
    };
  }

  async createRun(run) {
    const byRunId = await this.getRun(run.run_id);
    if (byRunId) {
      if (byRunId.subject_ref !== run.subject_ref || byRunId.idempotency_key !== run.idempotency_key) {
        throw Object.assign(new Error('The run id is already bound to another request.'), { code: 'RUN_ID_CONFLICT' });
      }
      return { run: byRunId, created: false };
    }
    let result;
    try {
      result = await this.pool.query(`
      INSERT INTO mage_first_proof_runs
        (run_id, subject_ref, idempotency_key, mission, learner_profile, status, attempt, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      ON CONFLICT (subject_ref, idempotency_key) DO NOTHING
      RETURNING *
      `, [run.run_id, run.subject_ref, run.idempotency_key, run.mission, run.learner_profile, run.status, run.attempt, run.created_at, run.updated_at]);
    } catch (error) {
      if (error.code !== '23505') throw error;
      const raced = await this.getRun(run.run_id);
      if (raced && raced.subject_ref === run.subject_ref && raced.idempotency_key === run.idempotency_key) return { run: raced, created: false };
      throw Object.assign(new Error('The run id is already bound to another request.'), { code: 'RUN_ID_CONFLICT' });
    }
    if (result.rows[0]) return { run: this._row(result.rows[0]), created: true };
    const existing = await this.pool.query('SELECT * FROM mage_first_proof_runs WHERE subject_ref=$1 AND idempotency_key=$2', [run.subject_ref, run.idempotency_key]);
    return { run: this._row(existing.rows[0]), created: false };
  }

  async getRun(runId) {
    const result = await this.pool.query('SELECT * FROM mage_first_proof_runs WHERE run_id=$1', [runId]);
    return this._row(result.rows[0]);
  }

  async saveArtifact(runId, artifact, callbackHash, callbackExpiresAt) {
    const current = await this.getRun(runId);
    if (!current) return null;
    if (current.artifact_digest && current.artifact_digest !== artifact.artifact_digest) throw Object.assign(new Error('A different artifact is already bound.'), { code: 'ARTIFACT_CONFLICT' });
    const result = await this.pool.query(`
      UPDATE mage_first_proof_runs SET artifact=$2, artifact_digest=$3, callback_hash=$4,
        callback_expires_at=$5, callback_used_at=NULL, status='artifact-admitted', updated_at=NOW()
      WHERE run_id=$1 RETURNING *
    `, [runId, artifact, artifact.artifact_digest, callbackHash, callbackExpiresAt]);
    return this._row(result.rows[0]);
  }

  async saveExecution(runId, executionInputDigest, receipt) {
    const current = await this.getRun(runId);
    if (!current) return null;
    if (current.execution_receipt) {
      if (current.execution_input_digest !== executionInputDigest) throw Object.assign(new Error('Execution callback conflicts with the admitted result.'), { code: 'EXECUTION_CONFLICT' });
      return { run: current, duplicate: true };
    }
    const result = await this.pool.query(`
      UPDATE mage_first_proof_runs SET execution_input_digest=$2, execution_receipt=$3,
        callback_used_at=NOW(), status='execution-returned', updated_at=NOW()
      WHERE run_id=$1 AND execution_receipt IS NULL RETURNING *
    `, [runId, executionInputDigest, receipt]);
    if (result.rows[0]) return { run: this._row(result.rows[0]), duplicate: false };
    return this.saveExecution(runId, executionInputDigest, receipt);
  }

  async rotateCallback(runId, callbackHash, callbackExpiresAt) {
    const result = await this.pool.query(`
      UPDATE mage_first_proof_runs SET attempt=attempt+1, callback_hash=$2, callback_expires_at=$3,
        callback_used_at=NULL, execution_input_digest=NULL, execution_receipt=NULL,
        status=CASE WHEN artifact IS NULL THEN 'mission-admitted' ELSE 'artifact-admitted' END,
        updated_at=NOW() WHERE run_id=$1 RETURNING *
    `, [runId, callbackHash, callbackExpiresAt]);
    return this._row(result.rows[0]);
  }

  async cancel(runId) {
    const result = await this.pool.query("UPDATE mage_first_proof_runs SET status='cancelled', callback_hash=NULL, updated_at=NOW() WHERE run_id=$1 RETURNING *", [runId]);
    return this._row(result.rows[0]);
  }
}

function createRunId() {
  return `mage-run-${crypto.randomUUID()}`;
}

module.exports = { MemoryRunStore, PostgresRunStore, createRunId };
