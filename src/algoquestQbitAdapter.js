(function (root) {
  const OUTBOX_KEY = 'securedme.education.algoquest.outbox.v1';
  const ARTIFACT_OUTBOX_KEY = 'securedme.education.algoquest.algorithm-artifact.outbox.v1';
  const MISSION_INBOX_KEY = 'securedme.education.algoquest.mission-envelope.inbox.v1';

  const BUILDER_CAPABILITY_MANIFEST = {
    schema: 'securedme.education.algorithm-builder.capability-manifest.v1',
    manifest_id: 'algorithm-builder.hero-books.capabilities.1',
    version: '1.0.0',
    statuses: {
      available: [
        'character-sheet',
        'deterministic-die',
        'inventory',
        'force-block',
        'trajectory-lab',
        'model-comparison',
        'model-boundary',
        'artifact-receipt',
        'ascii-sky-map',
        'debug-panel',
        'provenance-registry',
        'text-fallback',
      ],
      planned: [
        'curved-grid',
        'four-interactions-ledger',
        'colab-notebook-export',
        'round-trip-receipt',
        'route-graph-editor',
        'condition-branch-forge',
        'cost-map',
        'probability-die',
        'resource-ledger',
        'cipher-wheel',
        'risk-meter',
        'pipeline-stage-board',
        'state-transition-board',
        'symbol-fact-boundary',
        'brownian-motion-lab',
        'photoelectric-threshold-lab',
        'loop-forge',
        'function-forge',
        'data-structure-shelf',
        'milestone-ledger',
        'knowledge-token-preview',
        'unlock-preview',
        'teacher-projection-preview',
        'student-private-projection',
        'organization-aggregate-preview',
        'tenebris-observation-gate',
        'consent-scope-panel',
        'locale-preview-fr',
        'locale-preview-en',
        'locale-preview-es-419',
        'audience-primary-profile',
        'audience-secondary-profile',
        'audience-college-profile',
        'audience-university-profile',
        'audience-professor-profile',
        'quest-inventory-export',
        'achievement-badge-preview',
        'mission-completion-preview',
        'prompt-assignment-preview',
        'prompt-consumption-preview',
        'multi-run-replay',
        'offline-package-preview',
        'linear-ascii-output',
        'screen-reader-summary',
        'keyboard-only-builder',
        'reduced-motion-mode',
        'chromebook-low-memory-mode',
      ],
      disabled: [
        'live-codex-provider',
        'live-gemini-provider',
        'live-codeproject-ai',
      ],
      forbidden: [
        'raw-student-conversation-export',
        'raw-audio-retention',
        'hidden-learning-diagnosis',
      ],
    },
    contract_version: 'v1',
    raw_secret_stored: false,
  };

  const textEncoder = new TextEncoder();

  function canonicalJson(value) {
    if (Array.isArray(value)) {
      return `[${value.map((item) => canonicalJson(item)).join(',')}]`;
    }
    if (value && typeof value === 'object') {
      return `{${Object.entries(value)
        .filter((entry) => entry[1] !== undefined)
        .sort((left, right) => left[0].localeCompare(right[0]))
        .map(([key, nested]) => `${JSON.stringify(key)}:${canonicalJson(nested)}`)
        .join(',')}}`;
    }
    return JSON.stringify(value);
  }

  async function sha256Digest(value) {
    const cryptoProvider = root.crypto || globalThis.crypto;
    if (!cryptoProvider || !cryptoProvider.subtle) {
      throw new Error('crypto-subtle-unavailable');
    }
    const payload = typeof value === 'string' ? value : canonicalJson(value);
    const hashBuffer = await cryptoProvider.subtle.digest('SHA-256', textEncoder.encode(payload));
    return `sha256:${Array.from(new Uint8Array(hashBuffer)).map((byte) => byte.toString(16).padStart(2, '0')).join('')}`;
  }

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

  function buildAlgorithmGraph(component) {
    return {
      nodes: [
        {
          id: component.id || 'component-unknown',
          type: component.type || 'unknown',
          properties: component.properties || {},
        },
      ],
      edges: [],
    };
  }

  function deterministicDie(seed, sides) {
    const text = `${seed || 'algoquest'}:${sides || 6}`;
    let hash = 0;
    for (let index = 0; index < text.length; index += 1) {
      hash = (hash << 5) - hash + text.charCodeAt(index);
      hash |= 0;
    }
    return (Math.abs(hash) % (sides || 6)) + 1;
  }

  function buildCharacterSheet(context) {
    return {
      schema: 'securedme.education.algorithm-builder.character-sheet.v1',
      hero_book_id: context && context.hero_book_id ? context.hero_book_id : 'mage-two-horizons',
      role: 'apprenti-des-deux-horizons',
      inventory_refs: ['chalk-vector', 'paper-sky-map', 'force-token'],
      knowledge_token_ids: [],
      story_points: 0,
      raw_secret_stored: false,
      contract_version: 'v1',
    };
  }

  function availableCapabilitySet() {
    return new Set(BUILDER_CAPABILITY_MANIFEST.statuses.available);
  }

  function forbiddenCapabilitySet() {
    return new Set(BUILDER_CAPABILITY_MANIFEST.statuses.forbidden);
  }

  function validateMissionEnvelope(envelope) {
    const errors = [];
    if (!envelope || typeof envelope !== 'object') {
      return {
        status: 'rejected',
        reason: 'not-an-object',
        errors: ['MissionEnvelope must be an object.'],
      };
    }
    if (envelope.schema !== 'securedme.education.algoquest.mission-envelope.v1') {
      errors.push('schema');
    }
    for (const key of ['mission_id', 'adaptation_id', 'hero_book_id', 'locale', 'audience_id', 'mission_title', 'objective']) {
      if (typeof envelope[key] !== 'string' || !envelope[key].trim()) {
        errors.push(key);
      }
    }
    if (envelope.canonical_state_owner !== 'algoquest') {
      errors.push('canonical_state_owner');
    }
    if (envelope.artifact_owner !== 'algorithm-builder-or-colab') {
      errors.push('artifact_owner');
    }
    if (envelope.raw_secret_stored !== false) {
      errors.push('raw_secret_stored');
    }
    const requiredPromptIds = Array.isArray(envelope.required_prompt_ids) ? envelope.required_prompt_ids : [];
    if (requiredPromptIds.length === 0 || requiredPromptIds.some((id) => typeof id !== 'string' || !id.trim())) {
      errors.push('required_prompt_ids');
    }
    const capabilityRefs = Array.isArray(envelope.builder_capability_refs) ? envelope.builder_capability_refs : [];
    if (capabilityRefs.length === 0 || capabilityRefs.some((capability) => typeof capability !== 'string' || !capability.trim())) {
      errors.push('builder_capability_refs');
    }
    const available = availableCapabilitySet();
    const forbidden = forbiddenCapabilitySet();
    const unavailableCapabilities = capabilityRefs.filter((capability) => !available.has(capability));
    const forbiddenCapabilities = capabilityRefs.filter((capability) => forbidden.has(capability));
    if (forbiddenCapabilities.length) {
      errors.push(`forbidden_capabilities:${forbiddenCapabilities.join(',')}`);
    }
    const warningCapabilities = unavailableCapabilities.filter((capability) => !forbidden.has(capability));
    if (errors.length) {
      return {
        status: 'rejected',
        reason: 'invalid-mission-envelope',
        errors,
      };
    }
    return {
      status: 'accepted',
      mission_id: envelope.mission_id,
      adaptation_id: envelope.adaptation_id,
      hero_book_id: envelope.hero_book_id,
      locale: envelope.locale,
      audience_id: envelope.audience_id,
      capability_refs: capabilityRefs,
      unavailable_capability_refs: warningCapabilities,
      required_prompt_count: requiredPromptIds.length,
      raw_secret_stored: false,
      contract_version: 'v1',
    };
  }

  async function buildMissionEnvelopeReceipt(envelope) {
    const validation = validateMissionEnvelope(envelope);
    const body = {
      schema: 'securedme.education.algorithm-builder.mission-envelope-receipt.v1',
      source_app: 'algoquest',
      target_app: 'algorithm-builder',
      status: validation.status,
      reason: validation.reason || '',
      mission_id: validation.mission_id || '',
      adaptation_id: validation.adaptation_id || '',
      hero_book_id: validation.hero_book_id || '',
      locale: validation.locale || '',
      audience_id: validation.audience_id || '',
      required_prompt_count: validation.required_prompt_count || 0,
      unavailable_capability_refs: validation.unavailable_capability_refs || [],
      errors: validation.errors || [],
      contract_version: 'v1',
      raw_secret_stored: false,
    };
    return {
      ...body,
      envelope_digest: validation.status === 'accepted' ? await sha256Digest(envelope) : '',
      receipt_digest: await sha256Digest(body),
    };
  }

  async function importMissionEnvelope(envelope) {
    const receipt = await buildMissionEnvelopeReceipt(envelope);
    if (receipt.status !== 'accepted') {
      return receipt;
    }
    if (root.localStorage) {
      root.localStorage.setItem(MISSION_INBOX_KEY, JSON.stringify({
        envelope,
        receipt,
      }));
    }
    return receipt;
  }

  function readMissionEnvelopeInbox() {
    if (!root.localStorage) {
      return null;
    }
    try {
      const parsed = JSON.parse(root.localStorage.getItem(MISSION_INBOX_KEY) || 'null');
      if (!parsed || validateMissionEnvelope(parsed.envelope).status !== 'accepted') {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  function contextFromMissionEnvelope(envelope) {
    if (validateMissionEnvelope(envelope).status !== 'accepted') {
      return null;
    }
    return {
      mission_id: envelope.adaptation_id || envelope.mission_id,
      hero_book_id: envelope.hero_book_id,
      capability_refs: envelope.builder_capability_refs,
    };
  }

  async function buildAlgorithmArtifactReceipt(component, context) {
    const graph = buildAlgorithmGraph(component || {});
    const body = {
      schema: 'securedme.education.algorithm-builder.algorithm-artifact-receipt.v1',
      receipt_id: `algorithm-artifact:${context && context.mission_id ? context.mission_id : 'manual'}:${graph.nodes[0].id}`,
      source_app: 'algorithm-builder',
      target_app: 'algoquest',
      mission_id: context && context.mission_id ? context.mission_id : 'manual-builder-export',
      hero_book_id: context && context.hero_book_id ? context.hero_book_id : 'mage-two-horizons',
      capability_refs: ['character-sheet', 'deterministic-die', 'artifact-receipt'].concat(context && context.capability_refs ? context.capability_refs : []),
      graph,
      character_sheet: buildCharacterSheet(context),
      deterministic_die: {
        seed: context && context.mission_id ? context.mission_id : 'manual-builder-export',
        sides: 6,
        result: deterministicDie(context && context.mission_id ? context.mission_id : 'manual-builder-export', 6),
      },
      tests: [
        {
          test_id: 'graph-has-node',
          status: graph.nodes.length > 0 ? 'passed' : 'failed',
        },
      ],
      contract_version: 'v1',
      raw_secret_stored: false,
      raw_payload_embedded: false,
      dry_run: true,
    };
    return {
      ...body,
      artifact_digest: await sha256Digest(body),
    };
  }

  async function emitAlgorithmArtifactReceipt(component, context) {
    const receipt = await buildAlgorithmArtifactReceipt(component, context);
    if (root.localStorage) {
      const current = JSON.parse(root.localStorage.getItem(ARTIFACT_OUTBOX_KEY) || '[]');
      const records = Array.isArray(current) ? current : [];
      root.localStorage.setItem(ARTIFACT_OUTBOX_KEY, JSON.stringify([receipt].concat(records).slice(0, 25)));
    }
    return receipt;
  }

  async function emitAlgoQuestLearningEvent(artifactRef, score) {
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
    ARTIFACT_OUTBOX_KEY,
    MISSION_INBOX_KEY,
    BUILDER_CAPABILITY_MANIFEST,
    canonicalJson,
    sha256Digest,
    deterministicDie,
    validateMissionEnvelope,
    buildMissionEnvelopeReceipt,
    importMissionEnvelope,
    readMissionEnvelopeInbox,
    contextFromMissionEnvelope,
    buildCharacterSheet,
    buildAlgorithmArtifactReceipt,
    emitAlgorithmArtifactReceipt,
    buildAlgoQuestLearningEventStub,
    emitAlgoQuestLearningEvent,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = root.AlgorithmBuilderAlgoQuestQbitAdapter;
  }
})(typeof window !== 'undefined' ? window : globalThis);
