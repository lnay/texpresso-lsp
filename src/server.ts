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
import { TexpressoProcessManager } from './process-manager';
import { spawn } from 'child_process';

// Default server configuration
const defaultConfig: ServerConfig = {
    maxLineLength: 50,
    enableWarnings: true,
    customRules: []
};

// Create a connection for the server
const connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager
const documents = new TextDocuments(TextDocument);

// Create the texpresso process manager
const texpressoProcess = new TexpressoProcessManager();

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// After the server has started the client sends an initialize request
connection.onInitialize(async (params: InitializeParams): Promise<InitializeResult> => {
    try {
        // Start the texpresso process
        await texpressoProcess.start();
        connection.console.log('Texpresso process started successfully');

        // Set up process event handlers
        texpressoProcess.on('error', (error: Error) => {
            connection.console.error(`Texpresso process error: ${error.message}`);
        });

        texpressoProcess.on('exit', (data: { code: number | null; signal: NodeJS.Signals | null }) => {
            connection.console.log(`Texpresso process exited with code ${data.code} and signal ${data.signal}`);
        });

        texpressoProcess.on('synctex', (data) => {
            connection.console.log(`Synctex inverse search received: ${JSON.stringify(data)}`);
            const file = data[0];
            const line = data[1];
            const column = 1; // data[2];
            
            spawn("zed", [`${file}:${line}:${column}`]);
        });

        texpressoProcess.on('append-lines', (data) => {
            connection.console.log(`Append lines received: ${JSON.stringify(data)}`);
        });

        return {
            capabilities: {
                textDocumentSync: TextDocumentSyncKind.Incremental,
                // Add other capabilities here as needed
            }
        };
    } catch (error) {
        connection.console.error(`Failed to start texpresso process: ${error instanceof Error ? error.message : String(error)}`);
        throw error;
    }
});

// Handle text document changes
documents.onDidChangeContent(async (changeEvent: TextDocumentChangeEvent<TextDocument>) => {
    const document = changeEvent.document;
    if (!document) return;

    return;
});

// Handle server shutdown
connection.onShutdown(async () => {
    try {
        await texpressoProcess.stop();
        connection.console.log('Texpresso process stopped successfully');
    } catch (error) {
        connection.console.error(`Error stopping texpresso process: ${error instanceof Error ? error.message : String(error)}`);
    }
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