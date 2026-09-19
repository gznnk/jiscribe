import { access, mkdir, readFile } from "node:fs/promises";
import { basename, dirname, isAbsolute, resolve } from "node:path";

import type { CanvasDoc, CanvasParseResult } from "@jiscribe/doc";

import {
	prepareAtomicWrite,
	readFileSnapshot,
	type FileIdentity,
} from "./atomicWrite";
import { canvasParser } from "./canvasDefinitions";
import { formatDiagnostics } from "./diagnosticReport";
import { findIntroducedErrors } from "./introducedErrors";
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

/** A canvas file as {@link loadCanvasFile} read it. */
export type LoadedCanvasFile = {
	/** The document the parser made of it. */
	doc: CanvasDoc;
	/**
	 * The file's text exactly as read, which is what a write-back compares its
	 * result against ({@link saveCanvasFile}).
	 */
	text: string;
	/**
	 * The file as it was when read. A write-back refuses to land once the file
	 * has changed from it ({@link saveCanvasFile}).
	 */
	identity: FileIdentity;
};

/**
 * Read the `.jis` at an absolute path and return it as a validated
 * CanvasDoc, together with the text it was parsed from.
 *
 * It goes through `canvasParser` (the authoritative validator, UI-independent and
 * plugin shapes included) at load time, so no modification is let near an invalid
 * file (appending to a broken doc would only spread how it is broken).
 */
export async function loadCanvasFile(path: string): Promise<LoadedCanvasFile> {
	const filePath = await toCanvasFilePath(path);

	let text: string;
	let identity: FileIdentity;
	try {
		const snapshot = await readFileSnapshot(filePath);
		text = snapshot.contents.toString("utf8");
		identity = snapshot.identity;
	} catch (error) {
		const reason = error instanceof Error ? error.message : String(error);
		throw new CanvasFileError(`failed to read file: ${reason}`);
	}

	const result = canvasParser.parse(text);
	if (result.kind !== "ok") {
		throw new CanvasFileError(
			`file is not a valid CanvasDoc:\n${formatParseResult(result)}`,
		);
	}

	return { doc: result.doc, text, identity };
}

/**
 * Validate a CanvasDoc and then write it back to the file.
 *
 * The modified document goes through `canvasParser` again, and an invalid one
 * fails with diagnostics instead of being written. This is what keeps a broken
 * `.jis` from being left behind. It then goes through the validator
 * `diagnose_canvas` runs, and a document carrying an error the file it was
 * loaded from did not is refused as well: the parser leaves properties the
 * schema forbids alone, so a tool writing one would otherwise succeed and leave
 * a file only diagnose rejects (see findIntroducedErrors).
 *
 * The replacement is atomic (`./atomicWrite`), so the watching host and outside
 * editors never see it half written. A file written since it was loaded, by a
 * writer that does not take our lock (an editor, another process), is not
 * written over: the write is refused and that change kept. The check sits right
 * before the rename and narrows the gap to it without closing it (see
 * PreparedAtomicWrite.commitIfUnchanged).
 *
 * @param path Absolute path to write to, named as a canvas file
 *   ({@link toCanvasFilePath}). The parent directory is created when missing
 * @param doc The CanvasDoc to write out
 * @param loaded The file as `doc` was loaded from it ({@link loadCanvasFile}):
 *   an error its text already carried is not held against the write, and the
 *   write is refused if the file has changed from it since. Omitted for a file
 *   being created, where any error refuses it and whatever is there is replaced
 * @throws CanvasFileError when the document is refused, the file changed after
 *   it was loaded, or the write fails; the file is left as it was
 */
export async function saveCanvasFile(
	path: string,
	doc: CanvasDoc,
	loaded?: LoadedCanvasFile,
): Promise<void> {
	const filePath = await toCanvasFilePath(path);
	const serialized = serializeCanvasFile(doc);

	const result = canvasParser.parse(serialized);
	if (result.kind !== "ok") {
		throw new CanvasFileError(
			`refused to write (resulting document is invalid):\n${formatParseResult(result)}`,
		);
	}

	const introducedErrors = findIntroducedErrors(loaded?.text, serialized);
	if (introducedErrors.length > 0) {
		throw new CanvasFileError(
			`refused to write (the edit would leave the file failing diagnose_canvas, which it did not before):\n${formatDiagnostics(introducedErrors)}`,
		);
	}

	await writeCanvasText(filePath, serialized, loaded?.identity);
}

/**
 * Writes a canvas file's text as it is, creating the parent directory when
 * missing. Validating it is the caller's business.
 *
 * @param expectedIdentity The file as it was read, which it must still be for
 *   the write to land. Omitted, whatever is there is replaced
 */
const writeCanvasText = async (
	filePath: string,
	text: string,
	expectedIdentity?: FileIdentity,
): Promise<void> => {
	let isCommitted: boolean;
	try {
		await mkdir(dirname(filePath), { recursive: true });
		const prepared = await prepareAtomicWrite(filePath, text);
		if (expectedIdentity === undefined) {
			await prepared.commit();
			isCommitted = true;
		} else {
			isCommitted = await prepared.commitIfUnchanged(expectedIdentity);
		}
	} catch (error) {
		const reason = error instanceof Error ? error.message : String(error);
		throw new CanvasFileError(`failed to write file: ${reason}`);
	}
	if (!isCommitted) {
		throw new CanvasFileError(
			`refused to write: ${filePath} was changed by something else while this edit was being made, and that change is kept. Read the file again and redo the edit`,
		);
	}
};

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
		// Not through saveCanvasFile: an empty canvas has nothing to validate, and
		// the schema validator's one-time compile would otherwise land on opening
		await writeCanvasText(
			filePath,
			serializeCanvasFile({ version: 1, root: [] }),
		);
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
			// Keeping unknown types unread and dropping unknown enum values pass
			// silently on the display and save routes, but are handed to the AI as a
			// diagnostic so it corrects itself (the policy is to have it fixed through
			// diagnostics rather than by the engine correcting it automatically).
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
