importScripts('config.js');

const CONFIG = globalThis.SECUREDME_EXTENSION_CONFIG || {};
const SESSION_KEY = 'securedme.mage-first-proof.extension-session.v1';
const GAME_CHANNELS_KEY = 'securedme.algoquest.game-channels.v1';
const PINNED_CHANNEL_KEY = 'securedme.algoquest.pinned-game-channel.v1';
const LAST_GAME_CHANNEL_KEY = 'securedme.algoquest.last-game-channel.v1';
const GAME_COMMANDS_KEY = 'securedme.algoquest.game-command-outbox.v1';

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => undefined);
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  const current = await readGameChannels();
  if (!current.channels[String(tabId)]) return;
  const removed = current.channels[String(tabId)];
  const channels = { ...current.channels };
  delete channels[String(tabId)];
  const pinned = current.pinned === tabId ? null : current.pinned;
  const last = current.pinned === tabId ? disconnectedChannel(removed) : current.last;
  await chrome.storage.local.set({ [GAME_CHANNELS_KEY]: channels, [PINNED_CHANNEL_KEY]: pinned, [LAST_GAME_CHANNEL_KEY]: last });
  if (current.pinned === tabId) chrome.runtime.sendMessage({ type: 'GAME_CHANNEL_CHANGED', channel: last }).catch(() => undefined);
});

function randomBase64Url(bytes = 32) {
  const data = new Uint8Array(bytes);
  crypto.getRandomValues(data);
  return base64Url(data);
}

function base64Url(bytes) {
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function pkceChallenge(verifier) {
  return base64Url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))));
}

async function readSession() {
  const result = await chrome.storage.session.get(SESSION_KEY);
  return result[SESSION_KEY] || { mission: null, profile: null, accessToken: null, expiresAt: 0, run: null, callbackCapability: null, calmMessage: 'Ready when you are.' };
}

async function writeSession(patch) {
  const current = await readSession();
  const next = { ...current, ...patch, rawIdentityStored: false, hiddenTelemetryStored: false };
  await chrome.storage.session.set({ [SESSION_KEY]: next });
  chrome.runtime.sendMessage({ type: 'RUNTIME_STATE_CHANGED', state: sanitizeSession(next) }).catch(() => undefined);
  return next;
}

function sanitizeSession(session) {
  const { accessToken, callbackCapability, ...visible } = session;
  return { ...visible, authenticated: Boolean(accessToken && session.expiresAt > Date.now()), callbackReady: Boolean(callbackCapability), rawIdentityStored: false };
}

function isAllowedAlgoQuestUrl(value) {
  try {
    const url = new URL(value);
    const localDevelopment = url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname);
    return localDevelopment || url.origin === 'https://algoquest.securedme.ca';
  } catch {
    return false;
  }
}

function validProjection(projection) {
  return Boolean(
    projection
    && projection.schema === 'securedme.education.algoquest.hero-sheet-projection.v1'
    && projection.canonical_state_owner === 'algoquest'
    && typeof projection.run_id === 'string'
    && Number.isInteger(projection.revision)
    && projection.raw_secret_stored === false
    && projection.contains_identity === false
  );
}

async function readGameChannels() {
  const stored = await chrome.storage.local.get([GAME_CHANNELS_KEY, PINNED_CHANNEL_KEY, LAST_GAME_CHANNEL_KEY]);
  return { channels: stored[GAME_CHANNELS_KEY] || {}, pinned: stored[PINNED_CHANNEL_KEY] || null, last: stored[LAST_GAME_CHANNEL_KEY] || null };
}

function disconnectedChannel(channel) {
  if (!channel) return null;
  return {
    ...channel,
    tab_id: null,
    document_id: null,
    connected: false,
    closed_at: new Date().toISOString(),
    projection: { ...channel.projection, connection: 'disconnected' },
  };
}

async function readGameCommandOutbox() {
  const stored = await chrome.storage.local.get(GAME_COMMANDS_KEY);
  return stored[GAME_COMMANDS_KEY] || {};
}

