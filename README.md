# Hermit

A toy local coding agent. Sends a prompt to a local model via [Ollama](https://ollama.com) and streams the completion.

## Setup

1. Install and start [Ollama](https://ollama.com).
2. Pull the model (the model itself is **not** part of this repo — it's a ~4.7GB runtime dependency managed by Ollama, stored under `~/.ollama/models`):
   ```sh
   ollama pull qwen2.5:7b
   ```
3. Install deps and build:
   ```sh
   npm install
   npm run build
   npm link   # makes `hermit` available on your PATH
   ```

## Usage

```sh
hermit "write a bash one-liner to count lines in all .ts files"
```

During development you can skip the build step:

```sh
npm run dev -- "your prompt here"
```

## API examples

Self-contained demos of the Ollama JS API (see `src/examples.ts`):

```sh
hermit examples format        # constrain output to a JSON schema
hermit examples tools         # model calls a tool; we run it and loop
hermit examples format-tools  # tool loop with a schema-constrained final answer
hermit examples chat          # multi-turn conversation with history
```

> Tool calling needs an instruct-tuned model (`qwen2.5:7b`). The code-completion
> variant (`qwen2.5-coder`) emits tool calls as plain text rather than the
> structured `tool_calls` field, so native tool parsing won't fire.
