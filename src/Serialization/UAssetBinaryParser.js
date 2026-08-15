import path from "node:path";
import { BinaryReader } from "./BinaryReader.js";

const PACKAGE_MAGIC = -1641380927;

export class UAssetBinaryParser {
  parse(buffer, filePath) {
    const reader = new BinaryReader(buffer);
    const warnings = [];
    const magic = reader.int32(0);
    if (magic !== PACKAGE_MAGIC) {
      throw new Error("Not a supported Unreal package: invalid package magic");
    }

    const summary = this.parseSummary(reader, buffer.length, warnings);
    const names = this.parseNameMap(reader, summary, warnings);
    const imports = this.parseImports(reader, summary, names, warnings);
    const exports = this.parseExports(reader, summary, names, imports, warnings);
    const embeddedReferences = this.findEmbeddedReferences(buffer);
    const references = this.combineReferences(imports, embeddedReferences);
    const companionFiles = this.findCompanionNames(filePath);

    return {
      id: filePath,
      filePath,
      fileName: path.basename(filePath),
      packagePath: this.inferPackagePath(filePath),
      objectName: exports[0]?.objectName ?? path.basename(filePath, path.extname(filePath)),
      assetType: exports[0]?.className ?? imports.find((entry) => entry.className)?.className ?? "Unknown",
      className: exports[0]?.className ?? "Unknown",
      size: buffer.length,
      summary,
      names,
      imports,
      exports,
      references,
      companionFiles,
      properties: this.toPropertyGroups(summary, names, imports, exports, references),
      warnings
    };
  }

  parseSummary(reader, fileSize, warnings) {
    const legacyFileVersion = reader.int32(8);
    const fileVersionUE4 = reader.int32(12);
    const fileVersionUE5 = reader.int32(16);
    const layout = this.detectSummaryLayout(reader, fileSize);
    if (!layout) {
      warnings.push("Could not identify this package summary layout; showing embedded references only.");
      return {
        legacyFileVersion,
        fileVersionUE4,
        fileVersionUE5,
        totalHeaderSize: 0,
        packageName: "Unknown",
        packageFlags: 0,
        nameCount: 0,
        nameOffset: 0,
        gatherableTextDataCount: 0,
        gatherableTextDataOffset: 0,
        exportCount: 0,
        exportOffset: 0,
        importCount: 0,
        importOffset: 0,
        dependsOffset: 0,
        summaryLayout: "unknown"
      };
    }

    const totalHeaderSize = layout.totalHeaderSize;
    const packageNameInfo = layout.packageNameInfo;
    let offset = layout.afterPackageName;
    const packageFlags = reader.uint32(offset);
    offset += 4;
    const nameCount = reader.int32(offset);
    const nameOffset = reader.int32(offset + 4);
    offset += 8;

    const localizationId = this.tryReadInlineString(reader, offset, fileSize);
    if (localizationId) {
      offset += localizationId.byteLength;
    }

    let gatherableTextDataCount = 0;
    let gatherableTextDataOffset = 0;
    try {
      gatherableTextDataCount = reader.int32(offset);
      gatherableTextDataOffset = reader.int32(offset + 4);
      offset += 8;
    } catch {
      warnings.push("Could not read gatherable text metadata from package summary.");
    }

    let exportCount = reader.int32(offset);
    let exportOffset = reader.int32(offset + 4);
    let importCount = reader.int32(offset + 8);
    let importOffset = reader.int32(offset + 12);
    let dependsOffset = reader.int32(offset + 16);

    if (!this.tableFits(fileSize, exportCount, exportOffset, 104) || !this.tableFits(fileSize, importCount, importOffset, 28)) {
      const tablePairs = this.findTablePairs(reader, offset, fileSize, nameOffset);
      const exportPair = tablePairs.find((pair) => this.tableFits(fileSize, pair.count, pair.offset, 104));
      const importPair = tablePairs.find((pair) => pair !== exportPair && this.tableFits(fileSize, pair.count, pair.offset, 28));
      exportCount = exportPair?.count ?? 0;
      exportOffset = exportPair?.offset ?? 0;
      importCount = importPair?.count ?? 0;
      importOffset = importPair?.offset ?? 0;
      dependsOffset = tablePairs.find((pair) => pair !== exportPair && pair !== importPair)?.offset ?? 0;
    }

    return {
      legacyFileVersion,
      fileVersionUE4,
      fileVersionUE5,
      totalHeaderSize,
      packageName: packageNameInfo.value,
      packageFlags,
      nameCount,
      nameOffset,
      gatherableTextDataCount,
      gatherableTextDataOffset,
      localizationId: localizationId?.value ?? "",
      exportCount,
      exportOffset,
      importCount,
      importOffset,
      dependsOffset,
      summaryLayout: layout.kind
    };
  }

