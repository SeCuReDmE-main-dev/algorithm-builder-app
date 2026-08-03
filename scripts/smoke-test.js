const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const requiredFiles = [
  "README.md",
  "AGENTS.md",
  "CONTRIBUTING.md",
  "SECURITY.md",
  "SCHOOL_TOOL_GOVERNANCE.md",
  "LICENSE",
  "NOTICE",
  "DISCLAIMER",
  "src/index.js",
  "src/index.html",
  "server/index.js",
  "Dockerfile",
  "src/algoquestQbitAdapter.js",
];

const missing = requiredFiles.filter((file) => !fs.existsSync(path.join(root, file)));
if (missing.length) {
  console.error(`Missing required files: ${missing.join(", ")}`);
  process.exit(1);
}

const readme = fs.readFileSync(path.join(root, "README.md"), "utf8");
const governance = fs.readFileSync(path.join(root, "SCHOOL_TOOL_GOVERNANCE.md"), "utf8");
const combined = `${readme}\n${governance}`;

for (const phrase of ["Codex/OpenAI", "Antigravity/Gemini", "LicenseRef-SEL-2.0"]) {
  if (!combined.includes(phrase)) {
    console.error(`Missing governance phrase: ${phrase}`);
    process.exit(1);
  }
}

const adapter = fs.readFileSync(path.join(root, "src/algoquestQbitAdapter.js"), "utf8");
const components = fs.readFileSync(path.join(root, "src/components.js"), "utf8");
const index = fs.readFileSync(path.join(root, "src/index.html"), "utf8");
const browserEntry = fs.readFileSync(path.join(root, "src/index.js"), "utf8");
const dockerfile = fs.readFileSync(path.join(root, "Dockerfile"), "utf8");

for (const phrase of [
  "securedme.education.algoquest.outbox.v1",
  "securedme.education.algoquest.algorithm-artifact.outbox.v1",
  "securedme.education.algoquest.mission-envelope.inbox.v1",
  "emitAlgorithmArtifactReceipt",
  "BUILDER_CAPABILITY_MANIFEST",
  "algorithm-artifact-receipt.v1",
  "mission-envelope-receipt.v1",
  "validateMissionEnvelope",
  "deterministicDie",
  "character_sheet",
  "raw_secret_stored",
]) {
  if (!adapter.includes(phrase)) {
    console.error(`Missing AlgoQuest adapter phrase: ${phrase}`);
    process.exit(1);
  }
}

if (!components.includes("Send to AlgoQuest") || !components.includes("Import Mission") || !components.includes("emitAlgoQuestComponentEvent")) {
  console.error("Algorithm Builder does not expose the AlgoQuest user action hook.");
  process.exit(1);
}

const adapterModule = require("../src/algoquestQbitAdapter.js");
if (adapterModule.BUILDER_CAPABILITY_MANIFEST.statuses.available.length !== 12) {
  console.error("Builder capability manifest must expose the twelve first-proof capabilities.");
  process.exit(1);
}
if (adapterModule.BUILDER_CAPABILITY_MANIFEST.statuses.forbidden.includes("hidden-learning-diagnosis") === false) {
  console.error("Builder capability manifest must forbid hidden learning diagnosis.");
  process.exit(1);
}

