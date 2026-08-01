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
  "emitAlgoQuestLearningEvent",
  "raw_secret_stored",
]) {
  if (!adapter.includes(phrase)) {
    console.error(`Missing AlgoQuest adapter phrase: ${phrase}`);
    process.exit(1);
  }
}

if (!components.includes("Send to AlgoQuest") || !components.includes("emitAlgoQuestComponentEvent")) {
  console.error("Algorithm Builder does not expose the AlgoQuest user action hook.");
  process.exit(1);
}

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