  detectSummaryLayout(reader, fileSize) {
    const candidates = [40, 44, 48, 52, 56, 60, 64, 68, 72, 76, 80, 84, 88, 92];
    for (const offset of candidates) {
      try {
        const totalHeaderSize = reader.int32(offset);
        const packageNameInfo = reader.readFString(offset + 4);
        const afterPackageName = offset + 4 + packageNameInfo.byteLength;
        const nameCount = reader.int32(afterPackageName + 4);
        const nameOffset = reader.int32(afterPackageName + 8);
        if (
          totalHeaderSize >= 0 &&
          packageNameInfo.value.length > 0 &&
          nameCount >= 0 &&
          nameCount < 200000 &&
          nameOffset > 0 &&
          nameOffset < fileSize
        ) {
          return { kind: `detected@${offset}`, totalHeaderSize, packageNameInfo, afterPackageName };
        }
      } catch {
        // Try the next known summary boundary.
      }
    }
    return null;
  }

  findTablePairs(reader, startOffset, fileSize, nameOffset) {
    const pairs = [];
    for (let offset = startOffset; offset < Math.min(startOffset + 96, fileSize - 8); offset += 4) {
      const count = reader.int32(offset);
      const tableOffset = reader.int32(offset + 4);
      if (count >= 0 && count < 200000 && tableOffset >= nameOffset && tableOffset < fileSize) {
        pairs.push({ count, offset: tableOffset, sourceOffset: offset });
        if (pairs.length >= 3) break;
      }
    }
    return pairs;
  }

  tryReadInlineString(reader, offset, fileSize) {
    try {
      const text = reader.readFString(offset);
      const end = offset + text.byteLength;
      if (end > fileSize || text.value.length === 0 || text.value.length > 256) return null;
      if (!/^[A-Za-z0-9_.:-]+$/.test(text.value)) return null;
      return text;
    } catch {
      return null;
    }
  }

  tableFits(fileSize, count, offset, stride) {
    return count >= 0 && count < 200000 && offset >= 0 && offset <= fileSize && offset + count * stride <= fileSize;
  }

  parseNameMap(reader, summary, warnings) {
    const names = [];
    if (!summary.nameCount || !summary.nameOffset) return names;
    let offset = summary.nameOffset;
    for (let index = 0; index < summary.nameCount; index += 1) {
      try {
        const text = reader.readFString(offset);
        offset += text.byteLength;
        const flagsOrHash = reader.uint32(offset);
        offset += 4;
        names.push({ index, value: text.value, flagsOrHash });
      } catch (error) {
        warnings.push(`Name map stopped at ${index}: ${error.message}`);
        break;
      }
    }
    return names;
  }

  parseImports(reader, summary, names, warnings) {
    const imports = [];
    if (!summary.importCount || !summary.importOffset) return imports;
    let offset = summary.importOffset;
    for (let index = 0; index < summary.importCount; index += 1) {
      try {
        const classPackage = this.nameAt(names, reader.int32(offset));
        const className = this.nameAt(names, reader.int32(offset + 8));
        const outerIndex = reader.int32(offset + 16);
        const objectName = this.nameAt(names, reader.int32(offset + 20));
        imports.push({ index, classPackage, className, outerIndex, objectName, path: objectName });
        offset += 28;
      } catch (error) {
        warnings.push(`Import map stopped at ${index}: ${error.message}`);
        break;
      }
    }
    return imports;
  }