(async () => {
  const missionEnvelope = {
    schema: "securedme.education.algoquest.mission-envelope.v1",
    mission_id: "entry.mage-two-horizons.primary-5-6.fr-CA.1",
    adaptation_id: "mage-two-horizons.primary-5-6.fr-CA.1",
    hero_book_id: "mage-two-horizons",
    locale: "fr-CA",
    audience_id: "primary-5-6",
    mission_title: "Premiere trajectoire du Mage des Deux Horizons",
    objective: "Modifier une force, observer une trajectoire et expliquer ce que le modele ne prouve pas.",
    required_prompt_ids: ["mage-p01-sky-door", "mage-p02-first-vector"],
    builder_capability_refs: ["character-sheet", "deterministic-die", "force-block", "artifact-receipt"],
    canonical_state_owner: "algoquest",
    artifact_owner: "algorithm-builder-or-colab",
    raw_secret_stored: false,
    contract_version: "v1",
  };
  const missionValidation = adapterModule.validateMissionEnvelope(missionEnvelope);
  if (missionValidation.status !== "accepted" || missionValidation.required_prompt_count !== 2) {
    console.error("MissionEnvelope should be accepted by Builder.");
    process.exit(1);
  }
  const invalidMissionValidation = adapterModule.validateMissionEnvelope({
    ...missionEnvelope,
    canonical_state_owner: "algorithm-builder",
  });
  if (invalidMissionValidation.status !== "rejected" || !invalidMissionValidation.errors.includes("canonical_state_owner")) {
    console.error("Builder must reject MissionEnvelope records that claim canonical state authority.");
    process.exit(1);
  }
  const forbiddenMissionValidation = adapterModule.validateMissionEnvelope({
    ...missionEnvelope,
    builder_capability_refs: ["hidden-learning-diagnosis"],
  });
  if (forbiddenMissionValidation.status !== "rejected") {
    console.error("Builder must reject forbidden mission capabilities.");
    process.exit(1);
  }
  const missionReceipt = await adapterModule.buildMissionEnvelopeReceipt(missionEnvelope);
  if (
    missionReceipt.status !== "accepted" ||
    missionReceipt.mission_id !== missionEnvelope.mission_id ||
    !missionReceipt.envelope_digest.startsWith("sha256:") ||
    !missionReceipt.receipt_digest.startsWith("sha256:")
  ) {
    console.error("MissionEnvelope receipt contract is invalid.");
    process.exit(1);
  }
  const missionContext = adapterModule.contextFromMissionEnvelope(missionEnvelope);
  if (!missionContext || missionContext.mission_id !== missionEnvelope.adaptation_id || !missionContext.capability_refs.includes("force-block")) {
    console.error("MissionEnvelope context should drive Builder artifact receipts.");
    process.exit(1);
  }
  const receipt = await adapterModule.buildAlgorithmArtifactReceipt(
    { id: "component-test", type: "force", properties: { direction: "east", intensity: 3 } },
    missionContext,
  );
    if (
      receipt.schema !== "securedme.education.algorithm-builder.algorithm-artifact-receipt.v1" ||
      !receipt.artifact_digest.startsWith("sha256:") ||
      receipt.raw_secret_stored !== false ||
      receipt.capability_refs.includes("force-block") === false ||
      receipt.character_sheet.inventory_refs.includes("force-token") === false ||
      receipt.deterministic_die.result < 1 ||
      receipt.deterministic_die.result > 6 ||
      receipt.mission_id !== missionEnvelope.adaptation_id
    ) {
      console.error("Algorithm artifact receipt contract is invalid.");
      process.exit(1);
    }
})().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

for (const modulePath of [
  "./algoquestQbitAdapter.js",
  "./components.js",
  "./accessibility.js",
  "./onboarding.js",
]) {
  if (!browserEntry.includes(modulePath)) {
    console.error(`Algorithm Builder browser entry must load ${modulePath}.`);
    process.exit(1);
  }
}

for (const forbidden of ["express", "pg", "redis", "app.listen", "./auth.js"]) {
  if (browserEntry.includes(forbidden)) {
    console.error(`Browser entry contains server dependency: ${forbidden}`);
    process.exit(1);
  }
}

for (const requiredDockerContract of [
  "COPY --from=builder /app/dist ./dist",
  "COPY --from=builder /app/server ./server",
  "ENV HOST=0.0.0.0",
  "http://localhost:3000/health",
]) {
  if (!dockerfile.includes(requiredDockerContract)) {
    console.error(`Dockerfile is missing runtime contract: ${requiredDockerContract}`);
    process.exit(1);
  }
}

const { createApp } = require("../server/index");
const server = createApp().listen(0, "127.0.0.1", async () => {
  try {
    const address = server.address();
    const response = await fetch(`http://127.0.0.1:${address.port}/health`);
    const body = await response.json();
    if (!response.ok || body.status !== "healthy") {
      throw new Error("Unexpected health response");
    }
    console.log("algorithm-builder-app smoke test passed");
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  } finally {
    server.close();
  }
});