async function writeGameCommandRecord(commandId, record) {
  const current = await readGameCommandOutbox();
  const next = { ...current, [commandId]: record };
  const ordered = Object.entries(next).sort((left, right) => String(right[1].updated_at).localeCompare(String(left[1].updated_at))).slice(0, 50);
  await chrome.storage.local.set({ [GAME_COMMANDS_KEY]: Object.fromEntries(ordered) });
}

async function storeGameProjection(sender, projection) {
  if (!sender?.tab?.id || sender.frameId !== 0 || !isAllowedAlgoQuestUrl(sender.url) || !validProjection(projection)) throw new Error('Untrusted AlgoQuest projection rejected.');
  const current = await readGameChannels();
  const tabId = String(sender.tab.id);
  const previous = current.channels[tabId];
  if (previous?.projection?.run_id === projection.run_id && previous.projection.revision > projection.revision) return previous;
  const channel = {
    tab_id: sender.tab.id,
    document_id: sender.documentId || null,
    origin: new URL(sender.url).origin,
    run_id: projection.run_id,
    projection,
    updated_at: new Date().toISOString(),
  };
  const channels = { ...current.channels, [tabId]: channel };
  const pinned = current.pinned && channels[String(current.pinned)] ? current.pinned : sender.tab.id;
  await chrome.storage.local.set({ [GAME_CHANNELS_KEY]: channels, [PINNED_CHANNEL_KEY]: pinned, [LAST_GAME_CHANNEL_KEY]: channel });
  chrome.runtime.sendMessage({ type: 'GAME_CHANNEL_CHANGED', channel: pinned === sender.tab.id ? channel : null }).catch(() => undefined);
  return channel;
}

async function activeGameChannel(includeDisconnected = false) {
  const current = await readGameChannels();
  if (current.pinned && current.channels[String(current.pinned)]) return current.channels[String(current.pinned)];
  const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  const active = tabs.find((tab) => current.channels[String(tab.id)]);
  if (active) return current.channels[String(active.id)];
  return includeDisconnected ? current.last : null;
}

function requireConfig() {
  const missing = ['auth0Domain', 'auth0ClientId', 'auth0Audience', 'brokerBaseUrl'].filter((key) => !CONFIG[key] || String(CONFIG[key]).startsWith('__'));
  if (missing.length) throw new Error(`Extension configuration is missing: ${missing.join(', ')}`);
}

