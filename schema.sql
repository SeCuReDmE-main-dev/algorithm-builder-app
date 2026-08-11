CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE algorithms (
    algorithm_id SERIAL PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    complexity_notation VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(user_id),
    neutrosophic_truth JSONB,
    neutrosophic_indeterminacy JSONB,
    neutrosophic_falsehood JSONB
);

CREATE TABLE algorithm_steps (
    step_id SERIAL PRIMARY KEY,
    algorithm_id INTEGER REFERENCES algorithms(algorithm_id),
    step_number INTEGER NOT NULL,
    description TEXT NOT NULL,
    code_snippet TEXT,
    visualization_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    neutrosophic_truth JSONB,
    neutrosophic_indeterminacy JSONB,
    neutrosophic_falsehood JSONB
);

CREATE TABLE user_progress (
    progress_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id),
    algorithm_id INTEGER REFERENCES algorithms(algorithm_id),
    completed_steps INTEGER DEFAULT 0,
    is_completed BOOLEAN DEFAULT FALSE,
    last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, algorithm_id)
);

-- Mage First-Proof broker state. Identity is stored only as a one-way subject reference.
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
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(subject_ref, idempotency_key)
);
