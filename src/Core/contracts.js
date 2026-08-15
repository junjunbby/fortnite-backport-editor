export class IAssetReader {
  async readAsset(_filePath) {
    throw new Error("IAssetReader.readAsset is not implemented");
  }
}

export class IAssetWriter {
  async saveReferencePatch(_asset, _patch, _outputPath) {
    throw new Error("IAssetWriter.saveReferencePatch is not implemented");
  }
}

export class IAssetParser {
  parse(_buffer, _filePath) {
    throw new Error("IAssetParser.parse is not implemented");
  }
}

export class IReferenceResolver {
  resolve(_asset, _seasonIndex) {
    throw new Error("IReferenceResolver.resolve is not implemented");
  }
}

export class IDependencyResolver {
  buildGraph(_asset, _assetIndex) {
    throw new Error("IDependencyResolver.buildGraph is not implemented");
  }
}

export class IBackportProcessor {
  createReferencePatch(_targetAsset, _targetReference, _sourceReference) {
    throw new Error("IBackportProcessor.createReferencePatch is not implemented");
  }
}

export class IValidator {
  validate(_asset, _context) {
    throw new Error("IValidator.validate is not implemented");
  }
}

export class IPackager {
  async packageAssets(_assets, _outputRoot) {
    throw new Error("IPackager.packageAssets is not implemented");
  }
}
