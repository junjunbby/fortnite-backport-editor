import fs from "node:fs/promises";
import path from "node:path";

const SUPPORTED_EXTENSIONS = new Set([".uasset", ".uexp", ".ubulk"]);

export class SeasonProject {
  constructor() {
    this.sourceRoots = [];
    this.targetRoots = [];
  }

  configure({ sourceRoots = [], targetRoots = [] }) {
    this.sourceRoots = sourceRoots.filter(Boolean);
    this.targetRoots = targetRoots.filter(Boolean);
  }

  async scan(root) {
    const files = [];
    await this.walk(root, files);
    return files.map((filePath) => ({
      filePath,
      name: path.basename(filePath),
      extension: path.extname(filePath).toLowerCase(),
      packagePath: this.inferPackagePath(filePath, root)
    }));
  }

  async walk(current, files) {
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const filePath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await this.walk(filePath, files);
      } else if (SUPPORTED_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
        files.push(filePath);
      }
    }
  }

  inferPackagePath(filePath, root) {
    const relative = path.relative(root, filePath).replaceAll(path.sep, "/");
    return `/Game/${relative}`;
  }
}
