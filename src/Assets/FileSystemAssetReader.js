import fs from "node:fs/promises";
import { UAssetBinaryParser } from "../Serialization/UAssetBinaryParser.js";

export class FileSystemAssetReader {
  constructor(parser = new UAssetBinaryParser()) {
    this.parser = parser;
  }

  async readAsset(filePath) {
    const buffer = await fs.readFile(filePath);
    return this.parser.parse(buffer, filePath);
  }
}
