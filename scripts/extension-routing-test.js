const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { webcrypto } = require('crypto');

const source = fs.readFileSync(path.resolve(__dirname, '..', 'extension', 'serviceWorker.js'), 'utf8');
const stores = { session: {}, local: {} };
let messageListener;
let removedListener;
const sentToTabs = [];
let loseNextCommandResponse = false;

function storageArea(name) {
  return {
    async get(keys) {
      if (typeof keys === 'string') return { [keys]: stores[name][keys] };
      const result = {};
      for (const key of keys) result[key] = stores[name][key];
      return result;
    },
    async set(value) { Object.assign(stores[name], JSON.parse(JSON.stringify(value))); },
  };
}

const chrome = {
  sidePanel: { setPanelBehavior: async () => undefined },
  runtime: {
    onInstalled: { addListener() {} },
    onMessage: { addListener(listener) { messageListener = listener; } },
    async sendMessage() { return undefined; },
  },
  tabs: {
    onRemoved: { addListener(listener) { removedListener = listener; } },
    async query() { return []; },
    async sendMessage(tabId, message) {
      sentToTabs.push({ tabId, message });
      if (loseNextCommandResponse && message.type === 'GAME_COMMAND') {
        loseNextCommandResponse = false;
        throw new Error('simulated-worker-response-loss');
      }
      return { ok: true, data: { ok: true, projection: projection(message.command?.run_id || (tabId === 11 ? 'run-A' : 'run-B'), 2) } };
    },
  },
  storage: { session: storageArea('session'), local: storageArea('local') },
  identity: { getRedirectURL() { return 'https://example.invalid'; } },
  downloads: { async download() {} },
};

function projection(runId, revision) {
  return {
    schema: 'securedme.education.algoquest.hero-sheet-projection.v1',
    run_id: runId,
    revision,
    canonical_state_owner: 'algoquest',
    hero: {}, mission: {},
    raw_secret_stored: false,
    contains_identity: false,
  };
}

function startWorker() {
  vm.runInNewContext(source, {
    chrome,
    crypto: webcrypto,
    importScripts() {},
    globalThis: { SECUREDME_EXTENSION_CONFIG: {} },
    URL,
    URLSearchParams,
    TextEncoder,
    Uint8Array,
    btoa: (value) => Buffer.from(value, 'binary').toString('base64'),
    setTimeout,
    clearTimeout,
    console,
  });
}

startWorker();

function send(message, sender = {}) {
  return new Promise((resolve) => {
    const keepOpen = messageListener(message, sender, resolve);
    assert.strictEqual(keepOpen, true);
  });
}

(async () => {
  const senderA = { tab: { id: 11 }, frameId: 0, documentId: 'doc-A', url: 'http://localhost:5173/game' };
  const senderB = { tab: { id: 22 }, frameId: 0, documentId: 'doc-B', url: 'http://localhost:5173/game' };
  const firstSnapshot = await send({ type: 'GAME_STATE_SNAPSHOT', projection: projection('run-A', 1) }, senderA);
  assert.strictEqual(firstSnapshot.ok, true, firstSnapshot.error);
  const secondSnapshot = await send({ type: 'GAME_STATE_SNAPSHOT', projection: projection('run-B', 1) }, senderB);
  assert.strictEqual(secondSnapshot.ok, true, secondSnapshot.error);
  const active = await send({ type: 'GET_ACTIVE_GAME_CHANNEL' });
  assert.strictEqual(active.data.tab_id, 11, 'a second tab must not silently replace the pinned adventure');

  const command = await send({ type: 'GAME_COMMAND', command: { command_id: 'command-A', type: 'REQUEST_HINT', payload: {} } });
  assert.strictEqual(command.ok, true);
  assert.deepStrictEqual(sentToTabs.map((entry) => entry.tabId), [11], 'the command returns only to its bound tab');

  loseNextCommandResponse = true;
  const lost = await send({ type: 'GAME_COMMAND', command: { command_id: 'command-lost', type: 'REQUEST_HINT', payload: {} } });
  assert.strictEqual(lost.ok, false, 'a lost response remains a recoverable extension failure');
  assert.strictEqual(stores.local['securedme.algoquest.game-command-outbox.v1']['command-lost'].status, 'pending');
  startWorker();
  const replayed = await send({ type: 'GAME_COMMAND', command: { command_id: 'command-lost', type: 'REQUEST_HINT', payload: {} } });
  assert.strictEqual(replayed.ok, true, replayed.error);
  assert.strictEqual(stores.local['securedme.algoquest.game-command-outbox.v1']['command-lost'].status, 'completed');
  const sendsAfterReplay = sentToTabs.length;
  const cached = await send({ type: 'GAME_COMMAND', command: { command_id: 'command-lost', type: 'REQUEST_HINT', payload: {} } });
  assert.strictEqual(cached.ok, true);
  assert.strictEqual(sentToTabs.length, sendsAfterReplay, 'an acknowledged command is returned from durable worker storage without reaching the page again');

  stores.session['securedme.mage-first-proof.extension-session.v1'] = {
    mission: { run_id: 'run-A' }, run: { run_id: 'run-A' }, callbackCapability: 'old-capability', accessToken: null, expiresAt: 0,
  };
  const changed = await send({ type: 'MISSION_AVAILABLE', mission: { run_id: 'run-B' }, profile: {} }, senderB);
  assert.strictEqual(changed.ok, true);
  assert.strictEqual(changed.data.run, null);
  assert.strictEqual(changed.data.callbackReady, false, 'a new run cannot inherit an old callback capability');

  const rejected = await send({ type: 'GAME_STATE_SNAPSHOT', projection: projection('run-C', 1) }, { tab: { id: 33 }, frameId: 1, url: 'http://localhost:5173/frame' });
  assert.strictEqual(rejected.ok, false, 'non-main-frame projections are rejected');

  await removedListener(11);
  const retained = await send({ type: 'GET_ACTIVE_GAME_CHANNEL' });
  assert.strictEqual(retained.ok, true);
  assert.strictEqual(retained.data.tab_id, null);
  assert.strictEqual(retained.data.projection.connection, 'disconnected', 'closing the pinned tab retains a read-only last Hero Sheet');
  const offlineCommand = await send({ type: 'GAME_COMMAND', command: { command_id: 'offline', type: 'REQUEST_HINT', payload: {} } });
  assert.strictEqual(offlineCommand.ok, false, 'a retained disconnected sheet cannot mutate the game');
  console.log('MV3 routing: tab/run isolation, worker restart replay, lost response deduplication, closed-tab retention, mission reset and sender validation passed.');
})().catch((error) => { console.error(error); process.exitCode = 1; });
