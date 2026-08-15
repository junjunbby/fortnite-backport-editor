import fs from "node:fs";
import path from "node:path";

export class ReferenceResolver {
  resolve(asset, seasonIndex) {
    return asset.references.map((reference) => {
      const candidate = this.resolvePackagePath(reference.path, seasonIndex);
      return {
        ...reference,
        exists: candidate ? fs.existsSync(candidate) : false,
        resolvedPath: candidate
      };
    });
  }

  resolvePackagePath(packagePath, seasonIndex) {
    if (!packagePath || !packagePath.startsWith("/Game/")) return null;
    for (const root of seasonIndex.roots) {
      const relative = packagePath.replace(/^\/Game\//, "").replaceAll("/", path.sep);
      const candidate = path.join(root, relative.endsWith(".uasset") ? relative : `${relative}.uasset`);
      if (fs.existsSync(candidate)) return candidate;
    }
    return null;
  }
}
