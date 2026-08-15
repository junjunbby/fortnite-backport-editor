import fs from "node:fs";

export class Validator {
  validate(asset, context = {}) {
    const issues = [];
    const ok = [];

    if (asset.summary?.nameCount >= 0) ok.push("Package summary parsed");
    if (asset.names?.length) ok.push("Name map parsed");
    if (asset.exports?.length) ok.push("Export table parsed");
    if (!asset.warnings?.length) ok.push("No parser warnings");
    for (const warning of asset.warnings ?? []) {
      issues.push({ severity: "warning", message: warning });
    }

    for (const sidecar of asset.companionFiles ?? []) {
      if (!fs.existsSync(sidecar)) {
        issues.push({ severity: "warning", message: `Missing optional sidecar: ${sidecar}` });
      }
    }

    if (context.resolvedReferences) {
      for (const reference of context.resolvedReferences) {
        if (reference.path?.startsWith("/Game/") && !reference.exists) {
          issues.push({ severity: "error", message: `Missing dependency: ${reference.path}` });
        }
      }
    }

    if (!asset.references.some((reference) => reference.editable)) {
      issues.push({ severity: "warning", message: "No size-preserving embedded references found for safe MVP editing." });
    }

    return { ok, issues, passed: !issues.some((issue) => issue.severity === "error") };
  }
}
