(function (root) {
  const OUTBOX_KEY = 'securedme.education.algoquest.outbox.v1';

  function buildAlgoQuestLearningEventStub(artifactRef, score) {
    return {
      schema: 'securedme.education.student-learning-event.v1',
      app_slug: 'algorithm-builder',
      artifact_ref: artifactRef,
      skill_area: 'algorithm_builder',
      difficulty_band: 'beginner',
      score: score || 93,
      threshold: 93,
      attempt_count: 1,
      blocked_reason: '',
      next_step_hint: 'Open AlgoQuest to reflect on the algorithm block sequence.',
      qbit_help_accepted: false,
      risk_flags: [],
      contract_version: 'v1',
      raw_secret_stored: false,
      dry_run: true,
    };
  }

  function emitAlgoQuestLearningEvent(artifactRef, score) {
    const event = buildAlgoQuestLearningEventStub(artifactRef, score);
    if (!root.localStorage) {
      return event;
    }
    const current = JSON.parse(root.localStorage.getItem(OUTBOX_KEY) || '[]');
    const records = Array.isArray(current) ? current : [];
    root.localStorage.setItem(OUTBOX_KEY, JSON.stringify([event].concat(records).slice(0, 25)));
    return event;
  }

  root.AlgorithmBuilderAlgoQuestQbitAdapter = {
    OUTBOX_KEY,
    buildAlgoQuestLearningEventStub,
    emitAlgoQuestLearningEvent,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = root.AlgorithmBuilderAlgoQuestQbitAdapter;
  }
})(typeof window !== 'undefined' ? window : globalThis);
