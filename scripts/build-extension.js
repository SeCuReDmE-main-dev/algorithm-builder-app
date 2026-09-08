const fs = require('fs');
const path = require('path');
require('../server/loadSuiteEnv');

const root = path.resolve(__dirname, '..');
const source = path.join(root, 'extension');
const target = path.join(root, 'dist', 'extension');
fs.mkdirSync(target, { recursive: true });

const panelHtmlPath = path.join(target, 'sidepanel.html');
if (fs.existsSync(panelHtmlPath)) {
  const panelHtml = fs.readFileSync(panelHtmlPath, 'utf8')
    .replaceAll('../extension/sidepanel.js', 'sidepanel.js');
  fs.writeFileSync(panelHtmlPath, panelHtml, 'utf8');
}

for (const filename of ['manifest.json', 'serviceWorker.js', 'contentBridge.js']) {
  fs.copyFileSync(path.join(source, filename), path.join(target, filename));
}

const values = {
  __AUTH0_DOMAIN__: process.env.AUTH0_DOMAIN || '',
  __AUTH0_CLIENT_ID__: process.env.AUTH0_CLIENT_ID || '',
  __AUTH0_AUDIENCE__: process.env.AUTH0_AUDIENCE || '',
  __BROKER_BASE_URL__: process.env.BROKER_BASE_URL || 'http://127.0.0.1:3000',
};
let config = fs.readFileSync(path.join(source, 'config.template.js'), 'utf8');
for (const [marker, value] of Object.entries(values)) config = config.replaceAll(marker, String(value).replaceAll('\\', '\\\\').replaceAll("'", "\\'"));
fs.writeFileSync(path.join(target, 'config.js'), config, 'utf8');

console.log(`MV3 extension prepared at ${target}`);
