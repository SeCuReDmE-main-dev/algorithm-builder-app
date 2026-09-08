export const GAME_COMMAND_OUTBOX_KEY = 'securedme.algoquest.sidepanel-command-outbox.v1';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function createGameCommandOutbox({ storageArea, send, randomUUID = () => crypto.randomUUID(), now = () => new Date().toISOString(), limit = 20 }) {
  if (!storageArea || typeof send !== 'function') throw new Error('game-command-outbox-adapter-missing');

  const read = async () => {
    const stored = await storageArea.get(GAME_COMMAND_OUTBOX_KEY);
    return Array.isArray(stored[GAME_COMMAND_OUTBOX_KEY]) ? clone(stored[GAME_COMMAND_OUTBOX_KEY]) : [];
  };

  const write = async (commands) => {
    await storageArea.set({ [GAME_COMMAND_OUTBOX_KEY]: clone(commands.slice(-limit)) });
  };

  const queue = async (runId, type, payload = {}) => {
    if (!runId || !type) throw new Error('game-command-binding-missing');
    const pending = await read();
    const command = { command_id: randomUUID(), type, payload: clone(payload) };
    await write([...pending, { run_id: runId, command, queued_at: now(), contains_identity: false, raw_secret_stored: false }]);
    return command;
  };

  const deliver = async (runId, command) => {
    const pending = await read();
    const queued = pending.find((entry) => entry.run_id === runId && entry.command?.command_id === command?.command_id);
    if (!queued) throw new Error('game-command-not-queued');
    const result = await send(queued.command);
    await write((await read()).filter((entry) => entry.command?.command_id !== queued.command.command_id));
    return result;
  };

  const replay = async (runId, onResult = () => undefined) => {
    if (!runId) return [];
    const results = [];
    for (const entry of (await read()).filter((candidate) => candidate.run_id === runId)) {
      const result = await deliver(runId, entry.command);
      results.push(result);
      onResult(result);
    }
    return results;
  };

  return { read, queue, deliver, replay };
}
