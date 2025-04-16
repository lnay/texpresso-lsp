# Texpresso LSP

A simple Language Server Protocol implementation using the vscode-languageserver library.

## Features

- Text document change handling
- Basic diagnostics (line length checking)

## Setup

1. Install dependencies:
```bash
npm install
```

2. Run the server:
```bash
npm start
```

## Implementation Details

The server currently implements:
- `textDocument/didChange` event handling
- Basic diagnostics that check for lines longer than 80 characters

## Extending

To add more capabilities, you can:
1. Add new capability declarations in the `onInitialize` handler
2. Implement new event handlers using `connection.on()`
3. Add new diagnostic rules in the `generateDiagnostics` function 