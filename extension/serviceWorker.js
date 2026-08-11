importScripts('config.js');

const CONFIG = globalThis.SECUREDME_EXTENSION_CONFIG || {};
const SESSION_KEY = 'securedme.mage-first-proof.extension-session.v1';

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => undefined);
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

async function sendEvidenceToAlgoQuest(type, receipt) {
  const tabs = await chrome.tabs.query({ url: ['http://localhost/*', 'http://127.0.0.1/*', 'https://algoquest.securedme.ca/*'] });
  await Promise.all(tabs.map((tab) => chrome.tabs.sendMessage(tab.id, { type, receipt }).catch(() => undefined)));
}

async function handle(message) {
  switch (message.type) {
    case 'MISSION_AVAILABLE':
      return sanitizeSession(await writeSession({ mission: message.mission, profile: message.profile, calmMessage: 'Mission received from AlgoQuest.' }));
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
      if (payload.run.execution_receipt) await sendEvidenceToAlgoQuest('COLAB_RECEIPT_AVAILABLE', payload.run.execution_receipt);
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

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  handle(message)
    .then((data) => sendResponse({ ok: true, data }))
    .catch((error) => sendResponse({ ok: false, error: error.message, recovery: 'Your build remains saved. Retry when you are ready.' }));
  return true;
});
