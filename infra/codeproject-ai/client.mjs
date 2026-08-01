import { readFile, stat } from "node:fs/promises";
import { basename, dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

const SCHEMA = "securedme.codeproject.mesh.v1";
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const ERROR_CODES = new Set(["NODE_UNAVAILABLE", "MODULE_UNAVAILABLE", "TIMEOUT", "INVALID_INPUT", "MESH_DEGRADED"]);
const here = dirname(fileURLToPath(import.meta.url));

export class ConnectorError extends Error {
  constructor(code, message) {
    if (!ERROR_CODES.has(code)) throw new Error("unknown connector error code");
    super(message);
    this.code = code;
  }
}

async function nodeManifest() {
  return JSON.parse(await readFile(join(here, "node.json"), "utf8"));
}

async function baseUrl(explicit) {
  if (explicit) {
    const value = explicit.trim().replace(/\/$/, "");
    if (!/^https?:\/\//.test(value)) throw new ConnectorError("INVALID_INPUT", "base URL must use http or https");
    return value;
  }
  const node = await nodeManifest();
  return `http://127.0.0.1:${node.host_port}`;
}

async function request(path, { url, timeout = 8000, method = "GET", body, localOnly = false } = {}) {
  if (!(timeout > 0 && timeout <= 120000)) throw new ConnectorError("INVALID_INPUT", "timeout must be between 1 and 120000 ms");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(`${await baseUrl(url)}${path}`, {
      method,
      body,
      headers: { Accept: "application/json", "User-Agent": "securedme-cpai-mesh/1", ...(localOnly ? { "X-CPAI-Forwarded": "true" } : {}) },
      signal: controller.signal,
    });
    if (!response.ok) {
      const code = [404, 503].includes(response.status) ? "MODULE_UNAVAILABLE" : "NODE_UNAVAILABLE";
      throw new ConnectorError(code, `CodeProject.AI returned HTTP ${response.status}`);
    }
    const payload = await response.json();
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new ConnectorError("NODE_UNAVAILABLE", "invalid response envelope");
    return payload;
  } catch (error) {
    if (error instanceof ConnectorError) throw error;
    if (error?.name === "AbortError") throw new ConnectorError("TIMEOUT", "CodeProject.AI request timed out");
    throw new ConnectorError("NODE_UNAVAILABLE", "CodeProject.AI node is unavailable");
  } finally {
    clearTimeout(timer);
  }
}

async function envelope(status, data, error) {
  const node = await nodeManifest();
  const result = {
    schema: SCHEMA,
    status,
    request_id: randomUUID().replaceAll("-", ""),
    timestamp_utc: new Date().toISOString(),
    node_id: node.node_id,
    app_id: node.app_id,
  };
  if (data !== undefined) result.data = data;
  if (error) result.error = { code: error.code, message: error.message };
  return result;
}

export async function health(options = {}) {
  try {
    const payload = await request("/v1/server/status/ping", options);
    return envelope("success", { ready: payload.success === true, version: payload.message, hostname: payload.hostname });
  } catch (error) {
    return envelope("error", undefined, error);
  }
}

export async function capabilities(options = {}) {
  try {
    const payload = await request("/v1/module/list/status", options);
    const modules = (payload.statuses ?? []).filter((item) => item && typeof item === "object").map((item) => ({
      module_id: item.moduleId,
      name: item.name,
      version: item.version,
      status: item.status,
    }));
    return envelope("success", { modules });
  } catch (error) {
    return envelope("error", undefined, error);
  }
}

export async function meshStatus(options = {}) {
  try {
    const payload = await request("/v1/server/mesh/summary", options);
    const local = payload.localServer ?? {};
    const status = local.status ?? {};
    const peers = (payload.serverInfos ?? []).filter((item) => item && !item.isLocalServer);
    const data = {
      active: local.isActive === true,
      broadcasting: status.isBroadcasting === true,
      monitoring: status.isMonitoring === true,
      accept_forwarded: status.acceptForwardedRequests === true,
      allow_forwarding: status.allowRequestForwarding === true,
      known_hosts: (status.knownHostnames ?? []).length,
      active_peers: peers.filter((peer) => peer.isActive === true).length,
      peer_hostnames: peers.map((peer) => String(peer.callableHostname)).filter(Boolean).sort(),
    };
    data.mesh_degraded = !data.active || data.active_peers < data.known_hosts;
    return envelope(data.mesh_degraded ? "degraded" : "success", data);
  } catch (error) {
    return envelope("error", undefined, error);
  }
}

export async function detect(imagePath, options = {}) {
  try {
    const info = await stat(imagePath);
    if (!info.isFile() || info.size <= 0 || info.size > MAX_IMAGE_BYTES) throw new ConnectorError("INVALID_INPUT", "image size is outside the 1 byte to 20 MiB limit");
    const minConfidence = options.minConfidence ?? 0.4;
    if (!(minConfidence >= 0 && minConfidence <= 1)) throw new ConnectorError("INVALID_INPUT", "minConfidence must be between 0 and 1");
    const data = await readFile(imagePath);
    const form = new FormData();
    form.append("min_confidence", String(minConfidence));
    form.append("image", new Blob([data]), `fixture${extname(basename(imagePath))}`);
    const payload = await request("/v1/vision/detection", { ...options, timeout: options.timeout ?? 60000, method: "POST", body: form });
    if (payload.success !== true) throw new ConnectorError("MODULE_UNAVAILABLE", "YOLO detection module did not complete the request");
    const predictions = (payload.predictions ?? []).filter((item) => item && typeof item === "object").map((item) => ({
      label: item.label,
      confidence: item.confidence,
      x_min: item.x_min,
      y_min: item.y_min,
      x_max: item.x_max,
      y_max: item.y_max,
    }));
    return envelope("success", {
      success: payload.success === true,
      processed_by: payload.processedBy,
      inference_ms: payload.inferenceMs,
      analysis_round_trip_ms: payload.analysisRoundTripMs,
      predictions,
    });
  } catch (error) {
    return envelope("error", undefined, error instanceof ConnectorError ? error : new ConnectorError("INVALID_INPUT", "image file does not exist"));
  }
}

async function main() {
  const [operation, ...args] = process.argv.slice(2);
  const value = (name) => {
    const index = args.indexOf(name);
    return index >= 0 ? args[index + 1] : undefined;
  };
  const options = { url: value("--url"), timeout: Number(value("--timeout") ?? 15000), localOnly: args.includes("--local-only") };
  let result;
  if (operation === "health") result = await health(options);
  else if (operation === "capabilities") result = await capabilities(options);
  else if (operation === "mesh") result = await meshStatus(options);
  else if (operation === "detect") result = await detect(value("--image"), { ...options, minConfidence: Number(value("--min-confidence") ?? 0.4) });
  else result = await envelope("error", undefined, new ConnectorError("INVALID_INPUT", "operation must be health, capabilities, mesh, or detect"));
  process.stdout.write(`${JSON.stringify(result)}\n`);
  process.exitCode = ["success", "degraded"].includes(result.status) ? 0 : 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
