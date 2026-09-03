import { access, mkdir, readFile } from "node:fs/promises";
import { dirname, isAbsolute } from "node:path";

import type { CanvasDoc, CanvasParseResult } from "@jiscribe/doc";

import { writeFileAtomically } from "./atomicWrite";
import { canvasParser } from "./canvasDefinitions";

/**
 * An error thrown by file I/O and validation, carrying a message that can be
 * returned to the AI as it is.
 */
export class CanvasFileError extends Error {}

/**
 * Read the file at an absolute path as a string.
 *
 * A stdio server's cwd is not guaranteed to match the workspace, so a relative
 * path is rejected. No validation is performed, so a caller that wants to
 * diagnose a broken file uses this one.
 */
export async function readCanvasFileText(path: string): Promise<string> {
	if (!isAbsolute(path)) {
		throw new CanvasFileError(
			`path must be an absolute path, but got: ${path}`,
		);
	}

	try {
		return await readFile(path, "utf8");
	} catch (error) {
		const reason = error instanceof Error ? error.message : String(error);
		throw new CanvasFileError(`failed to read file: ${reason}`);
	}
}

/**
 * Read the `.jis.json` at an absolute path and return it as a validated
 * CanvasDoc.
 *
 * It goes through `canvasParser` (the authoritative validator, UI-independent and
 * plugin shapes included) at load time, so no modification is let near an invalid
 * file (appending to a broken doc would only spread how it is broken).
 */
export async function loadCanvasFile(path: string): Promise<CanvasDoc> {
	const text = await readCanvasFileText(path);

	const result = canvasParser.parse(text);
	if (result.kind !== "ok") {
		throw new CanvasFileError(
			`file is not a valid CanvasDoc:\n${formatParseResult(result)}`,
		);
	}

	return result.doc;
}

/**
 * Validate a CanvasDoc and then write it back to the file.
 *
 * The modified document goes through `canvasParser` again, and an invalid one
 * fails with diagnostics instead of being written. This is what keeps a broken
 * `.jis.json` from being left behind.
 *
 * The replacement is atomic (`./atomicWrite`), so the watching host and outside
 * editors never see it half written.
 *
 * @param path Absolute path to write to. The parent directory is created when missing
 * @param doc The CanvasDoc to write out
 */
export async function saveCanvasFile(
	path: string,
	doc: CanvasDoc,
): Promise<void> {
	const serialized = serializeCanvasFile(doc);

	const result = canvasParser.parse(serialized);
	if (result.kind !== "ok") {
		throw new CanvasFileError(
			`refused to write (resulting document is invalid):\n${formatParseResult(result)}`,
		);
	}

	try {
		await mkdir(dirname(path), { recursive: true });
		await writeFileAtomically(path, serialized);
	} catch (error) {
		const reason = error instanceof Error ? error.message : String(error);
		throw new CanvasFileError(`failed to write file: ${reason}`);
	}
}

/**
 * Bring the target `.jis.json` into a state where it can be opened. A missing one
 * is created as an empty canvas; an existing one is only validated, its contents
 * untouched.
 *
 * Opening a broken file as it is shows nothing on screen and gives no clue why,
 * so an existing file is put through `canvasParser` here and made to throw.
 *
 * @param path Absolute path to the target file. The parent directory is created when missing
 * @returns true when newly created, false when it already existed
 */
export async function ensureCanvasFile(path: string): Promise<boolean> {
	if (!isAbsolute(path)) {
		throw new CanvasFileError(
			`path must be an absolute path, but got: ${path}`,
		);
	}

	try {
		await access(path);
	} catch {
		await saveCanvasFile(path, { version: 1, root: [] });
		return true;
	}

	await loadCanvasFile(path);
	return false;
}

/**
 * Serialize a CanvasDoc into formatted JSON text (tab indentation, trailing
 * newline).
 */
export function serializeCanvasFile(doc: CanvasDoc): string {
	return `${JSON.stringify(doc, null, "\t")}\n`;
}

/** Format a parse result into text readable by a human or an AI. */
export function formatParseResult(result: CanvasParseResult): string {
	switch (result.kind) {
		case "ok": {
			if (result.warnings.length === 0) {
				return "valid: true";
			}
			// Dropping unknown types and unknown enum values passes silently on the
			// display and save routes, but is handed to the AI as a diagnostic so it
			// corrects itself (the policy is to have it fixed through diagnostics rather
			// than by the engine correcting it automatically).
			const lines = result.warnings.map(
				(warning) => `- ${warning.path}: ${warning.message}`,
			);
			return `valid: true\n${result.warnings.length} warning(s):\n${lines.join("\n")}`;
		}
		case "syntax-error":
			return `valid: false\nsyntax error: ${result.message}`;
		case "structure-error":
		case "semantic-error": {
			const lines = result.diagnostics.map(
				(diagnostic) => `- ${diagnostic.path}: ${diagnostic.message}`,
			);
			return `valid: false\n${result.diagnostics.length} issue(s):\n${lines.join("\n")}`;
		}
		case "internal-error":
			return `valid: false\ninternal error: ${result.message}`;
	}
}
