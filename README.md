# Texpresso LSP

A simple Language Server Protocol implementation using the vscode-languageserver library with TypeScript support.

## Currently implemented features

- [x] Live preview
- [x] Inverse search (zed only)
- [ ] Forward search following cursor

## Purpose

This is an experimental implementation of a Language Server Protocol (LSP) server wrapping around [TeXpresso](https://github.com/let-def/texpresso) executable. See https://github.com/let-def/texpresso/issues/36.

This is a "cheap" nodeJS implementation for quick and easy testing.
This could potentially be rewritten in something other than TypeScript, but it is a pretty thin interface, where the JavaScript is not responsible for much and what it is responsible for (JSON parsing and manipulation) is stuff that is well suited to (in terms of performance and ergonomics).

## Setup

1. Install TeXpresso, more specifically it needs to be built from this branch: https://github.com/lnay/texpresso/tree/utf-8.
2. Make the `texpresso` executable available in your PATH.
3. Set up with editor with the following initialization options:
```jsonc
{
  "root_tex": "path/to/root.tex" // can be relative to the workspace root
  // ^ defaults to "main.tex" if not specified
}
```

## Generic npm package instructions

1. Install dependencies:
```bash
npm install
```

2. Build the TypeScript code:
```bash
npm run build
```

3. Run the server:
```bash
npm start
```

For development:
```bash
npm run dev
```
