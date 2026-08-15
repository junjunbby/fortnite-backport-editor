const state = {
  lists: { source: [], target: [] },
  activeList: "target",
  category: "all",
  sourceAsset: null,
  targetAsset: null
};

const $ = (id) => document.getElementById(id);

for (const button of document.querySelectorAll(".tabs button")) {
  button.addEventListener("click", () => {
    document.querySelector(".tabs .active").classList.remove("active");
    button.classList.add("active");
    state.activeList = button.dataset.list;
    renderAssetList();
  });
}

for (const button of document.querySelectorAll(".category-grid button")) {
  button.addEventListener("click", () => {
    document.querySelector(".category-grid .active").classList.remove("active");
    button.classList.add("active");
    state.category = button.dataset.category;
    renderAssetList();
  });
}

$("scanSource").addEventListener("click", () => scan("source"));
$("scanTarget").addEventListener("click", () => scan("target"));
$("openTarget").addEventListener("click", () => openTyped("target"));
$("openSource").addEventListener("click", () => openTyped("source"));
$("compare").addEventListener("click", compare);
$("validate").addEventListener("click", validate);
$("package").addEventListener("click", packageTarget);
$("search").addEventListener("input", renderAssetList);

async function scan(kind) {
  const root = $(kind === "source" ? "sourceRoot" : "targetRoot").value.trim();
  if (!root) return setStatus(`Choose a ${kind} directory first.`);
  setStatus(`Scanning ${kind} assets...`);
  const data = await api("/api/scan", { root });
  state.lists[kind] = data.assets;
  state.activeList = kind;
  document.querySelector(".tabs .active").classList.remove("active");
  document.querySelector(`[data-list="${kind}"]`).classList.add("active");
  renderAssetList();
  setStatus(`Scanned ${data.assets.length} ${kind} files.`);
}

async function openTyped(kind) {
  const filePath = prompt(`Paste ${kind} .uasset path`);
  if (filePath) await openAsset(kind, filePath);
}

async function openAsset(kind, filePath) {
  setStatus(`Opening ${filePath}...`);
  const { asset } = await api("/api/open", { filePath });
  state[`${kind}Asset`] = asset;
  renderAsset(asset);
  setStatus(`Opened ${asset.fileName}.`);
}

async function compare() {
  if (!state.targetAsset || !state.sourceAsset) return setStatus("Open both a target and source asset first.");
  const data = await api("/api/compare", {
    targetPath: state.targetAsset.filePath,
    sourcePath: state.sourceAsset.filePath
  });
  renderCompare(data.rows);
  setStatus(`Compared ${state.targetAsset.fileName} with ${state.sourceAsset.fileName}.`);
}

async function validate() {
  const asset = state.targetAsset ?? state.sourceAsset;
  if (!asset) return setStatus("Open an asset before validation.");
  const roots = [$("targetRoot").value.trim(), $("sourceRoot").value.trim()].filter(Boolean);
  const data = await api("/api/validate", { filePath: asset.filePath, roots });
  renderValidation(data.result);
  renderGraph(data.graph);
  setStatus(data.result.passed ? "Validation passed." : "Validation found blocking issues.");
}

async function packageTarget() {
  if (!state.targetAsset) return setStatus("Open a target asset before packaging.");
  const outputRoot = prompt("Output folder", `${$("targetRoot").value.trim()}\\Output`);
  if (!outputRoot) return;
  const data = await api("/api/package", { filePaths: [state.targetAsset.filePath], outputRoot });
  setStatus(`Packaged ${data.copied.length} files.`);
}

async function patchReference(targetReference, sourceReference) {
  const parsed = state.targetAsset.filePath.match(/^(.*)(\.uasset)$/i);
  const outputPath = prompt("Save modified copy as", parsed ? `${parsed[1]}.modified${parsed[2]}` : `${state.targetAsset.filePath}.modified`);
  if (!outputPath) return;
  const data = await api("/api/patch-reference", {
    targetPath: state.targetAsset.filePath,
    targetReference,
    sourceReference,
    outputPath
  });
  setStatus(data.patch.safe ? `Saved modified copy: ${data.savedPath}` : data.patch.reason);
}

