function notebookForRun({ run, callbackCode, brokerBaseUrl }) {
  if (!run.artifact) throw new Error('An admitted artifact is required before notebook generation.');
  const callbackUrl = `${String(brokerBaseUrl).replace(/\/$/, '')}/api/v1/runs/${encodeURIComponent(run.run_id)}/colab-callback`;
  const sourceLines = String(run.artifact.generated_code.source).split('\n').map((line) => `${line}\n`);
  const callbackSource = [
    'import datetime, requests\n',
    `callback_url = ${JSON.stringify(callbackUrl)}\n`,
    `callback_capability = ${JSON.stringify(callbackCode)}\n`,
    `artifact_digest = ${JSON.stringify(run.artifact_digest)}\n`,
    `run_id = ${JSON.stringify(run.run_id)}\n`,
    `mission_id = ${JSON.stringify(run.mission.mission_id)}\n`,
    "tests = [\n",
    "    {'test_id': 'trajectory_changes', 'status': 'passed' if result['trajectory_changed'] else 'failed'},\n",
    "    {'test_id': 'model_limit_is_written', 'status': 'passed' if len(result['model_limit'].strip()) >= 20 else 'failed'},\n",
    "]\n",
    "execution_payload = {\n",
    "    'provider': 'google-colab',\n",
    "    'run_id': run_id,\n",
    "    'mission_id': mission_id,\n",
    "    'artifact_digest': artifact_digest,\n",
    "    'execution_result': {key: value for key, value in result.items() if key != 'model_limit'},\n",
    "    'model_limit_response': result['model_limit'],\n",
    "    'tests': tests,\n",
    "    'executed_at': datetime.datetime.now(datetime.timezone.utc).isoformat(),\n",
    "    'contains_identity': False,\n",
    "    'contains_secret': False,\n",
    "    'contains_canonical_state': False,\n",
    "}\n",
    "response = requests.post(callback_url, json=execution_payload, headers={'X-Run-Capability': callback_capability}, timeout=30)\n",
    "response.raise_for_status()\n",
    "verified_receipt = response.json()['execution_receipt']\n",
    "print('Execution returned to AlgoQuest. You can go back to the side panel.')\n",
  ];
  return {
    cells: [
      {
        cell_type: 'markdown',
        metadata: {},
        source: [
          '# AlgoQuest — Mage First-Proof\n',
          '\n',
          'Build one trajectory, change one force, and explain the limit of the model.\n',
          'This notebook sends a bounded execution receipt; it does not store identity or decide mastery.\n',
        ],
      },
      { cell_type: 'code', execution_count: null, metadata: { securedme: { prepared: true, version: 'v2' } }, outputs: [], source: sourceLines },
      { cell_type: 'markdown', metadata: {}, source: ['## Your reflection\n', 'Edit the `model_limit` text above if it does not yet explain what the model cannot prove.\n'] },
      { cell_type: 'code', execution_count: null, metadata: { securedme: { prepared: true, callback: true, expires_at: run.callback_expires_at } }, outputs: [], source: callbackSource },
    ],
    metadata: {
      kernelspec: { display_name: 'Python 3', language: 'python', name: 'python3' },
      language_info: { name: 'python' },
      securedme: { schema: 'securedme.education.colab-notebook.v2', run_id: run.run_id, artifact_digest: run.artifact_digest, contains_identity: false, contains_canonical_state: false },
    },
    nbformat: 4,
    nbformat_minor: 5,
  };
}

module.exports = { notebookForRun };
