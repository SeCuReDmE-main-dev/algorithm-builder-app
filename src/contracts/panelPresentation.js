export const PANEL_STAGES = Object.freeze(['Mission', 'Build', 'Check', 'Colab', 'Return', 'Reflect']);

export const PANEL_COMMANDS = Object.freeze({
  LOGIN: 'AUTH_LOGIN',
  CREATE_RUN: 'RUN_CREATE',
  SET_PROFILE: 'PROFILE_SET',
  MOVE_CARD: 'CARD_MOVE',
  UPDATE_CARD: 'CARD_UPDATE',
  CHECK_BUILD: 'BUILD_CHECK',
  SUBMIT_ARTIFACT: 'ARTIFACT_SUBMIT',
  OPEN_COLAB: 'OPEN_COLAB',
  REFRESH_RUN: 'RUN_STATUS',
  RETRY: 'RUN_RETRY',
  CANCEL: 'RUN_CANCEL',
});

export function presentationEvent(state) {
  return new CustomEvent('securedme:panel-state', {
    detail: {
      schema: 'securedme.education.builder-panel-state.v1',
      ...state,
      hidden_telemetry_stored: false,
    },
  });
}

export function commandEvent(command, payload = {}) {
  if (!Object.values(PANEL_COMMANDS).includes(command)) throw new Error(`Unknown panel command: ${command}`);
  return new CustomEvent('securedme:panel-command', {
    detail: { schema: 'securedme.education.builder-panel-command.v1', command, payload },
  });
}
