// Import the parser-only entry, not the root entry (which pulls in the Canvas
// component). This keeps UI deps (react / @emotion / katex) out of the Node
// bundle (extension.js) so activation stays light.
//
// Deliberately NOT wired to @workspace/plugin-container-shapes/parser here: its
// schema (ContainerDoc.ts) imports AUTO_COLOR/DEFAULT_FONT_FAMILY from
// @workspace/canvas/unstable, and esbuild does not tree-shake that barrel
// module — bundling it drags the whole React + ObjectMenu UI kit into
// extension.js (verified: even a lone-constant import balloons the Node
// bundle by ~40k lines of React). container diagnostics therefore stay
// core-only for now (docs/05_extensibility/uc1-container-extraction-log.md).
import {
	parseCanvasText,
	type SemanticDiagnostic,
} from "@workspace/canvas/parser";
import * as vscode from "vscode";

/**
 * Surfaces .jis.json semantic errors in VSCode's Problems panel.
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
 * Runs when a file is opened, saved, or already open at activation.
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
		context.subscriptions.push(saveListener, openListener);

		// Validate tabs already open at activation.
		vscode.workspace.textDocuments.forEach((doc) => {
			this.validateDocument(doc);
		});
	}

	private validateDocument(document: vscode.TextDocument) {
		// Skip unrelated files.
		const validExts = [".jis.json", ".jiscribe.json"];
		if (!validExts.some((ext) => document.fileName.endsWith(ext))) {
			return;
		}

		const text = document.getText();

		// Clear the previous diagnostics before re-validating.
		this.collection.delete(document.uri);

		// parseCanvasText() never throws; it returns a discriminated union.
		// Syntax errors and schema-expressible structure errors are left to the
		// JSON schema (see class doc); only validator-only rules are reported here.
		const result = parseCanvasText(text);
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
