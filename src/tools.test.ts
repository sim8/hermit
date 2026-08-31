import { TOOLS, runTool } from "./tools.js";
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import os from "os";
import path from "path";

test("readFile returns the contents of a file", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hermit-test-"));
  const file = path.join(dir, "hello.txt");
  fs.writeFileSync(file, "hello from hermit\n");

  try {
    const result = TOOLS.readFile.run({ filename: file });
    assert.equal(result, "hello from hermit\n");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("runTool returns an { error } result instead of throwing", async () => {
  const missing = await runTool("readFile", { filename: "definitely-not-a-real-file.txt" });
  assert.match((missing as { error: string }).error, /ENOENT/);

  const unknown = await runTool("noSuchTool", {});
  assert.deepEqual(unknown, { error: "unknown tool: noSuchTool" });
});
