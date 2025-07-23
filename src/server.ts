import {
    createConnection,
    TextDocuments,
    ProposedFeatures,
    TextDocumentSyncKind,
    TextDocumentChangeEvent,
    InitializeParams,
    InitializeResult,
    DidChangeTextDocumentParams,
    TextDocumentContentChangeEvent,
    DocumentHighlightParams,
    DocumentHighlight,
} from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";
import { ServerConfig, WorkspaceSettings } from "./types";
import { TexpressoProcessManager } from "./process-manager";
import { spawn } from "child_process";
import { URI } from "vscode-uri";

const defaultInitOpts: ServerConfig = {
    root_tex: "main.tex",
    texpresso_path: "texpresso", // assumes texpresso is in PATH
    inverse_search: {
        command: "zed",
        arguments: ["%f:%l"],
    },
};

const defaultWorkspaceSettings: WorkspaceSettings = {
    preview_follow_cursor: true,
};

const connection = {
    init_options: defaultInitOpts,
    workspace_config: defaultWorkspaceSettings,
    ...createConnection(ProposedFeatures.all),
};
const documents = new TextDocuments(TextDocument);
let texpressoProcess: TexpressoProcessManager;

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

connection.onInitialize(
    async (params: InitializeParams): Promise<InitializeResult> => {
        try {
            {
                // Get configuration from client when available
                let init_params;
                if ((init_params = params.initializationOptions)) {
                    connection.init_options.root_tex =
                        init_params.root_tex ?? defaultInitOpts.root_tex;
                    connection.init_options.texpresso_path =
                        init_params.texpresso_path ??
                        defaultInitOpts.texpresso_path;
                    connection.init_options.inverse_search =
                        init_params.inverse_search ??
                        defaultInitOpts.inverse_search;
                }
            }

            // Create process manager with config
            texpressoProcess = new TexpressoProcessManager(
                connection.init_options.texpresso_path,
                ["-json", "-lines"],
                connection.init_options.root_tex,
            );
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
                const path = data[0];
                const line = data[1];
                const command = connection.init_options.inverse_search.command;
                const subs_args =
                    connection.init_options.inverse_search.arguments.map(
                        (arg) => arg.replace("%f", path).replace("%l", line),
                    );
                connection.console.log(
                    `Executing inverse search command: ${connection.init_options.inverse_search.command} ${subs_args.join(" ")}`,
                );
                spawn(command, subs_args);
            });

            texpressoProcess.on("append-lines", (data) => {
                connection.console.log(
                    `Append lines received: ${JSON.stringify(data)}`,
                );
            });

            return {
                capabilities: {
                    textDocumentSync: TextDocumentSyncKind.Incremental,
                    documentHighlightProvider: true,
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

// Initialize workspace settings
connection.onInitialized(async () => {
    try {
        const config = await connection.workspace.getConfiguration();
        if (config) {
            connection.workspace_config.preview_follow_cursor =
                config.preview_follow_cursor ??
                defaultWorkspaceSettings.preview_follow_cursor;
            connection.console.log(
                `Initialized workspace settings: preview_follow_cursor = ${connection.workspace_config.preview_follow_cursor}`,
            );
        }
    } catch (error) {
        connection.console.error(
            `Failed to initialize configuration: ${error}`,
        );
    }
});

// Handle workspace configuration changes
connection.onDidChangeConfiguration(async (change) => {
    connection.console.log("Configuration changed");
    try {
        const config = change.settings;
        if (config && config.preview_follow_cursor !== undefined) {
            connection.workspace_config.preview_follow_cursor =
                config.preview_follow_cursor;
            connection.console.log(
                `Updated workspace settings: preview_follow_cursor = ${connection.workspace_config.preview_follow_cursor}`,
            );
        }
    } catch (error) {
        connection.console.error(`Failed to get configuration: ${error}`);
    }
});

documents.onDidOpen(async (event: TextDocumentChangeEvent<TextDocument>) => {
    const document = event.document;
    const uri = URI.parse(event.document.uri);
    const path = uri.path;
    const text = document.getText();

    connection.console.warn(`asking texpresso to open document: ${path}`);
    texpressoProcess.sendCommand("open", [path, text]);
});

documents.onDidSave(async (event: TextDocumentChangeEvent<TextDocument>) => {});

documents.onDidClose(async (event: TextDocumentChangeEvent<TextDocument>) => {
    const uri = URI.parse(event.document.uri);
    const path = uri.path;
    texpressoProcess.sendCommand("close", [path]);
});

connection.onDidChangeTextDocument(
    async (params: DidChangeTextDocumentParams) => {
        const document = documents.get(params.textDocument.uri); // can this be out of sync?
        if (!document) return;
        const path = URI.parse(params.textDocument.uri).path;
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

// Handle document highlight requests for preview_follow_cursor
connection.onDocumentHighlight(
    async (params: DocumentHighlightParams): Promise<DocumentHighlight[]> => {
        // Check if preview_follow_cursor is enabled
        if (!connection.workspace_config.preview_follow_cursor) {
            connection.console.log(
                "Document highlight ignored: preview_follow_cursor is disabled",
            );
            return [];
        }

        try {
            // Extract file path and line number
            const uri = URI.parse(params.textDocument.uri);
            const filePath = uri.path;
            const lineNumber = params.position.line + 1;

            connection.console.log(
                `Document highlight request: file=${filePath}, line=${lineNumber}`,
            );

            // Send synctex-forward command to texpresso process
            texpressoProcess.sendCommand("synctex-forward", [
                filePath,
                lineNumber,
            ]);

            connection.console.log(
                `Sent synctex-forward command: ${filePath} ${lineNumber}`,
            );
        } catch (error) {
            connection.console.error(
                `Error handling document highlight: ${error instanceof Error ? error.message : String(error)}`,
            );
        }

        // Return empty array since we're not providing actual highlights,
        // just using this as a trigger for the synctex-forward command
        return [];
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
