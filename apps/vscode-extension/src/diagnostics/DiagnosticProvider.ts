// Import the headless `./doc` entries, not the root ones (which pull in the Canvas
// component). This keeps UI deps (react / @emotion / katex) out of the Node bundle
// (extension.js) so activation stays light.
//
// `@jiscribe/standard-shapes/doc` brings the shipped shape set the same way: each
// plugin's own headless entry, importing only `@jiscribe/doc` /
// `@jiscribe/doc/unstable` (no React, and for markdown no markdown-it / KaTeX
// either — rendering lives in its presentation), so esbuild keeps the Node bundle small
// even though it validates plugin shapes too
// (packages/canvas/docs/12-plugin-architecture.md).
import { createCanvasParser, type SemanticDiagnostic } from "@jiscribe/doc";
import { standardDocPlugins } from "@jiscribe/standard-shapes/doc";
import * as vscode from "vscode";

import { isCanvasFileName } from "../canvasFileExtensions";

// Plugin-aware parser: built-in types plus the shipped set, so canvas files using those
// shapes validate instead of reporting them unknown.
const canvasParser = createCanvasParser({ plugins: standardDocPlugins });

/**
 * Surfaces canvas file semantic errors in VSCode's Problems panel.
 *
 * JSON syntax errors and schema-expressible structure errors (types, required
 * fields, enums, etc.) are already reported by the JSON schema registered via
 * package.json's `jsonValidation` (VSCode's built-in JSON language service), so
 * we skip them here to avoid duplicate diagnostics.
 *
 * This provider only handles errors the JSON schema cannot detect:
 *   - semantic errors (duplicate IDs, dangling references, etc.)
 *   - validator-only structure rules (both-ends-free, CSS-safe, etc., flagged
 *     with beyondSchema). Without these the file would be unopenable yet show
 *     no error.
 *
 * Runs when a file is opened, saved, or already open at activation; a file's
 * diagnostics are removed when it closes.
 */
export class DiagnosticProvider {
	/** Diagnostics shown in VSCode's Problems panel. */
	private collection: vscode.DiagnosticCollection;

	constructor(context: vscode.ExtensionContext) {
		// The collection name is shown as the Problems panel group name.
		this.collection =
			vscode.languages.createDiagnosticCollection("jiscribeCanvas");
		context.subscriptions.push(this.collection);

		// Re-validate on every save and open.
		const saveListener = vscode.workspace.onDidSaveTextDocument((doc) => {
			this.validateDocument(doc);
		});
		const openListener = vscode.workspace.onDidOpenTextDocument((doc) => {
			this.validateDocument(doc);
		});
		// Drop a file's diagnostics when it closes, or a broken file's entry
		// would sit in the Problems panel until the window reloads.
		const closeListener = vscode.workspace.onDidCloseTextDocument((doc) => {
			this.collection.delete(doc.uri);
		});
		context.subscriptions.push(saveListener, openListener, closeListener);

		// Validate tabs already open at activation.
		vscode.workspace.textDocuments.forEach((doc) => {
			this.validateDocument(doc);
		});
	}

	private validateDocument(document: vscode.TextDocument) {
		// Skip unrelated files.
		if (!isCanvasFileName(document.fileName)) {
			return;
		}

		const text = document.getText();

		// Clear the previous diagnostics before re-validating.
		this.collection.delete(document.uri);

		// parse() never throws; it returns a discriminated union.
		// Syntax errors and schema-expressible structure errors are left to the
		// JSON schema (see class doc); only validator-only rules are reported here.
		const result = canvasParser.parse(text);
		switch (result.kind) {
			case "ok":
				return;

			case "syntax-error":
				// Handled by VSCode's built-in JSON language service.
				return;

			case "structure-error": {
				// Report only validator-only rules; the JSON schema covers the rest.
				const beyondSchema = result.diagnostics.filter(
					(diag) => diag.beyondSchema,
				);
				if (beyondSchema.length === 0) {
					return;
				}
				this.collection.set(
					document.uri,
					this.renderDiagnostics(text, document, beyondSchema),
				);
				return;
			}

			case "semantic-error":
				this.collection.set(
					document.uri,
					this.renderDiagnostics(text, document, result.diagnostics),
				);
				return;

			case "internal-error": {
				// Surface unexpected errors at the top of the file rather than swallow them.
				const diagnostic = new vscode.Diagnostic(
					new vscode.Range(0, 0, 0, 0),
					`[Jiscribe] Unexpected error during validation: ${result.message}`,
					vscode.DiagnosticSeverity.Error,
				);
				this.collection.set(document.uri, [diagnostic]);
				return;
			}
		}
	}

	/**
	 * Convert SemanticDiagnostic[] into VSCode Diagnostic[]. Highlights diag.id's
	 * location when present, otherwise falls back to the top of the file.
	 */
	private renderDiagnostics(
		text: string,
		document: vscode.TextDocument,
		diagnostics: SemanticDiagnostic[],
	): vscode.Diagnostic[] {
		return diagnostics.map((diag) => {
			const range = diag.id
				? this.findIdRange(text, document, diag.id)
				: new vscode.Range(0, 0, 0, 10);

			return new vscode.Diagnostic(
				range,
				`[Jiscribe] ${diag.message} (${diag.path})`,
				vscode.DiagnosticSeverity.Error,
			);
		});
	}

	/**
	 * Locate the offending `"id"` field in the JSON text and return its Range.
	 *
	 * Matches `"id"\s*:\s*"<id>"` so only fields whose key is exactly "id" are
	 * targeted (a plain substring search would also hit `"abcdef"` for `"abc"`,
	 * or the value of `"parentId"`). When the same ID appears more than once
	 * (e.g. a duplicate-ID error), this points at the first occurrence; exact
	 * resolution would need parser-level position tracking.
	 *
	 * @param text     Full file text
	 * @param document VSCode document (used for offset→line/column conversion)
	 * @param id       ID string to locate
	 */
	private findIdRange(
		text: string,
		document: vscode.TextDocument,
		id: string,
	): vscode.Range {
		// Escape regex metacharacters (. * + ? etc.) that may appear in the ID.
		const escapedId = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

		// \s* allows whitespace around the key's colon.
		const regex = new RegExp(`"id"\\s*:\\s*"${escapedId}"`);
		const match = regex.exec(text);

		if (match) {
			// match.index is a character offset from the start of the file.
			const startPos = document.positionAt(match.index);
			const endPos = document.positionAt(match.index + match[0].length);
			return new vscode.Range(startPos, endPos);
		}

		// Fall back to the top of the file when no match is found.
		return new vscode.Range(0, 0, 0, 10);
	}
}
