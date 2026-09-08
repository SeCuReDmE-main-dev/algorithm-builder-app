const PAGE_SOURCE = 'securedme-algoquest-page';
const EXTENSION_SOURCE = 'securedme-arcane-forge-extension';
const pendingCommands = new Map();

function isSamePageMessage(event, source) {
  return event.source === window && event.origin === window.location.origin && event.data && event.data.source === source;
}

window.addEventListener('message', (event) => {
  if (!isSamePageMessage(event, PAGE_SOURCE)) return;
  if (event.data.type === 'MAGE_MISSION_AVAILABLE') {
    chrome.runtime.sendMessage({ type: 'MISSION_AVAILABLE', mission: event.data.mission, profile: event.data.profile }).catch(() => undefined);
  }
  if (event.data.type === 'GAME_STATE_SNAPSHOT') {
    chrome.runtime.sendMessage({ type: 'GAME_STATE_SNAPSHOT', projection: event.data.projection }).catch(() => undefined);
  }
  if (event.data.type === 'GAME_COMMAND_RESULT' && typeof event.data.request_id === 'string') {
    const pending = pendingCommands.get(event.data.request_id);
    if (pending) {
      pendingCommands.delete(event.data.request_id);
      clearTimeout(pending.timeout);
      pending.resolve(event.data.result);
    }
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (['ARTIFACT_RECEIPT_AVAILABLE', 'COLAB_RECEIPT_AVAILABLE'].includes(message.type)) {
    window.postMessage({ source: EXTENSION_SOURCE, type: message.type, receipt: message.receipt, broker_authenticated: message.broker_authenticated === true }, window.location.origin);
    return undefined;
  }
  if (message.type === 'GAME_COMMAND' && message.command && typeof message.command.command_id === 'string') {
    const requestId = message.command.command_id;
    const response = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        pendingCommands.delete(requestId);
        reject(new Error('La planche ne répond pas. Le brouillon reste conservé.'));
      }, 10000);
      pendingCommands.set(requestId, { resolve, reject, timeout });
      window.postMessage({ source: EXTENSION_SOURCE, type: 'GAME_COMMAND', command: message.command }, window.location.origin);
    });
    response.then((result) => sendResponse({ ok: Boolean(result?.ok), data: result, error: result?.error })).catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }
  if (message.type === 'REQUEST_GAME_SNAPSHOT') {
    window.postMessage({ source: EXTENSION_SOURCE, type: 'REQUEST_GAME_SNAPSHOT' }, window.location.origin);
    sendResponse({ ok: true });
  }
  return undefined;
});

window.postMessage({ source: EXTENSION_SOURCE, type: 'EXTENSION_BRIDGE_READY' }, window.location.origin);
window.postMessage({ source: EXTENSION_SOURCE, type: 'REQUEST_GAME_SNAPSHOT' }, window.location.origin);
