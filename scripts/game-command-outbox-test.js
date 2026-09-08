const assert = require('assert');
const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');

const filename = path.resolve(__dirname, '..', 'src', 'extension', 'gameCommandOutbox.js');
const transformed = babel.transformSync(fs.readFileSync(filename, 'utf8'), { filename, plugins: ['@babel/plugin-transform-modules-commonjs'] }).code;
const loaded = { exports: {} };
Function('module', 'exports', 'require', transformed)(loaded, loaded.exports, require);
const { createGameCommandOutbox, GAME_COMMAND_OUTBOX_KEY } = loaded.exports;

const values = {};
const sent = [];
let failOnce = true;
const outbox = createGameCommandOutbox({
  storageArea: {
    async get(key) { return { [key]: values[key] }; },
    async set(patch) { Object.assign(values, JSON.parse(JSON.stringify(patch))); },
  },
  randomUUID: () => 'stable-command-id',
  now: () => '2026-09-08T12:00:00.000Z',
  send: async (command) => {
    sent.push(command);
    if (failOnce) { failOnce = false; throw new Error('response-lost'); }
    return { ok: true, request_id: command.command_id };
  },
});

(async () => {
  const command = await outbox.queue('run-A', 'REQUEST_HINT', {});
  await assert.rejects(outbox.deliver('run-A', command), /response-lost/);
  assert.strictEqual((await outbox.read())[0].command.command_id, 'stable-command-id', 'a lost response retains the same command identifier');
  assert.strictEqual((await outbox.replay('run-B')).length, 0, 'another game cannot consume the pending command');
  const replayed = await outbox.replay('run-A');
  assert.strictEqual(replayed[0].request_id, 'stable-command-id');
  assert.deepStrictEqual(await outbox.read(), [], 'an acknowledged replay leaves the outbox');
  assert.strictEqual(sent.length, 2);
  assert(Array.isArray(values[GAME_COMMAND_OUTBOX_KEY]));
  console.log('Side panel command outbox: stable replay, run isolation and acknowledgement cleanup passed.');
})().catch((error) => { console.error(error); process.exitCode = 1; });
