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
import {
	createDebouncedValidator,
	type DebouncedValidator,
} from "./debouncedValidator";

// Plugin-aware parser: built-in types plus the shipped set, so canvas files using those
// shapes validate instead of reporting them unknown.
const canvasParser = createCanvasParser({ plugins: standardDocPlugins });

// Quiet period a changed document waits before it is re-validated. A person
// typing and an AI agent rewriting the file both produce a burst of change
// events, and only the text the burst ends on is worth parsing.
const VALIDATION_DEBOUNCE_MS = 300;

// Schemes whose documents are read-only stand-ins for a file, not the file
// itself: both sides of a git diff carry the working copy's name, so a `.jis`
// under review would otherwise be validated — and reported — a second time.
// Named individually rather than as an allow-list of editable schemes because
// this extension supports virtual workspaces (package.json's
// `capabilities.virtualWorkspaces`), where the scheme belongs to whichever
// filesystem provider is mounted and cannot be enumerated here.
const NON_EDITING_DOCUMENT_SCHEMES = new Set(["git", "gitlens", "vscode-scm"]);

// Where a diagnostic points when the text it refers to cannot be located:
// the start of the first line, widened enough to be visible (VSCode clamps it
// to the line, so a shorter or empty first line keeps its own length).
const FALLBACK_DIAGNOSTIC_RANGE = new vscode.Range(0, 0, 0, 10);

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
 * Runs when a file is opened, when its text changes, when it is saved, and for
 * files already open at activation; a file's diagnostics are removed when it
 * closes. Changes are what most of this extension's edits look like — an agent
 * rewriting the file on disk makes VSCode reload the document, and a canvas edit
 * is written back with a WorkspaceEdit — and neither raises a save event, so
 * validating on save alone left the panel showing the previous document.
 */
export class DiagnosticProvider {
	/** Diagnostics shown in VSCode's Problems panel. */
	private collection: vscode.DiagnosticCollection;

	/** Pending change-driven validations, keyed by `uri.toString()`. */
	private pendingValidations: DebouncedValidator;

	constructor(context: vscode.ExtensionContext) {
		// The collection name is shown as the Problems panel group name.
		this.collection =
			vscode.languages.createDiagnosticCollection("jiscribeCanvas");
		context.subscriptions.push(this.collection);

		// Keyed by URI string: the document object is looked up again when the timer
		// fires, so a run always parses the text the document holds by then.
		this.pendingValidations = createDebouncedValidator((documentKey) => {
			const document = vscode.workspace.textDocuments.find(
				(openDocument) => openDocument.uri.toString() === documentKey,
			);
			// The document may have closed since; its diagnostics are already gone.
			if (document !== undefined) {
				this.validateDocument(document);
			}
		}, VALIDATION_DEBOUNCE_MS);
		context.subscriptions.push({
			dispose: () => this.pendingValidations.dispose(),
		});

		// Re-validate on every save and open, and after a change settles.
		const saveListener = vscode.workspace.onDidSaveTextDocument((document) => {
			// Straight past the debounce: the panel has to be right the moment the
			// file lands on disk.
			this.pendingValidations.runNow(document.uri.toString());
		});
		const openListener = vscode.workspace.onDidOpenTextDocument((document) => {
			this.validateDocument(document);
		});
		const changeListener = vscode.workspace.onDidChangeTextDocument((event) => {
			// VSCode also raises this event with no content changes, for a document
			// that only turned dirty; its text is the one already validated.
			if (
				event.contentChanges.length === 0 ||
				!this.isValidationTarget(event.document)
			) {
				return;
			}
			this.pendingValidations.schedule(event.document.uri.toString());
		});
		// Drop a file's diagnostics when it closes, or a broken file's entry
		// would sit in the Problems panel until the window reloads.
		const closeListener = vscode.workspace.onDidCloseTextDocument(
			(document) => {
				this.pendingValidations.cancel(document.uri.toString());
				this.collection.delete(document.uri);
			},
		);
		context.subscriptions.push(
			saveListener,
			openListener,
			changeListener,
			closeListener,
		);

		// Validate tabs already open at activation.
		vscode.workspace.textDocuments.forEach((document) => {
			this.validateDocument(document);
		});
	}

	/** Whether a document is a canvas file this extension is editing, rather than a diff side. */
	private isValidationTarget(document: vscode.TextDocument): boolean {
		return (
			isCanvasFileName(document.fileName) &&
			!NON_EDITING_DOCUMENT_SCHEMES.has(document.uri.scheme)
		);
	}

	private validateDocument(document: vscode.TextDocument) {
		// Skip unrelated files.
		if (!this.isValidationTarget(document)) {
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
					FALLBACK_DIAGNOSTIC_RANGE,
					`[Jiscribe] Unexpected error during validation: ${result.message}`,
					vscode.DiagnosticSeverity.Error,
				);
				this.collection.set(document.uri, [diagnostic]);
				return;
			}
		}
	}

	/**
	 * Convert SemanticDiagnostic[] into VSCode Diagnostic[]. Highlights the
	 * location of each diagnostic's id when it has one, otherwise falls back to
	 * the top of the file.
	 */
	private renderDiagnostics(
		text: string,
		document: vscode.TextDocument,
		diagnostics: SemanticDiagnostic[],
	): vscode.Diagnostic[] {
		return diagnostics.map((diagnostic) => {
			const range = diagnostic.id
				? this.findIdRange(text, document, diagnostic.id)
				: FALLBACK_DIAGNOSTIC_RANGE;

			return new vscode.Diagnostic(
				range,
				`[Jiscribe] ${diagnostic.message} (${diagnostic.path})`,
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
		return FALLBACK_DIAGNOSTIC_RANGE;
	}
}
