import fs from "node:fs/promises";
import path from "node:path";

export class Packager {
  async packageAssets(assets, outputRoot) {
    const copied = [];
    for (const asset of assets) {
      const packageRelative = this.toPackageRelative(asset);
      const outputPath = path.join(outputRoot, packageRelative);
      await fs.mkdir(path.dirname(outputPath), { recursive: true });
      await fs.copyFile(asset.filePath, outputPath);
      copied.push(outputPath);
      for (const sidecar of asset.companionFiles ?? []) {
        try {
          await fs.access(sidecar);
          const sidecarOut = path.join(path.dirname(outputPath), path.basename(sidecar));
          await fs.copyFile(sidecar, sidecarOut);
          copied.push(sidecarOut);
        } catch {
          // Optional sidecar is reported by validation.
        }
      }
    }
    return copied;
  }

  toPackageRelative(asset) {
    const gameIndex = asset.packagePath.toLowerCase().indexOf("/game/");
    const packagePath = gameIndex >= 0 ? asset.packagePath.slice(gameIndex + 1) : `Game/${asset.fileName}`;
    return packagePath.replaceAll("/", path.sep);
  }
}
