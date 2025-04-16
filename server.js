const { createConnection, TextDocuments, ProposedFeatures, TextDocumentSyncKind } = require('vscode-languageserver/node');
const { TextDocument } = require('vscode-languageserver-textdocument');

// Create a connection for the server
const connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager
const documents = new TextDocuments(TextDocument);

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// After the server has started the client sends an initialize request
connection.onInitialize(() => {
    return {
        capabilities: {
            textDocumentSync: TextDocumentSyncKind.Incremental,
            // Add other capabilities here as needed
        }
    };
});

// Handle text document changes
connection.on('textDocument/didChange', (changeEvent) => {
    const document = documents.get(changeEvent.textDocument.uri);
    if (!document) return;

    // Example: Generate some diagnostics based on the document content
    const diagnostics = generateDiagnostics(document);
    
    // Send the diagnostics to the client
    connection.sendDiagnostics({
        uri: document.uri,
        diagnostics
    });
});

// Example function to generate diagnostics
function generateDiagnostics(document) {
    const text = document.getText();
    const diagnostics = [];
    
    // Simple example: Check for lines that are too long (more than 80 characters)
    const lines = text.split('\n');
    lines.forEach((line, index) => {
        if (line.length > 80) {
            diagnostics.push({
                severity: 2, // Warning
                range: {
                    start: { line: index, character: 0 },
                    end: { line: index, character: line.length }
                },
                message: 'Line is too long (more than 80 characters)',
                source: 'texpresso-lsp'
            });
        }
    });

    return diagnostics;
}

// Listen on the connection
connection.listen(); 