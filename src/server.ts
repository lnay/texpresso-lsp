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
    InitializeResult,
    NotificationHandler,
    DidChangeTextDocumentParams,
    TextDocumentContentChangeEvent,
    DidOpenTextDocumentParams,
} from "vscode-languageserver/node";
import { TextDocument, DocumentUri } from "vscode-languageserver-textdocument";
import {
    CustomDiagnostic,
    DiagnosticTag,
    ServerConfig,
    CustomRule,
    AnalysisResult,
    DocumentStatistics,
} from "./types";
import { TexpressoProcessManager } from "./process-manager";
import { spawn } from "child_process";
import { join } from "path";

const defaultConfig: ServerConfig = {
    maxLineLength: 50,
    enableWarnings: true,
    customRules: [],
};

const connection = createConnection(ProposedFeatures.all);
const documents = new TextDocuments(TextDocument);
const texpressoProcess = new TexpressoProcessManager();

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

connection.onInitialize(
    async (params: InitializeParams): Promise<InitializeResult> => {
        try {
            await texpressoProcess.start();
            connection.console.info("Texpresso process started successfully");

            // Process event handlers
            texpressoProcess.on("error", (error: Error) => {
                connection.console.error(
                    `Texpresso process error: ${error.message}`,
                );
            });
            texpressoProcess.on("stderr", (error: Buffer) => {
                connection.console.error(`STDERR: ${error}`);
            });

            texpressoProcess.on(
                "exit",
                (data: {
                    code: number | null;
                    signal: NodeJS.Signals | null;
                }) => {
                    connection.console.error(
                        `EXITED: Texpresso process exited with code ${data.code} and signal ${data.signal}`,
                    );
                },
            );

            texpressoProcess.on("synctex", (data) => {
                connection.console.warn(
                    `Synctex inverse search received: ${JSON.stringify(data)}`,
                );
                spawn("zed", [`${data[0]}:${data[1]}:1`]);
            });

            texpressoProcess.on("append-lines", (data) => {
                connection.console.log(
                    `Append lines received: ${JSON.stringify(data)}`,
                );
            });

            return {
                capabilities: {
                    textDocumentSync: TextDocumentSyncKind.Incremental,
                },
            };
        } catch (error) {
            connection.console.error(
                `Failed to start texpresso process: ${error instanceof Error ? error.message : String(error)}`,
            );
            throw error;
        }
    },
);

documents.onDidChangeContent(
    async (changeEvent: TextDocumentChangeEvent<TextDocument>) => {
        const document = changeEvent.document;
        const path = document.uri.replace("file://", "");
        const text = document.getText();

        connection.console.warn(`asking texpresso to open document: ${path}`);
        texpressoProcess.sendCommand("open", [path, text]);
    },
);

documents.onDidOpen(async (event: TextDocumentChangeEvent<TextDocument>) => {
    const document = event.document;
    const path = document.uri.replace("file://", "");
    const text = document.getText();

    connection.console.warn(`asking texpresso to open document: ${path}`);
    texpressoProcess.sendCommand("open", [path, text]);
});

documents.onDidSave(async (event: TextDocumentChangeEvent<TextDocument>) => {});

documents.onDidClose(async (event: TextDocumentChangeEvent<TextDocument>) => {
    const path = event.document.uri.replace("file://", "");
    texpressoProcess.sendCommand("close", [path]);
});

connection.onDidChangeTextDocument(
    async (params: DidChangeTextDocumentParams) => {
        const document = documents.get(params.textDocument.uri); // can this be out of sync?
        if (!document) return;
        const path = params.textDocument.uri.replace("file://", "");
        params.contentChanges.forEach((change) => {
            if (TextDocumentContentChangeEvent.isIncremental(change)) {
                const change_data = [
                    path,
                    change.range.start.line,
                    change.range.start.character,
                    change.range.end.line,
                    change.range.end.character,
                    change.text,
                ];
                connection.console.warn(
                    `asking texpresso to change: ${path} at ${change.range.start.line}:${change.range.start.character} to ${change.range.end.line}:${change.range.end.character}`,
                );
                texpressoProcess.sendCommand("change-range", change_data);
            }
        });
    },
);

connection.onShutdown(async () => {
    try {
        await texpressoProcess.stop();
        connection.console.log("Texpresso process stopped successfully");
    } catch (error) {
        connection.console.error(
            `Error stopping texpresso process: ${error instanceof Error ? error.message : String(error)}`,
        );
    }
});

connection.listen();
