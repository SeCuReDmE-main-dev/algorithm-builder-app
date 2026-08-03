# AlgoQuest Hero Books Adapter

Status: `pre-alpha contract adapter`

Algorithm Builder acts as a mechanical support surface for AlgoQuest Hero Books. It is not the mission authority and it does not assign mastery.

## Implemented Contract

- `BuilderCapabilityManifest.v1` declares available, planned, disabled, and forbidden capabilities.
- `MissionEnvelope.v1` can be pasted from AlgoQuest and validated before Builder emits an artifact.
- `MissionEnvelopeReceipt.v1` records acceptance, rejection, digest, mission id, audience, locale, unavailable capabilities and validation errors.
- `AlgorithmArtifactReceipt.v1` records a minimal graph, tests, capability references, versions, and a SHA-256 digest.
- The receipt also includes a deterministic die result, character sheet and inventory references for the first Mage proof.
- Imported missions are stored locally under `securedme.education.algoquest.mission-envelope.inbox.v1`.
- Receipts are written to `securedme.education.algoquest.algorithm-artifact.outbox.v1`.
- The browser UI displays the JSON receipt so it can be copied into AlgoQuest until a WebAuth broker exists.
- The legacy learning-event helper remains present for compatibility, but the Hero Books path uses artifact receipts.

## Boundaries

- Builder does not select prompts.
- Builder rejects any mission envelope that tries to make Builder the canonical state owner.
- Builder rejects forbidden capabilities such as hidden learning diagnosis.
- Builder does not issue `KnowledgeToken`.
- Builder does not unlock milestones.
- Builder does not store raw student conversations, raw audio, or hidden learning diagnoses.
- Live Codex, Gemini, and CodeProject integrations remain disabled capabilities.

## Verification

Run:

```powershell
npm test
```

The smoke test verifies the manifest, forbidden capabilities, MissionEnvelope admission/rejection, browser entry contract, Docker health contract, and artifact receipt shape.
