# Texpresso LSP

A simple Language Server Protocol implementation using the vscode-languageserver library with TypeScript support.

## Features

- Text document change handling
- Basic diagnostics (line length checking)
- Full TypeScript support with type checking
- Type hints and annotations

## Setup

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

## Implementation Details

The server currently implements:
- `textDocument/didChange` event handling with proper TypeScript types
- Basic diagnostics that check for lines longer than 80 characters
- Type-safe implementation using TypeScript

## Extending

To add more capabilities, you can:
1. Add new capability declarations in the `onInitialize` handler
2. Implement new event handlers using `connection.on()`
3. Add new diagnostic rules in the `generateDiagnostics` function
4. Add new TypeScript interfaces and types for your features 