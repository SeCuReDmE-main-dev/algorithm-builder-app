# Interfaces

- **MV3 side panel:** receives presentation state and emits typed learner actions without owning canonical progression.
- **Extension service worker:** performs Auth0 Authorization Code with PKCE, broker calls, notebook download, and typed evidence return.
- **Headless Mage engine:** validates eight ordered cards, generates deterministic Python, and recomputes canonical SHA-256 digests.
- **Express/Postgres broker:** binds account, mission, artifact, callback, retry, cancellation, and execution receipt records.

## Interface contract

Inputs must be explicit, outputs must be inspectable, errors must be returned as errors, and consequential external actions require human approval.

The successful path does not require JSON copy/paste. JSON download/import remains the explicit recovery path. Broker outage, expired authentication, and failed verification preserve local work.

## Compatibility

Treat undocumented endpoints, commands, and browser controls as unsupported. Confirm the current repository version before integrating another system.
