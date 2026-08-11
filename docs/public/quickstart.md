# Algorithm Builder quickstart

## Requirements

Use a clean checkout, the runtime declared by the repository, and its committed lockfiles. Confirm the active branch before installing anything.

```powershell
git status --short --branch
```

## Install

```powershell
npm install
```

## Start

```powershell
npm start
```

For the side panel, build the unpacked extension and load `dist/extension` in Chromium 114 or later. Missing Auth0 configuration fails closed.

## Verify

```powershell
npm test
```

## Human acceptance

Inspect the output, logs, test results, and diff. Accept, request a correction, quarantine, or stop; do not silently promote a generated result.

The test suite executes the generated Python locally and compares it with the Builder AST. This is parity evidence, not a substitute for live Colab acceptance.
