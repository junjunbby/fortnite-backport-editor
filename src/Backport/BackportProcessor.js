export class BackportProcessor {
  createReferencePatch(_targetAsset, targetReference, sourceReference) {
    if (!targetReference?.editable) {
      return { safe: false, reason: "Only embedded string references can be patched by this MVP." };
    }
    if (!sourceReference?.path) {
      return { safe: false, reason: "No source reference selected." };
    }
    const newLength = Buffer.byteLength(sourceReference.path, "latin1");
    if (newLength > targetReference.byteLength) {
      return {
        safe: false,
        reason: `Source reference is ${newLength} bytes but the target slot is ${targetReference.byteLength} bytes. Full reserialization is required.`
      };
    }
    return {
      safe: true,
      offset: targetReference.offset,
      byteLength: targetReference.byteLength,
      oldValue: targetReference.path,
      newValue: sourceReference.path
    };
  }
}
