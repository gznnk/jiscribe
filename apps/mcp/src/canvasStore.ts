import { access, mkdir, readFile } from "node:fs/promises";
import { basename, dirname, isAbsolute, resolve } from "node:path";

import type { CanvasDoc, CanvasParseResult } from "@jiscribe/doc";

import { writeFileAtomically } from "./atomicWrite";
import { canvasParser } from "./canvasDefinitions";
import { realpathDeepestExisting } from "./realpathDeepestExisting";

/**
 * An error thrown by file I/O and validation, carrying a message that can be
 * returned to the AI as it is.
 */
export class CanvasFileError extends Error {}

/**
 * The extensions a canvas document is allowed to carry. A path ending in none of
 * them is refused, so a tool given the wrong file never rewrites it as a canvas.
 */
export const CANVAS_FILE_EXTENSIONS = [
	".jis",
	".jis.json",
	".jiscribe",
	".jiscribe.json",
] as const;

/** Whether a path's file name carries a canvas extension and something before it */
const hasCanvasExtension = (path: string): boolean => {
	const fileName = basename(path).toLowerCase();
	return CANVAS_FILE_EXTENSIONS.some(
		(extension) =>
			fileName.endsWith(extension) && fileName.length > extension.length,
	);
};

/**
 * Check one tool argument as a canvas file path and give back the form every
 * caller works from.
 *
 * This is the single gate: a stdio server's cwd is not guaranteed to match the
 * workspace, so a relative path would name a different file for each caller and
 * is refused rather than resolved. Every tool taking a `path` runs it through
 * here, and the path is resolved through its symbolic links, so the lock key,
 * the undo history key and the file actually read and written are the same
 * string for the same file however it was spelled (`/tmp` against
 * `/private/tmp`, a linked project directory).
 *
 * @param path The path as the AI gave it; must be absolute and end in one of
 *   `.jis`, `.jis.json`, `.jiscribe` or `.jiscribe.json` (case is ignored). The
 *   file need not exist: the deepest existing ancestor is resolved and the rest
 *   joined back on (see realpathDeepestExisting)
 * @returns The resolved path. When the file is itself a link, this is where the
 *   link leads, so a write updates the target instead of replacing the link
 * @throws CanvasFileError when the path is relative, names another kind of file,
 *   leads through a link to another kind of file, or cannot be resolved (a link
 *   cycle, an unreadable directory)
 */
export async function toCanvasFilePath(path: string): Promise<string> {
	if (!isAbsolute(path)) {
		throw new CanvasFileError(
			`path must be an absolute path, but got: ${path}`,
		);
	}
	if (!hasCanvasExtension(path)) {
		throw new CanvasFileError(
			`path must name a canvas file (${CANVAS_FILE_EXTENSIONS.join(", ")}), but got: ${path}`,
		);
	}

	let canonicalPath: string;
	try {
		canonicalPath = await realpathDeepestExisting(resolve(path));
	} catch (error) {
		const reason = error instanceof Error ? error.message : String(error);
		throw new CanvasFileError(`failed to resolve path: ${reason}`);
	}
	// A link named like a canvas can lead anywhere; reading through it would put
	// the target's first line into the parse error, and writing would overwrite it.
	// The target is not named, so the refusal reveals nothing about it either
	if (!hasCanvasExtension(canonicalPath)) {
		throw new CanvasFileError(
			`path must name a canvas file (${CANVAS_FILE_EXTENSIONS.join(", ")}), but ${path} is a link to another kind of file`,
		);
	}
	return canonicalPath;
}

/**
 * Read the file at an absolute path as a string.
 *
 * The path goes through {@link toCanvasFilePath}. No validation of the contents
 * is performed, so a caller that wants to diagnose a broken file uses this one.
 */
export async function readCanvasFileText(path: string): Promise<string> {
	const filePath = await toCanvasFilePath(path);

	try {
		return await readFile(filePath, "utf8");
	} catch (error) {
		const reason = error instanceof Error ? error.message : String(error);
		throw new CanvasFileError(`failed to read file: ${reason}`);
	}
}

/**
 * Read the `.jis` at an absolute path and return it as a validated
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
 * `.jis` from being left behind.
 *
 * The replacement is atomic (`./atomicWrite`), so the watching host and outside
 * editors never see it half written.
 *
 * @param path Absolute path to write to, named as a canvas file
 *   ({@link toCanvasFilePath}). The parent directory is created when missing
 * @param doc The CanvasDoc to write out
 */
export async function saveCanvasFile(
	path: string,
	doc: CanvasDoc,
): Promise<void> {
	const filePath = await toCanvasFilePath(path);
	const serialized = serializeCanvasFile(doc);

	const result = canvasParser.parse(serialized);
	if (result.kind !== "ok") {
		throw new CanvasFileError(
			`refused to write (resulting document is invalid):\n${formatParseResult(result)}`,
		);
	}

	try {
		await mkdir(dirname(filePath), { recursive: true });
		await writeFileAtomically(filePath, serialized);
	} catch (error) {
		const reason = error instanceof Error ? error.message : String(error);
		throw new CanvasFileError(`failed to write file: ${reason}`);
	}
}

/**
 * Bring the target `.jis` into a state where it can be opened. A missing one
 * is created as an empty canvas; an existing one is only validated, its contents
 * untouched.
 *
 * Opening a broken file as it is shows nothing on screen and gives no clue why,
 * so an existing file is put through `canvasParser` here and made to throw.
 *
 * @param path Absolute path to the target file, named as a canvas file
 *   ({@link toCanvasFilePath}). The parent directory is created when missing
 * @returns true when newly created, false when it already existed
 */
export async function ensureCanvasFile(path: string): Promise<boolean> {
	const filePath = await toCanvasFilePath(path);

	try {
		await access(filePath);
	} catch {
		await saveCanvasFile(filePath, { version: 1, root: [] });
		return true;
	}

	await loadCanvasFile(filePath);
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