  parseExports(reader, summary, names, imports, warnings) {
    const exports = [];
    if (!summary.exportCount || !summary.exportOffset) return exports;
    let offset = summary.exportOffset;
    for (let index = 0; index < summary.exportCount; index += 1) {
      try {
        const classIndex = reader.int32(offset);
        const superIndex = reader.int32(offset + 4);
        const templateIndex = reader.int32(offset + 8);
        const outerIndex = reader.int32(offset + 12);
        const objectName = this.nameAt(names, reader.int32(offset + 16));
        const objectFlags = reader.uint32(offset + 24);
        const serialSize = reader.int64(offset + 28);
        const serialOffset = reader.int64(offset + 36);
        exports.push({
          index,
          classIndex,
          className: this.objectIndexName(classIndex, names, imports),
          superIndex,
          templateIndex,
          outerIndex,
          objectName,
          objectFlags,
          serialSize,
          serialOffset
        });
        offset += 104;
      } catch (error) {
        warnings.push(`Export map stopped at ${index}: ${error.message}`);
        break;
      }
    }
    return exports;
  }

  findEmbeddedReferences(buffer) {
    const refs = [];
    const seen = new Set();
    const pattern = /\/Game\/[A-Za-z0-9_./-]+/g;
    const text = buffer.toString("latin1");
    for (const match of text.matchAll(pattern)) {
      const value = match[0].replace(/\0.*$/, "");
      if (value.length < 7 || seen.has(`${value}:${match.index}`)) continue;
      seen.add(`${value}:${match.index}`);
      refs.push({
        kind: "EmbeddedString",
        value,
        path: value,
        offset: match.index,
        byteLength: Buffer.byteLength(value, "latin1"),
        editable: true
      });
    }
    return refs;
  }

  combineReferences(imports, embeddedReferences) {
    const importRefs = imports.map((entry) => ({
      kind: "Import",
      value: entry.objectName,
      path: entry.path,
      className: entry.className,
      editable: false
    }));
    return [...importRefs, ...embeddedReferences];
  }

  toPropertyGroups(summary, names, imports, exports, references) {
    const categories = [
      { name: "Package", rows: Object.entries(summary).map(([name, value]) => ({ name, type: typeof value, value })) },
      { name: "Names", rows: names.map((entry) => ({ name: `Name[${entry.index}]`, type: "FName", value: entry.value })) },
      { name: "Imports", rows: imports.map((entry) => ({ name: entry.objectName, type: entry.className, value: entry.classPackage })) },
      { name: "Exports", rows: exports.map((entry) => ({ name: entry.objectName, type: entry.className, value: `${entry.serialSize} bytes @ ${entry.serialOffset}` })) },
      { name: "References", rows: references.map((entry, index) => ({ name: `Reference[${index}]`, type: entry.kind, value: entry.path })) }
    ];
    return categories.filter((category) => category.rows.length > 0);
  }

  nameAt(names, index) {
    return names[index]?.value ?? `NameIndex(${index})`;
  }

  objectIndexName(index, names, imports = []) {
    if (index === 0) return "None";
    if (index < 0) return imports[Math.abs(index) - 1]?.objectName ?? `Import(${Math.abs(index) - 1})`;
    return names[index - 1]?.value ?? `Export(${index - 1})`;
  }

  inferPackagePath(filePath) {
    const normalized = filePath.replaceAll("\\", "/");
    const gameIndex = normalized.toLowerCase().lastIndexOf("/game/");
    if (gameIndex >= 0) return normalized.slice(gameIndex);
    const contentIndex = normalized.toLowerCase().lastIndexOf("/content/");
    if (contentIndex >= 0) return `/Game/${normalized.slice(contentIndex + 9)}`;
    return `/${path.basename(filePath)}`;
  }

  findCompanionNames(filePath) {
    const parsed = path.parse(filePath);
    return [".uexp", ".ubulk"].map((ext) => path.join(parsed.dir, `${parsed.name}${ext}`));
  }
}
