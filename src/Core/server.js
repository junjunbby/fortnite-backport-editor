import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SeasonProject } from "../Projects/SeasonProject.js";
import { FileSystemAssetReader } from "../Assets/FileSystemAssetReader.js";
import { ReferenceResolver } from "../References/ReferenceResolver.js";
import { DependencyResolver } from "../Dependencies/DependencyResolver.js";
import { BackportProcessor } from "../Backport/BackportProcessor.js";
import { Validator } from "../Validation/Validator.js";
import { Packager } from "../Packaging/Packager.js";
import { UAssetBinaryWriter } from "../Serialization/UAssetBinaryWriter.js";
import { FortniteClassifier } from "../Fortnite/FortniteClassifier.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const project = new SeasonProject();
const reader = new FileSystemAssetReader();
const referenceResolver = new ReferenceResolver();
const dependencyResolver = new DependencyResolver();
const backportProcessor = new BackportProcessor();
const validator = new Validator();
const packager = new Packager();
const writer = new UAssetBinaryWriter();
const classifier = new FortniteClassifier();
const cache = new Map();

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://127.0.0.1");
    if (url.pathname.startsWith("/api/")) {
      await handleApi(req, res, url);
      return;
    }
    await serveStatic(res, url.pathname);
  } catch (error) {
    sendJson(res, 500, { error: error.message });
  }
});

async function handleApi(req, res, url) {
  if (req.method === "POST" && url.pathname === "/api/project") {
    const body = await readJson(req);
    project.configure(body);
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/scan") {
    const body = await readJson(req);
    const assets = await project.scan(body.root);
    sendJson(res, 200, { assets });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/open") {
    const { filePath } = await readJson(req);
    const asset = await reader.readAsset(filePath);
    asset.assetType = classifier.classify(asset);
    cache.set(filePath, asset);
    sendJson(res, 200, { asset });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/compare") {
    const { targetPath, sourcePath } = await readJson(req);
    const target = cache.get(targetPath) ?? await reader.readAsset(targetPath);
    const source = cache.get(sourcePath) ?? await reader.readAsset(sourcePath);
    const rows = compareAssets(target, source);
    sendJson(res, 200, { target, source, rows });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/validate") {
    const { filePath, roots = [] } = await readJson(req);
    const asset = cache.get(filePath) ?? await reader.readAsset(filePath);
    const resolvedReferences = referenceResolver.resolve(asset, { roots });
    const result = validator.validate(asset, { resolvedReferences });
    const graph = dependencyResolver.buildGraph(asset, buildIndex([]));
    sendJson(res, 200, { result, resolvedReferences, graph });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/patch-reference") {
    const { targetPath, targetReference, sourceReference, outputPath } = await readJson(req);
    const target = cache.get(targetPath) ?? await reader.readAsset(targetPath);
    const patch = backportProcessor.createReferencePatch(target, targetReference, sourceReference);
    if (!patch.safe) {
      sendJson(res, 422, { patch });
      return;
    }
    const savedPath = await writer.saveReferencePatch(target, patch, outputPath);
    sendJson(res, 200, { patch, savedPath });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/package") {
    const { filePaths, outputRoot } = await readJson(req);
    const assets = [];
    for (const filePath of filePaths) {
      assets.push(cache.get(filePath) ?? await reader.readAsset(filePath));
    }
    const copied = await packager.packageAssets(assets, outputRoot);
    sendJson(res, 200, { copied });
    return;
  }

  sendJson(res, 404, { error: "Unknown API route" });
}

function compareAssets(target, source) {
  const targetRefs = target.references ?? [];
  const sourceRefs = source.references ?? [];
  const count = Math.max(targetRefs.length, sourceRefs.length);
  const rows = [];
  for (let index = 0; index < count; index += 1) {
    const left = targetRefs[index] ?? null;
    const right = sourceRefs[index] ?? null;
    rows.push({
      property: left?.kind ?? right?.kind ?? `Reference[${index}]`,
      target: left,
      source: right,
      different: (left?.path ?? "") !== (right?.path ?? "")
    });
  }
  return rows;
}

function buildIndex(assets) {
  return {
    byPackagePath: new Map(assets.map((asset) => [asset.packagePath.toLowerCase(), asset]))
  };
}

async function serveStatic(res, pathname) {
  const safeName = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const filePath = path.join(__dirname, "..", "UI", safeName);
  const normalizedRoot = path.join(__dirname, "..", "UI");
  if (!filePath.startsWith(normalizedRoot)) {
    sendJson(res, 403, { error: "Forbidden" });
    return;
  }
  const content = await fs.readFile(filePath);
  res.writeHead(200, { "Content-Type": contentType(filePath) });
  res.end(content);
}

function contentType(filePath) {
  if (filePath.endsWith(".css")) return "text/css";
  if (filePath.endsWith(".js")) return "text/javascript";
  return "text/html";
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

function sendJson(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body, null, 2));
}

const port = process.env.PORT ? Number(process.env.PORT) : 5179;
server.listen(port, "127.0.0.1", () => {
  console.log(`Fortnite UAsset Backport Editor running at http://127.0.0.1:${port}`);
});