function renderAssetList() {
  const query = $("search").value.toLowerCase();
  const list = state.lists[state.activeList].filter((asset) => {
    const haystack = `${asset.name} ${asset.packagePath}`.toLowerCase();
    return haystack.includes(query) && matchesCategory(haystack, state.category);
  });
  $("assetList").innerHTML = list.map((asset) => `
    <button class="asset-row" data-path="${escapeHtml(asset.filePath)}">
      <span>${escapeHtml(asset.name)}</span>
      <small>${escapeHtml(asset.packagePath)}</small>
    </button>
  `).join("");
  for (const row of document.querySelectorAll(".asset-row")) {
    row.addEventListener("click", () => openAsset(state.activeList, row.dataset.path));
  }
}

function matchesCategory(haystack, category) {
  if (category === "all") return true;
  const rules = {
    items: ["item", "athena", "wid_", "cid_", "bid_", "eid_", "pickaxe", "glider"],
    weapons: ["weapon", "weaponstats", "athenaweapon", "wid_"],
    meshes: ["skeletalmesh", "staticmesh", "/meshes/", "sk_", "sm_"],
    materials: ["material", "mi_", "m_"],
    textures: ["texture", "texture2d", "t_"],
    sounds: ["sound", "soundwave", "soundcue", "/sounds/"],
    animations: ["anim", "animsequence", "montage", "/animations/"]
  };
  return rules[category]?.some((needle) => haystack.includes(needle)) ?? true;
}

function renderAsset(asset) {
  $("assetName").textContent = asset.objectName;
  $("assetMeta").textContent = `${asset.assetType} | ${asset.packagePath} | ${formatBytes(asset.size)}`;
  $("properties").classList.remove("empty");
  $("properties").innerHTML = asset.properties.map((group) => `
    <details class="group" open>
      <summary>${escapeHtml(group.name)} (${group.rows.length})</summary>
      ${group.rows.map((row) => `
        <div class="property-row">
          <span>${escapeHtml(row.name)}</span>
          <span class="muted">${escapeHtml(row.type)}</span>
          <span>${escapeHtml(String(row.value))}</span>
        </div>
      `).join("")}
    </details>
  `).join("");
}

function renderCompare(rows) {
  $("compareRows").classList.remove("empty");
  $("compareRows").innerHTML = rows.map((row, index) => `
    <div class="compare-row ${row.different ? "diff" : ""}">
      <div><strong>Target</strong><br>${escapeHtml(row.target?.path ?? "Missing")}</div>
      <div><strong>Source</strong><br>${escapeHtml(row.source?.path ?? "Missing")}</div>
      <button data-index="${index}" ${!row.target || !row.source ? "disabled" : ""}>Copy Source -> Target</button>
    </div>
  `).join("");
  document.querySelectorAll(".compare-row button").forEach((button) => {
    button.addEventListener("click", () => patchReference(rows[Number(button.dataset.index)].target, rows[Number(button.dataset.index)].source));
  });
}

function renderValidation(result) {
  $("validation").classList.remove("empty");
  $("validation").innerHTML = [
    ...result.ok.map((message) => `<div class="ok-line">OK ${escapeHtml(message)}</div>`),
    ...result.issues.map((issue) => `<div class="issue ${issue.severity}">${escapeHtml(issue.severity.toUpperCase())}: ${escapeHtml(issue.message)}</div>`)
  ].join("");
}

function renderGraph(node) {
  $("dependencyGraph").classList.remove("empty");
  $("dependencyGraph").innerHTML = renderGraphNode(node, 0);
}

function renderGraphNode(node, depth) {
  return `
    <div class="graph-node" style="margin-left:${depth * 14}px">
      ${escapeHtml(node.name)} <span class="muted">${escapeHtml(node.type)} / ${escapeHtml(node.status)}</span>
    </div>
    ${(node.children ?? []).map((child) => renderGraphNode(child, depth + 1)).join("")}
  `;
}

async function api(path, body) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? data.patch?.reason ?? "Request failed");
  return data;
}

function setStatus(message) {
  $("status").textContent = `Status: ${message}`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;"
  }[char]));
}

function formatBytes(size) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}
