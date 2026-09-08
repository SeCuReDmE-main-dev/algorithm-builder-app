const fs = require('fs');
const path = require('path');
const { loaded, suiteEnvPath } = require('../server/loadSuiteEnv');

const suiteRoot = path.dirname(suiteEnvPath);
const python = path.join(suiteRoot, '.venv', 'Scripts', 'python.exe');
const requiredBrokerNames = ['AUTH0_ISSUER_BASE_URL', 'AUTH0_DOMAIN', 'AUTH0_CLIENT_ID', 'AUTH0_AUDIENCE', 'BROKER_RECEIPT_SIGNING_KEY', 'BROKER_BASE_URL', 'BROKER_ALLOWED_ORIGINS'];
const databaseConfigured = Boolean(process.env.DATABASE_URL || process.env.PGHOST);
const brokerMissing = requiredBrokerNames.filter((name) => !process.env[name]);
console.log(JSON.stringify({
  schema: 'securedme.education.environment-readiness.v1',
  shared_env_found: fs.existsSync(suiteEnvPath),
  shared_env_loaded: loaded,
  shared_python_found: fs.existsSync(python),
  local_game_ready: fs.existsSync(python),
  authenticated_broker_ready: brokerMissing.length === 0 && databaseConfigured,
  missing_configuration_names: [...brokerMissing, ...(databaseConfigured ? [] : ['DATABASE_URL_OR_PGHOST'])],
  secret_values_printed: false,
}, null, 2));
