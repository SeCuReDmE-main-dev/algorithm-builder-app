const path = require('path');
const dotenv = require('dotenv');

const suiteEnvPath = path.resolve(__dirname, '..', '..', '.env');
const result = dotenv.config({ path: suiteEnvPath, override: false, quiet: true });

module.exports = {
  suiteEnvPath,
  loaded: !result.error,
};
