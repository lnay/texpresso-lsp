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
