export class DependencyResolver {
  buildGraph(asset, assetIndex) {
    const children = asset.references.map((reference) => {
      const matched = assetIndex.byPackagePath.get(reference.path.toLowerCase());
      return {
        name: reference.path,
        type: reference.className ?? reference.kind,
        status: matched ? "found" : "missing",
        children: []
      };
    });
    return {
      name: asset.objectName,
      type: asset.assetType,
      status: "root",
      children
    };
  }
}
