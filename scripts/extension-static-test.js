const assert = require('assert');
const fs = require('fs');
const path = require('path');

const extension = path.resolve(__dirname, '..', 'dist', 'extension');
const manifest = JSON.parse(fs.readFileSync(path.join(extension, 'manifest.json'), 'utf8'));
const serviceWorker = fs.readFileSync(path.join(extension, 'serviceWorker.js'), 'utf8');
const bridge = fs.readFileSync(path.join(extension, 'contentBridge.js'), 'utf8');
const panel = fs.readFileSync(path.join(extension, 'sidepanel.html'), 'utf8');

assert.strictEqual(manifest.manifest_version, 3);
assert.strictEqual(manifest.minimum_chrome_version, '114');
assert.strictEqual(manifest.side_panel.default_path, 'sidepanel.html');
assert(!manifest.content_scripts.some((script) => script.matches.some((match) => match.includes('colab.research.google.com'))), 'Colab DOM access is forbidden');
assert(!manifest.permissions.includes('<all_urls>'));
assert(serviceWorker.includes('chrome.sidePanel'));
assert(serviceWorker.includes('chrome.identity.launchWebAuthFlow'));
assert(serviceWorker.includes("sendEvidenceToAlgoQuest('ARTIFACT_RECEIPT_AVAILABLE'"));
assert(serviceWorker.includes("sendEvidenceToAlgoQuest('COLAB_RECEIPT_AVAILABLE'"));
assert(serviceWorker.includes("case 'EXPORT_ARTIFACT_JSON'"));
assert(bridge.includes('MAGE_MISSION_AVAILABLE'));
assert(panel.includes('extension/sidepanel.js'));
console.log('MV3 extension: side panel, PKCE host, narrow permissions, and typed evidence bridge passed.');
