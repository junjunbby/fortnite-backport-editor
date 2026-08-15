import test from "node:test";
import assert from "node:assert/strict";
import { UAssetBinaryParser } from "../src/Serialization/UAssetBinaryParser.js";
import { BackportProcessor } from "../src/Backport/BackportProcessor.js";

test("rejects non-uasset magic", () => {
  const parser = new UAssetBinaryParser();
  assert.throws(() => parser.parse(Buffer.alloc(64), "bad.uasset"), /invalid package magic/);
});

test("reference patch requires size-compatible embedded references", () => {
  const processor = new BackportProcessor();
  const patch = processor.createReferencePatch(
    {},
    { editable: true, offset: 10, byteLength: 20, path: "/Game/A" },
    { path: "/Game/B" }
  );
  assert.equal(patch.safe, true);
  assert.equal(patch.newValue, "/Game/B");

  const unsafe = processor.createReferencePatch(
    {},
    { editable: true, offset: 10, byteLength: 4, path: "/G/A" },
    { path: "/Game/LongerPath" }
  );
  assert.equal(unsafe.safe, false);
});