async function login() {
  requireConfig();
  const verifier = randomBase64Url(48);
  const challenge = await pkceChallenge(verifier);
  const state = randomBase64Url(24);
  const redirectUri = chrome.identity.getRedirectURL('auth0');
  const authorize = new URL(`https://${CONFIG.auth0Domain}/authorize`);
  authorize.search = new URLSearchParams({
    client_id: CONFIG.auth0ClientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: 'openid profile email',
    audience: CONFIG.auth0Audience,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    state,
  }).toString();
  const callback = await chrome.identity.launchWebAuthFlow({ url: authorize.toString(), interactive: true });
  const callbackUrl = new URL(callback);
  if (callbackUrl.searchParams.get('state') !== state) throw new Error('Login state could not be verified.');
  const code = callbackUrl.searchParams.get('code');
  if (!code) throw new Error('Login did not return an authorization code.');
  const tokenResponse = await fetch(`https://${CONFIG.auth0Domain}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ grant_type: 'authorization_code', client_id: CONFIG.auth0ClientId, code, code_verifier: verifier, redirect_uri: redirectUri }),
  });
  if (!tokenResponse.ok) throw new Error('Login token exchange failed safely.');
  const tokens = await tokenResponse.json();
  return writeSession({ accessToken: tokens.access_token, expiresAt: Date.now() + (Number(tokens.expires_in) || 3600) * 1000, calmMessage: 'Signed in. Your mission is ready when you are.' });
}

async function brokerFetch(path, options = {}) {
  requireConfig();
  const session = await readSession();
  if (!session.accessToken || session.expiresAt <= Date.now()) throw new Error('Please sign in again. Your saved build is still here.');
  const response = await fetch(`${String(CONFIG.brokerBaseUrl).replace(/\/$/, '')}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.accessToken}`, ...(options.headers || {}) },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(payload.recovery || payload.error || 'The broker is unavailable. Your build is still saved.'), { status: response.status, payload });
  return payload;
}

function bytesToBase64(bytes) {
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}

async function downloadNotebook(runId) {
  const session = await readSession();
  if (!session.callbackCapability) throw new Error('Check the build first so a short-lived Colab return path can be created.');
  const response = await fetch(`${String(CONFIG.brokerBaseUrl).replace(/\/$/, '')}/api/v1/runs/${encodeURIComponent(runId)}/notebook`, {
    headers: { Authorization: `Bearer ${session.accessToken}`, 'X-Run-Capability': session.callbackCapability },
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.recovery || payload.error || 'Notebook preparation failed. Your build remains saved.');
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  await chrome.downloads.download({ url: `data:application/x-ipynb+json;base64,${bytesToBase64(bytes)}`, filename: `AlgoQuest-Mage-${runId}.ipynb`, saveAs: false });
  await chrome.tabs.create({ url: 'https://colab.research.google.com/#create=true' });
  return writeSession({ calmMessage: 'The notebook is downloaded and Colab is open. Run the cells, then return here.' });
}

async function downloadJson(filename, value) {
  const bytes = new TextEncoder().encode(JSON.stringify(value, null, 2));
  await chrome.downloads.download({ url: `data:application/json;base64,${bytesToBase64(bytes)}`, filename, saveAs: true });
  return sanitizeSession(await readSession());
}

async function sendEvidenceToAlgoQuest(type, receipt, brokerAuthenticated = false) {
  const current = await readGameChannels();
  const channel = Object.values(current.channels).find((candidate) => candidate.run_id === receipt.run_id);
  if (!channel) throw new Error('The AlgoQuest run is not connected. The receipt remains stored in Builder.');
  await chrome.tabs.sendMessage(channel.tab_id, { type, receipt, broker_authenticated: brokerAuthenticated });
}

async function handle(message, sender) {
  switch (message.type) {
    case 'MISSION_AVAILABLE': {
      if (!sender?.tab?.id || sender.frameId !== 0 || !isAllowedAlgoQuestUrl(sender.url)) throw new Error('Mission sender rejected.');
      const session = await readSession();
      const changedRun = session.mission?.run_id && session.mission.run_id !== message.mission?.run_id;
      return sanitizeSession(await writeSession({
        mission: message.mission,
        profile: message.profile,
        run: changedRun ? null : session.run,
        callbackCapability: changedRun ? null : session.callbackCapability,
        calmMessage: changedRun ? 'New AlgoQuest run received. A separate forge draft is ready.' : 'Mission received from AlgoQuest.',
      }));
    }
    case 'GAME_STATE_SNAPSHOT':
      return storeGameProjection(sender, message.projection);
    case 'GET_ACTIVE_GAME_CHANNEL':
      return activeGameChannel(true);
    case 'SELECT_GAME_CHANNEL': {
      const current = await readGameChannels();
      const channel = current.channels[String(message.tab_id)];
      if (!channel) throw new Error('The selected AlgoQuest tab is no longer connected.');
      await chrome.storage.local.set({ [PINNED_CHANNEL_KEY]: channel.tab_id });
      return channel;
    }
    case 'SELECT_ACTIVE_GAME_CHANNEL': {
      const current = await readGameChannels();
      const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      const tab = tabs.find((candidate) => current.channels[String(candidate.id)]);
      if (!tab) throw new Error('The active tab is not an AlgoQuest game board.');
      const channel = current.channels[String(tab.id)];
      await chrome.storage.local.set({ [PINNED_CHANNEL_KEY]: channel.tab_id });
      chrome.runtime.sendMessage({ type: 'GAME_CHANNEL_CHANGED', channel }).catch(() => undefined);
      return channel;
    }
    case 'GAME_COMMAND': {
      const channel = await activeGameChannel();
      if (!channel) throw new Error('Open AlgoQuest to continue this mission.');
      const command = {
        command_id: message.command?.command_id || crypto.randomUUID(),
        type: message.command?.type,
        payload: message.command?.payload || {},
      };
      if (!command.type || typeof command.command_id !== 'string') throw new Error('Invalid game command.');
      const outbox = await readGameCommandOutbox();
      const previous = outbox[command.command_id];
      if (previous && (previous.run_id !== channel.run_id || JSON.stringify(previous.command) !== JSON.stringify(command))) throw new Error('Command identifier conflict.');
      if (previous?.status === 'completed') return previous.response;
      await writeGameCommandRecord(command.command_id, {
        schema: 'securedme.education.algoquest.extension-game-command.v1',
        run_id: channel.run_id,
        tab_id: channel.tab_id,
        command,
        status: 'pending',
        updated_at: new Date().toISOString(),
        contains_identity: false,
        raw_secret_stored: false,
      });
      const response = await chrome.tabs.sendMessage(channel.tab_id, { type: 'GAME_COMMAND', command });
      if (!response?.ok) throw new Error(response?.error || 'AlgoQuest rejected the command.');
      if (response.data?.projection) await storeGameProjection({ tab: { id: channel.tab_id }, frameId: 0, documentId: channel.document_id, url: channel.origin }, response.data.projection);
      await writeGameCommandRecord(command.command_id, {
        schema: 'securedme.education.algoquest.extension-game-command.v1',
        run_id: channel.run_id,
        tab_id: channel.tab_id,
        command,
        status: 'completed',
        response: response.data,
        updated_at: new Date().toISOString(),
        contains_identity: false,
        raw_secret_stored: false,
      });
      return response.data;
    }
    case 'GET_RUNTIME_STATE':
      return sanitizeSession(await readSession());
    case 'AUTH_LOGIN':
      return sanitizeSession(await login());
    case 'RUN_CREATE': {
      const session = await readSession();
      const payload = await brokerFetch('/api/v1/runs', { method: 'POST', body: JSON.stringify({ mission_envelope: session.mission, learner_profile: session.profile }) });
      return sanitizeSession(await writeSession({ run: payload.run, calmMessage: payload.created ? 'Run admitted. Start building.' : 'Your existing run was restored.' }));
    }
    case 'ARTIFACT_SUBMIT': {
      const payload = await brokerFetch(`/api/v1/runs/${encodeURIComponent(message.artifact.run_id)}/artifact`, { method: 'POST', body: JSON.stringify({ artifact_receipt: message.artifact }) });
      await sendEvidenceToAlgoQuest('ARTIFACT_RECEIPT_AVAILABLE', message.artifact);
      return sanitizeSession(await writeSession({ run: payload.run, callbackCapability: payload.callback_capability || (await readSession()).callbackCapability, calmMessage: payload.duplicate ? payload.recovery : 'Build verified. Colab is ready.' }));
    }
    case 'OPEN_COLAB':
      return sanitizeSession(await downloadNotebook(message.run_id));
    case 'EXPORT_ARTIFACT_JSON':
      return downloadJson(`AlgoQuest-Mage-${message.artifact.run_id}-artifact.json`, message.artifact);
    case 'RUN_STATUS': {
      const payload = await brokerFetch(`/api/v1/runs/${encodeURIComponent(message.run_id)}`);
      const next = await writeSession({ run: payload.run, calmMessage: payload.run.execution_receipt ? 'Colab returned a verified receipt.' : 'Waiting calmly for Colab.' });
      if (payload.run.execution_receipt && payload.receipt_authentication?.verified === true) await sendEvidenceToAlgoQuest('COLAB_RECEIPT_AVAILABLE', payload.run.execution_receipt, true);
      return sanitizeSession(next);
    }
    case 'RUN_RETRY': {
      const payload = await brokerFetch(`/api/v1/runs/${encodeURIComponent(message.run_id)}/retry`, { method: 'POST' });
      return sanitizeSession(await writeSession({ run: payload.run, callbackCapability: payload.callback_capability, calmMessage: 'Nothing was lost. A new Colab return path is ready.' }));
    }
    case 'RUN_CANCEL': {
      const payload = await brokerFetch(`/api/v1/runs/${encodeURIComponent(message.run_id)}/cancel`, { method: 'POST' });
      return sanitizeSession(await writeSession({ run: payload.run, callbackCapability: null, calmMessage: 'The run is paused. Your local build is preserved.' }));
    }
    default:
      throw new Error(`Unsupported extension command: ${message.type}`);
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handle(message, sender)
    .then((data) => sendResponse({ ok: true, data }))
    .catch((error) => sendResponse({ ok: false, error: error.message, recovery: 'Your build remains saved. Retry when you are ready.' }));
  return true;
});
