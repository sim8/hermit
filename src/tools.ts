import type { Tool } from "ollama";
import fs from "fs";
import path from "path";

export const TOOLS: Record<
  string,
  { spec: Tool; run: (args: any) => unknown }
> = {
  readFile: {
    spec: {
      type: "function",
      function: {
        name: "Read file",
        description: "Read a file by a given filename and return its contents",
        parameters: {
          type: "object",
          properties: {
            filename: {
              type: "string",
              description: "The name of the file to read",
            },
          },
          required: ["filename"],
        },
      },
    },
    run: ({ filename }: { filename: string }) => {
      const absPath = path.resolve(filename);
      return fs.readFileSync(absPath, "utf-8");
    },
  },
  editFile: {
    spec: {
      type: "function",
      function: {
        name: "Edit file",
        description:
          "Replaces first occurrence of oldStr with newStr in file. If oldStr is empty, create/overwrite file with newStr.",
        parameters: {
          type: "object",
          properties: {
            filename: {
              type: "string",
              description: "The name of the file to edit",
            },
            oldStr: {
              type: "string",
              description:
                "The text to search for and replace. Empty to create/overwrite the file",
            },
            newStr: {
              type: "string",
              description: "The text to replace oldStr with",
            },
          },
          required: ["filename", "oldStr", "newStr"],
        },
      },
    },
    run: ({
      filename,
      oldStr,
      newStr,
    }: {
      filename: string;
      oldStr: string;
      newStr: string;
    }) => {
      const absPath = path.resolve(filename);

      if (oldStr === "") {
        fs.writeFileSync(absPath, newStr, "utf-8");
        return { path: absPath, action: "created file" };
      }

      const original = fs.readFileSync(absPath, "utf-8");
      if (!original.includes(oldStr)) {
        return { path: absPath, action: "oldStr not found" };
      }

      fs.writeFileSync(absPath, original.replace(oldStr, newStr), "utf-8");
      return { path: absPath, action: "edited" };
    },
  },
  listFiles: {
    spec: {
      type: "function",
      function: {
        name: "List files",
        description: "List files and dirs in dir at given path",
        parameters: {
          type: "object",
          properties: {
            dirname: {
              type: "string",
              description: "The name of the dir to list files/dirs from",
            },
          },
          required: ["dirname"],
        },
      },
    },
    run: ({ dirname }: { dirname: string }) => {
      const dirContents = fs.readdirSync(dirname, { withFileTypes: true });
      return dirContents.map((item) => ({
        name: item.name,
        type: item.isDirectory() ? "dir" : "file",
      }));
    },
  },
};

// Look up and run a tool by name. Anything that throws — a bad filename, a
// permissions error — comes back as an { error } result so it can be fed to the
// model to retry from, rather than unwinding out of the chat loop and killing
// the process.
export async function runTool(name: string, args: unknown): Promise<unknown> {
  const tool = TOOLS[name];
  if (!tool) return { error: `unknown tool: ${name}` };

  try {
    return await tool.run(args);
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}
