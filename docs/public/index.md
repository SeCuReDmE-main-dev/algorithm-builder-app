# Algorithm Builder

<div class="se-tool-header">
  <img src="../../_static/tools/algorithm-builder/logo.png" alt="Algorithm Builder identity">
  <div><strong>Algorithm Builder</strong><span>in-development · browser-app · version 1.0.0</span></div>
</div>

A Chromium MV3 side-panel forge for building a deterministic Mage card program, validating it locally, and returning bound Colab evidence to AlgoQuest.

## Public status

- **Runtime:** `browser-app`
- **Availability:** `pending`
- **License:** `LicenseRef-SEL-2.0`
- **Version:** `1.0.0`

<div class="se-actions">
  <a href="https://algorithm-builder.securedme.ca">Open tool</a>
  <a href="https://github.com/SeCuReDmE-main-dev/algorithm-builder-app">Source</a>
  <a href="https://github.com/SeCuReDmE-main-dev/algorithm-builder-app/issues">Issues</a>
</div>

## Interfaces

- Chromium 114+ Manifest V3 side panel
- Renderer-independent Mage card AST and visible learning-run store
- Authenticated Express/Postgres broker
- Generated Colab notebook and server-attested receipt return

## Current first-proof

The panel follows `Mission → Build → Check → Colab → Return → Reflect`. It preserves the build across retries and restart, supports keyboard card ordering, undo/redo, autosave, a learner-written model-limit explanation, and explicit JSON recovery.

The production bundle, engine, broker, notebook parity, privacy, and permission tests pass locally. The public runtime remains pending until real Auth0, HTTPS/Postgres, unpacked Chromium, and live Colab acceptance are complete.

```{important}
The Builder owns editable artifacts, not missions or progression. AlgoQuest remains the sole pedagogical authority, and local verification is never labelled as Colab evidence.
```

```{toctree}
:maxdepth: 2

quickstart
architecture
interfaces
operations
```
