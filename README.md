# Algorithm Builder App

<!-- SECUREDME-CPAI-MESH:START -->
<p align="center">
  <img alt="CodeProject.AI Server embedded mesh node" src="https://img.shields.io/badge/CodeProject.AI%20Server-Embedded%20Mesh%20Node-1F6FEB?style=for-the-badge" />
  <img alt="YOLO real local inference validated" src="https://img.shields.io/badge/YOLO-Real%20Local%20Inference-16A34A?style=for-the-badge" />
</p>
<!-- SECUREDME-CPAI-MESH:END -->

[Embedded CodeProject.AI node operations](infra/codeproject-ai/README.md)

[![SecuredMe Education Suite public calendar](https://img.shields.io/badge/SecuredMe%20Education%20Suite-public%20calendar%20%7C%20pre--alpha%20%7C%20active%20public%20development-5484ED?style=for-the-badge&logo=googlecalendar&logoColor=white)](https://calendrier.securedme.ca)

**Attribution:** Jean-Sebastien Beaulieu · [ORCID 0009-0007-2904-0443](https://orcid.org/0009-0007-2904-0443) · [SecuredMe](https://securedme.ca) · [Algorithm Builder](https://algorithm-builder.securedme.ca)

<!-- SECUREDME-SUITE-BADGES:START -->
[![Issues](https://img.shields.io/github/issues/SeCuReDmE-main-dev/algorithm-builder-app?color=161B6A)](https://github.com/SeCuReDmE-main-dev/algorithm-builder-app/issues)
[![Milestones](https://img.shields.io/badge/milestones-M0--M7-23B8FF)](https://github.com/SeCuReDmE-main-dev/algorithm-builder-app/milestones)
[![Project Board](https://img.shields.io/badge/project-kanban-6F42FF)](https://github.com/users/SeCuReDmE-main-dev/projects/3)
[![Branch](https://img.shields.io/badge/branch-main-0E7490)](https://github.com/SeCuReDmE-main-dev/algorithm-builder-app/tree/main)
<!-- SECUREDME-SUITE-BADGES:END -->

<!-- SECUREDME-STARTUP-SUPPORT:START -->
<p align="center">
  <a href="https://e2b.dev/startups">
    <img alt="Gateway-ready E2B audit lane" src="https://img.shields.io/badge/Gateway--ready-E2B%20audit%20lane-FF8800?style=for-the-badge" />
  </a>
  <a href="https://www.datadoghq.com/partner/datadog-for-startups/">
    <img alt="Gateway-ready Datadog observability" src="https://img.shields.io/badge/Gateway--ready-Datadog%20observability-632CA6?style=for-the-badge&amp;logo=datadog&amp;logoColor=white" />
  </a>
</p>

> **Gateway support acknowledgement.** This SecuredMe school tool is gateway-compatible. E2B audit support and Datadog observability are routed through the shared SecuredMe gateway when that lane is configured; this repository does not claim a direct E2B or Datadog runtime dependency by default, and no E2B or Datadog secret is stored in this README.
<!-- SECUREDME-STARTUP-SUPPORT:END -->

> **Maintainer intake during active finishing week.** This repository is maintained directly on `main` by the SecuredMe maintainer. Public issues are open for bug reports, documentation corrections, security-safe observations, and reproducible feedback, but opening an issue does not promise a response or a delivery date. Pull requests are not accepted during the active code-finishing week; use issues only until this notice is replaced.




## School Authentication And Secret Boundary
This repository is a small SecuredMe school tool. Official classroom use must not require `.env` files, API keys, raw tokens, or local model secrets. Student and teacher workflows must use Codex/OpenAI or Antigravity/Gemini through browser WebAuth, fingerprinted session approval, and encrypted local session records when authentication is needed.

The reason for excluding generic local AI routes from official school mode is student and teacher safety: education accounts, provider-side account controls, browser login, and governed AI refusal behavior are safer than unguided local model endpoints for classroom cybersecurity and algorithm-building tools.

> **Development status.** This school tool is currently **pre-alpha — active public development**. Public issues remain open for intake, but no response or delivery date is promised. Pull requests are paused during active development.

> **SecuredMe Education visual theme.** This pre-alpha school tool uses the shared SecuredMe Education open-source visual identity. See [assets/securedme/education](assets/securedme/education) for light/dark logo and thin banner assets.


A sophisticated algorithm visualization and development tool.

> **Official school governance.** Algorithm Builder App is for training students and teachers to build, inspect, and reason about algorithms safely. It is not a tool for theft, fraud, bypass, abuse, or criminal automation. The maintained classroom route supports Codex/OpenAI or Antigravity/Gemini only. See [SCHOOL_TOOL_GOVERNANCE.md](SCHOOL_TOOL_GOVERNANCE.md) and [AGENTS.md](AGENTS.md).

> **License.** This project uses the Secured Educational License 2.0 (SEL-2.0). It is provided for education, research, simulation, classroom training, and supervised learning. Misuse, unsafe private forks, unsupported provider routes, and unsupervised authority claims are not maintained or endorsed by the official school version. See [LICENSE](LICENSE), [NOTICE](NOTICE), [DISCLAIMER](DISCLAIMER), and [SAFETY.md](SAFETY.md).

## Current Status

Algorithm Builder App is in **pre-alpha — active public development** as part of the SecuredMe Education suite. During the AlgoQuest Hero Books work, its role was narrowed and made testable:

- AlgoQuest owns adventures, missions, prompt selection, evidence policy, Qbit boundaries, Tenebris boundaries, and progression.
- Algorithm Builder acts as the forge: character sheet, deterministic die, inventory surface, algorithm construction surface, and artifact receipt producer.
- Builder can validate a pasted `MissionEnvelope.v1` from AlgoQuest and emit an `AlgorithmArtifactReceipt.v1` back to AlgoQuest.
- Builder must not select Hero Books prompts, unlock milestones, issue `KnowledgeToken`, decide mastery, diagnose a learner, or store hidden learner signals.
- The live WebAuth bridge is not implemented yet. Until it exists, the cross-tool proof uses explicit copy/paste JSON receipts.

The current proof is contract-level and local. It is not a school alpha claim.

## Features

- **Core Functionality**
  - Interactive algorithm building interface
  - LaTeX mathematical expression rendering
  - Dynamic code generation
  - Step-by-step execution debugging
  - Real-time variable monitoring
- **AlgoQuest Hero Books adapter**
  - `BuilderCapabilityManifest.v1` with available, planned, disabled, and forbidden capabilities
  - `MissionEnvelope.v1` import validation
  - deterministic die and character sheet generation from mission context
  - inventory references for the active adventure
  - `AlgorithmArtifactReceipt.v1` with graph, tests, versions, capability refs, and digest
  - local outbox for explicit return to AlgoQuest
  - refusal of forbidden capabilities such as hidden learning diagnosis

## AlgoQuest Hero Books Boundary

Algorithm Builder is useful inside a Hero Book only when a mission needs a constructed artifact. It does not become mandatory for every AlgoQuest entry path.

The intended chain is:

```text
AlgoQuest MissionEnvelope
-> Algorithm Builder construction and artifact receipt
-> optional Colab execution or verification
-> AlgoQuest receipt validation
-> versioned pedagogical rule
```

The adapter is documented in [docs/algoquest-hero-books-adapter.md](docs/algoquest-hero-books-adapter.md).

Current local storage keys:

| Key | Purpose |
| --- | --- |
| `securedme.education.algoquest.mission-envelope.inbox.v1` | imported AlgoQuest mission envelope inbox |
| `securedme.education.algoquest.algorithm-artifact.outbox.v1` | Builder artifact receipts for explicit return to AlgoQuest |

Current live blockers:

- no live Builder WebAuth broker
- no provider key or secret allowed in browser storage
- no hidden authority handoff from Builder to AlgoQuest
- no real student, teacher, school, or minor workflow approved

## Technical Stack

- **Frontend**: HTML5, CSS3, JavaScript
- **Mathematical Processing**: MathJax, mathjs
- **Infrastructure**: Docker, Nginx
- **Monitoring**: Prometheus, Grafana
- **Database**: PostgreSQL
- **Caching**: Redis

## Docker Services

- Web Application (Port 3000)
- PostgreSQL Database
- Redis Cache (Port 6379)
- Nginx Reverse Proxy (Port 80)
- Prometheus Metrics (Port 9090)
- Grafana Dashboard (Port 3001)

## Installation

1. Install dependencies:
```bash
npm install
```

2. Run the local server:
```bash
npm start
```

3. Build and test:
```bash
npm run build
npm test
```

4. Access the application at `http://localhost:3000`

Docker support remains available for infrastructure experiments, but the current Hero Books adapter proof is validated by `npm test` and `npm run build`.

## Usage

1. **Mathematical Components**
   - Use the math panel to input LaTeX expressions
   - Leverage mathjs calculations for mathematical operations
   - Visualize mathematical functions

2. **Algorithm Building**
   - Drag and drop components from the palette
   - Connect components to create algorithms
   - Generate executable code automatically

3. **Debugging**
   - Step through execution
   - Monitor variable values
   - Analyze algorithm performance

4. **AlgoQuest Hero Books forge mode**
   - Paste a `MissionEnvelope.v1` generated by AlgoQuest.
   - Let Builder validate the mission boundaries and unavailable capabilities.
   - Construct or inspect an algorithm artifact.
   - Emit a JSON receipt for AlgoQuest.
   - Keep mastery, tokens, milestones, and final pedagogical decisions inside AlgoQuest.

5. **Neutrosophic Logic and Neutrosophic Linear Model**
   - Define Neutrosophic Components (T, I, F)
   - Implement Neutrosophic Logic Operations (negation, conjunction, disjunction, implication, equivalence)
   - Apply Neutrosophic Logic to problem solving

## Verification

Run:

```bash
npm test
npm run build
```

`npm test` runs `scripts/smoke-test.js`, which currently verifies:

- adapter strings and browser entry points
- `BuilderCapabilityManifest.v1`
- forbidden capability rejection
- `MissionEnvelope.v1` acceptance/rejection
- deterministic die and character sheet receipt context
- `AlgorithmArtifactReceipt.v1` shape and digest
- Docker health contract text

The matching AlgoQuest side of the integration is validated in `algoquest-ams-discovry-labs-module-` by `npm test`, including Phase 7 prompt quality, browser gate, and pre-alpha gate.

## Contributing

During the active code-finishing week, contribution intake is issue-only. Please open a public issue with a reproducible report, suggested documentation correction, or security-safe observation. Pull requests are not accepted during this window.

## License

This project is licensed under the Secured Educational License 2.0
(SEL-2.0). See `LICENSE`, `NOTICE`, and `DISCLAIMER`.







