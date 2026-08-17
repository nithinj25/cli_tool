# sift

A streaming record processor for JSONL and CSV. Zero runtime dependencies.

## Setup

```bash
npm install
npm run build
npm run dev -- filter 'status == 500' data.jsonl
node dist/index.js --help
```

## Commands

- `filter <expr> [files...]`
- `stats [files...]`
- `head [files...]`

## Layout

- `src/index.ts` entrypoint and command registry
- `src/cli/*` argv parsing, help, and errors
- `src/core/*` source reading, formats, expressions, paths, and pipeline wiring
- `src/commands/*` command implementations
