# Texpresso LSP

A simple Language Server Protocol implementation using the vscode-languageserver library with TypeScript support.

## Currently implemented features

- [x] Live preview
- [x] Inverse search
- [ ] Forward search following cursor

## Purpose

This is an experimental implementation of a Language Server Protocol (LSP) server wrapping around [TeXpresso](https://github.com/let-def/texpresso) executable. See https://github.com/let-def/texpresso/issues/36.

This is a "cheap" nodeJS implementation for quick and easy testing.
However this could also still be fit for purpose in its final form since it is a pretty thin interface
where the JavaScript is not responsible for much and what it is responsible for (JSON parsing and manipulation) is stuff that is well suited to (in terms of performance and ergonomics).

## Setup

1. Install TeXpresso, more specifically it needs to be built from this branch: https://github.com/lnay/texpresso/tree/utf-8.
2. Make the `texpresso` executable available in your PATH, or make sure to specify its path in step 4.
3. Install the language server, either from this repo or just:
   ```bash
   npm install -g texpresso-lsp
   ```
4. Set up the editor to run the language server with `texpresso-lsp --stdio` with the following initialization options:
  ```jsonc
  {
    "root_tex": "path/to/root.tex", // can be relative to the workspace root
    // ^ defaults to "main.tex" if not specified
    "texpresso_path": "path/to/texpresso", // can be missed if texpresso is in PATH
    // command to open the editor at a given file and line number:
    "inverse_search": {
      "command": "zed",
      "arguments": ["%f:%l"],
      // %f and %l are placeholders for the file path and line number respectively
    }
  }
  ```
  For `zed`, just install the following extension instead of step 4 (and maybe 3 soon): https://github.com/lnay/zed-texpresso

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
