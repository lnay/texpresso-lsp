import { Diagnostic, Range, Position } from "vscode-languageserver/node";

// Custom diagnostic types
export interface CustomDiagnostic extends Diagnostic {
    code?: string;
    tags?: DiagnosticTag[];
}

export enum DiagnosticTag {
    Unnecessary = 1,
    Deprecated = 2,
}

// Configuration interface
export interface ServerConfig {
    root_tex: string;
    texpresso_path: string;
    inverse_search: {
        command: string;
        arguments: string[]; // use %f and %l as placeholders for file and line number
    };
}

// Workspace settings interface
export interface WorkspaceSettings {
    preview_follow_cursor: boolean;
}

// Custom rule interface
export interface CustomRule {
    name: string;
    severity: "error" | "warning" | "info";
    check: (text: string, position: Position) => CustomDiagnostic | null;
}

// Document analysis result
export interface AnalysisResult {
    diagnostics: CustomDiagnostic[];
    statistics: DocumentStatistics;
}

// Document statistics
export interface DocumentStatistics {
    lineCount: number;
    characterCount: number;
    longLines: number;
    averageLineLength: number;
}
