const assert = require('assert');
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'webmcpTools.js'), 'utf8');
assert.strictEqual((source.match(/name: 'builder_/g) || []).length, 10, 'ten corrected Builder WebMCP tools are required');
assert.strictEqual((source.match(/name: 'securedme_/g) || []).length, 2, 'two shared SecuredMe tools are required');
assert.match(source, /canonical_state_owner: 'algoquest'/);
assert.match(source, /SECRET_OR_PERSONAL_DATA_REJECTED/);
assert.match(source, /symbolic weapons are narrative only/);
assert.match(source, /typeof document/);
assert.match(source, /HUMAN_APPROVAL_REQUIRED_OR_EXPIRED/);
assert.match(source, /additionalProperties: false/);
console.log('Builder WebMCP static contract passed.');
