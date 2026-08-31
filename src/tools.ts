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
