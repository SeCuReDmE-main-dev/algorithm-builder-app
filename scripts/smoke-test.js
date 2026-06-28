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

console.log("algorithm-builder-app smoke test passed");
