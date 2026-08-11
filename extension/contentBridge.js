const PAGE_SOURCE = 'securedme-algoquest-page';
const EXTENSION_SOURCE = 'securedme-arcane-forge-extension';

window.addEventListener('message', (event) => {
  if (event.source !== window || !event.data || event.data.source !== PAGE_SOURCE) return;
  if (event.data.type === 'MAGE_MISSION_AVAILABLE') {
    chrome.runtime.sendMessage({ type: 'MISSION_AVAILABLE', mission: event.data.mission, profile: event.data.profile }).catch(() => undefined);
  }
});

chrome.runtime.onMessage.addListener((message) => {
  if (!['ARTIFACT_RECEIPT_AVAILABLE', 'COLAB_RECEIPT_AVAILABLE'].includes(message.type)) return;
  window.postMessage({ source: EXTENSION_SOURCE, type: message.type, receipt: message.receipt }, window.location.origin);
});

window.postMessage({ source: EXTENSION_SOURCE, type: 'EXTENSION_BRIDGE_READY' }, window.location.origin);
