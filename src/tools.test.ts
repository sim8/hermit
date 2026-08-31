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

test("listFiles returns files and folders in dir", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hermit-test-"));
  const file = path.join(dir, "hello.txt");
  fs.writeFileSync(file, "hello from hermit\n");
  const folder = path.join(dir, "someFolder");
  fs.mkdirSync(folder);

  try {
    const result = TOOLS.listFiles.run({ dirname: dir });
    assert.deepEqual(result, [
      {
        name: "hello.txt",
        type: "file",
      },
      {
        name: "someFolder",
        type: "dir",
      },
    ]);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("runTool returns an { error } result instead of throwing", async () => {
  const missing = await runTool("readFile", {
    filename: "definitely-not-a-real-file.txt",
  });
  assert.match((missing as { error: string }).error, /ENOENT/);

  const unknown = await runTool("noSuchTool", {});
  assert.deepEqual(unknown, { error: "unknown tool: noSuchTool" });
});

test("editFile replaces the first occurrence of oldStr", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hermit-test-"));
  const file = path.join(dir, "hello.txt");
  fs.writeFileSync(file, "one fish\ntwo fish\n");

  try {
    const result = TOOLS.editFile.run({
      filename: file,
      oldStr: "fish",
      newStr: "bird",
    });
    assert.deepEqual(result, { path: file, action: "edited" });
    assert.equal(fs.readFileSync(file, "utf-8"), "one bird\ntwo fish\n");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("editFile creates the file when oldStr is empty", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hermit-test-"));
  const file = path.join(dir, "new.txt");

  try {
    const result = TOOLS.editFile.run({
      filename: file,
      oldStr: "",
      newStr: "brand new\n",
    });
    assert.deepEqual(result, { path: file, action: "created file" });
    assert.equal(fs.readFileSync(file, "utf-8"), "brand new\n");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("editFile reports when oldStr is not found", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hermit-test-"));
  const file = path.join(dir, "hello.txt");
  fs.writeFileSync(file, "one fish\n");

  try {
    const result = TOOLS.editFile.run({
      filename: file,
      oldStr: "nope",
      newStr: "bird",
    });
    assert.deepEqual(result, { path: file, action: "oldStr not found" });
    assert.equal(fs.readFileSync(file, "utf-8"), "one fish\n");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
