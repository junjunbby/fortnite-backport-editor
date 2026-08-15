import fs from "node:fs/promises";
import path from "node:path";

export class UAssetBinaryWriter {
  async saveReferencePatch(asset, patch, outputPath) {
    if (!patch.safe) {
      throw new Error(patch.reason ?? "Patch is not safe to serialize");
    }
    const buffer = await fs.readFile(asset.filePath);
    const encoded = Buffer.from(patch.newValue, "latin1");
    encoded.copy(buffer, patch.offset);
    if (encoded.length < patch.byteLength) {
      buffer.fill(0, patch.offset + encoded.length, patch.offset + patch.byteLength);
    }

    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.copyFile(asset.filePath, `${outputPath}.bak`);
    await fs.writeFile(outputPath, buffer);
    return outputPath;
  }
}
