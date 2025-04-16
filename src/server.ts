import {
    createConnection,
    TextDocuments,
    ProposedFeatures,
    TextDocumentSyncKind,
    Diagnostic,
    DiagnosticSeverity,
    Position,
    Range,
    TextDocumentChangeEvent,
    InitializeParams,
    InitializeResult
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import {
    CustomDiagnostic,
    DiagnosticTag,
    ServerConfig,
    CustomRule,
    AnalysisResult,
    DocumentStatistics,
    isCustomDiagnostic
} from './types';

// Default server configuration
const defaultConfig: ServerConfig = {
    maxLineLength: 80,
    enableWarnings: true,
    customRules: []
};

// Create a connection for the server
const connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager
const documents = new TextDocuments(TextDocument);

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// After the server has started the client sends an initialize request
connection.onInitialize((params: InitializeParams): InitializeResult => {
    return {
        capabilities: {
            textDocumentSync: TextDocumentSyncKind.Incremental,
            // Add other capabilities here as needed
        }
    };
});

// Handle text document changes
documents.onDidChangeContent((changeEvent: TextDocumentChangeEvent<TextDocument>) => {
    const document = changeEvent.document;
    if (!document) return;

    // Analyze the document and generate diagnostics
    const analysisResult = analyzeDocument(document, defaultConfig);
    
    // Send the diagnostics to the client
    connection.sendDiagnostics({
        uri: document.uri,
        diagnostics: analysisResult.diagnostics
    });
});

// Analyze document with TypeScript features
function analyzeDocument(document: TextDocument, config: ServerConfig): AnalysisResult {
    const text: string = document.getText();
    const lines: string[] = text.split('\n');
    const diagnostics: CustomDiagnostic[] = [];
    let longLines = 0;

    // Process each line with type-safe operations
    lines.forEach((line: string, index: number) => {
        if (line.length > config.maxLineLength) {
            longLines++;
            const range: Range = {
                start: Position.create(index, 0),
                end: Position.create(index, line.length)
            };

            const diagnostic: CustomDiagnostic = {
                severity: DiagnosticSeverity.Warning,
                range,
                message: `Line is too long (${line.length} characters, max ${config.maxLineLength})`,
                source: 'texpresso-lsp',
                code: 'line-too-long',
                tags: [DiagnosticTag.Unnecessary]
            };

            diagnostics.push(diagnostic);
        }
    });

    // Calculate document statistics
    const statistics: DocumentStatistics = {
        lineCount: lines.length,
        characterCount: text.length,
        longLines,
        averageLineLength: text.length / lines.length
    };

    return { diagnostics, statistics };
}

// Type-safe function to process custom rules
function processCustomRules(text: string, position: Position, rules: CustomRule[]): CustomDiagnostic[] {
    return rules
        .map(rule => rule.check(text, position))
        .filter((diagnostic): diagnostic is CustomDiagnostic => diagnostic !== null);
}

// Listen on the connection
connection.listen(); 