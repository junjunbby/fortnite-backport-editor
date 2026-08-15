export class BinaryReader {
  constructor(buffer) {
    this.buffer = buffer;
  }

  int32(offset) {
    this.ensure(offset, 4);
    return this.buffer.readInt32LE(offset);
  }

  uint32(offset) {
    this.ensure(offset, 4);
    return this.buffer.readUInt32LE(offset);
  }

  int64(offset) {
    this.ensure(offset, 8);
    return Number(this.buffer.readBigInt64LE(offset));
  }

  readFString(offset) {
    const length = this.int32(offset);
    const start = offset + 4;
    if (length === 0) return { value: "", byteLength: 4, encoding: "none", payloadOffset: start };
    if (length > 0) {
      this.ensure(start, length);
      const raw = this.buffer.subarray(start, start + Math.max(0, length - 1));
      return { value: raw.toString("utf8"), byteLength: 4 + length, encoding: "utf8", payloadOffset: start };
    }
    const codeUnits = Math.abs(length);
    this.ensure(start, codeUnits * 2);
    const raw = this.buffer.subarray(start, start + Math.max(0, codeUnits - 1) * 2);
    return { value: raw.toString("utf16le"), byteLength: 4 + codeUnits * 2, encoding: "utf16le", payloadOffset: start };
  }

  ensure(offset, length) {
    if (offset < 0 || offset + length > this.buffer.length) {
      throw new Error(`Read outside buffer at ${offset} (${length} bytes)`);
    }
  }
}
