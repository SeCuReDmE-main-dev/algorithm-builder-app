# Architecture

A Chromium MV3 side panel, renderer-independent card engine, extension service worker, and Express/Postgres broker coordinate one bounded Mage artifact.

## Data flow

```text
AlgoQuest MissionEnvelope.v2 -> typed card AST -> local tests -> admitted artifact -> generated notebook -> broker-attested execution receipt -> AlgoQuest
```

The extension uses service-worker/content-script messaging and never reads the Colab DOM. Auth0 access tokens stay in `chrome.storage.session`; only a hashed learner reference and the hash of the short-lived callback capability are stored by the broker.

## Provenance

Record the repository commit, configuration, input identifiers, execution command, output location, and validation result. A screenshot alone is not a reproducible artifact.

## Failure behavior

Missing configuration, unavailable dependencies, invalid input, and failed tests must remain visible. The tool must not replace a failure with invented success.
