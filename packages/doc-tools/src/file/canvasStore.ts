import { access, mkdir, readFile } from "node:fs/promises";
import { basename, dirname, isAbsolute, resolve } from "node:path";

import type { CanvasDoc, CanvasParseResult } from "@jiscribe/doc";

import { formatDiagnostics } from "../formatDiagnostics";
import { getStandardCanvasParser } from "../standardCanvasParser";
import {
	prepareAtomicWrite,
	readFileSnapshot,
	type FileIdentity,
} from "./atomicWrite";
import { findIntroducedDiagnostics } from "./introducedDiagnostics";
import { realpathDeepestExisting } from "./realpathDeepestExisting";

/**
 * An error thrown by the canvas file functions here (path checks, file I/O and
 * validation), carrying a message fit to show as it is to whoever named the file.
 */
export class CanvasFileError extends Error {}

/**
 * The extensions a canvas document is allowed to carry. A path ending in none of
 * them is refused, so a caller handed the wrong file never rewrites it as a canvas.
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
 * Check a path as naming a canvas file and give back the form every caller works
 * from.
 *
 * This is the single gate every function here passes a path through. A relative
 * path is refused rather than resolved: the process's cwd need not be the
 * directory whoever wrote the path meant. The path is resolved through its
 * symbolic links, so anything a caller keys by it (a lock, an undo history) and
 * the file actually read and written are the same string for the same file
 * however it was spelled (`/tmp` against `/private/tmp`, a linked project
 * directory).
 *
 * @param path The path as given; must be absolute and end in one of
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
 * No validation of the contents is performed, so a caller that wants to diagnose
 * a broken file uses this one.
 *
 * @param path Named as a canvas file ({@link toCanvasFilePath}); the file must
 *   exist
 * @returns The text decoded as UTF-8, exactly as stored
 * @throws CanvasFileError when the path is refused or the file cannot be read
 */
export async function readCanvasFileText(path: string): Promise<string> {
	const filePath = await toCanvasFilePath(path);

	try {
		return await readFile(filePath, "utf8");
	} catch (error) {
		const reason = error instanceof Error ? error.message : String(error);
		throw new CanvasFileError(`failed to read file: ${reason}`, {
			cause: error,
		});
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
 * It goes through the canvas parser loaded with the shipped shape set (the one
 * `validateDoc` runs) at load time, so no modification is let near an
 * invalid file (appending to a broken doc would only spread how it is broken).
 * Warnings do not refuse the load; `doc` is then without what they report.
 *
 * @param path Named as a canvas file ({@link toCanvasFilePath}); the file must
 *   exist
 * @throws CanvasFileError when the path is refused, the file cannot be read, or
 *   its text does not parse (the message carries {@link formatParseResult})
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
		throw new CanvasFileError(`failed to read file: ${reason}`, {
			cause: error,
		});
	}

	const result = getStandardCanvasParser().parse(text);
	if (result.kind !== "ok") {
		throw new CanvasFileError(
			`file is not a valid CanvasDoc:\n${formatParseResult(result)}`,
		);
	}

	return { doc: result.doc, text, identity };
}

/** How {@link saveCanvasFile} is to treat the file it writes over. */
export type SaveCanvasFileOptions = {
	/**
	 * The name the caller's user knows the validation by (an MCP tool, a CLI
	 * command), put into the refusal message as it is: `refused to write (the edit
	 * would add this to what <validatorName> reports for the file)`.
	 */
	validatorName: string;
} & (
	| {
			/**
			 * The file as `doc` was loaded from it ({@link loadCanvasFile}): a
			 * finding its text already carried is not held against the write, and
			 * the write is refused if the file has changed from it since. Omitted
			 * for a file being created, where any finding refuses it and whatever
			 * is there is replaced.
			 */
			loaded?: LoadedCanvasFile;
			/** Not with `loaded`: a loaded file is one that exists. */
			isNewFile?: false;
	  }
	| {
			/** Not with `isNewFile`: a new file was loaded from nothing. */
			loaded?: undefined;
			/**
			 * For a file the caller found missing and is creating: the write is
			 * refused if something has appeared at the path since, rather than
			 * replacing it.
			 */
			isNewFile: true;
	  }
);

/**
 * Validate a CanvasDoc and then write it back to the file.
 *
 * The text about to be written goes through `validateDoc`, and a document
 * carrying any finding the file it was loaded from did not is refused with
 * diagnostics instead of being written. That covers an invalid document: the
 * file loaded through the same parser, so every error in the result is one the
 * edit introduced. This is what keeps a broken `.jis` from being left behind. A
 * warning is refused too: a field the parser only warns about is one it drops on
 * the next save, so a write carrying one would otherwise succeed and leave the
 * value to vanish. A finding counts as the one already there when it names the
 * same object id, property and complaint, wherever the object moved.
 *
 * The replacement is atomic ({@link prepareAtomicWrite}), so a watcher and
 * outside editors never see it half written. A file written since it was loaded,
 * by a writer outside the caller's own serialisation (an editor, another
 * process), is not written over: the write is refused and that change kept. The
 * check sits right before the rename and narrows the gap to it without closing it
 * (see PreparedAtomicWrite.commitIfUnchanged).
 *
 * @param path Absolute path to write to, named as a canvas file
 *   ({@link toCanvasFilePath}). The parent directory is created when missing
 * @param doc Serialised with {@link serializeCanvasFile}; it is that text that is
 *   validated and written
 * @param options The validator's name for the refusal message, and the file as
 *   `doc` was loaded from it
 * @throws CanvasFileError when the document is refused, the file changed after
 *   it was loaded, or the write fails; the file is left as it was
 */
export async function saveCanvasFile(
	path: string,
	doc: CanvasDoc,
	options: SaveCanvasFileOptions,
): Promise<void> {
	const filePath = await toCanvasFilePath(path);
	const serialized = serializeCanvasFile(doc);
	const { loaded, validatorName, isNewFile } = options;

	const introduced = findIntroducedDiagnostics(loaded?.text, serialized);
	if (introduced.length > 0) {
		throw new CanvasFileError(
			`refused to write (the edit would add this to what ${validatorName} reports for the file):\n${formatDiagnostics(introduced)}`,
		);
	}

	let expectedIdentity: FileIdentity | null | undefined;
	if (loaded !== undefined) {
		expectedIdentity = loaded.identity;
	} else if (isNewFile === true) {
		expectedIdentity = null;
	}
	await writeCanvasText(filePath, serialized, expectedIdentity);
}

/**
 * Writes a canvas file's text as it is, creating the parent directory when
 * missing. Validating it is the caller's business.
 *
 * @param expectedIdentity The file as it was read, which it must still be for
 *   the write to land; null when it was found missing and must still be.
 *   Omitted, whatever is there is replaced
 */
const writeCanvasText = async (
	filePath: string,
	text: string,
	expectedIdentity?: FileIdentity | null,
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
			expectedIdentity === null
				? `refused to write: ${filePath} was created by something else while this edit was being made, and that file is kept. Read it and redo the edit`
				: `refused to write: ${filePath} was changed by something else while this edit was being made, and that change is kept. Read the file again and redo the edit`,
		);
	}
};

/**
 * Bring the target `.jis` into a state where it can be opened. A missing one
 * is created as an empty canvas; an existing one is only validated, its contents
 * untouched.
 *
 * Opening a broken file as it is shows nothing on screen and gives no clue why,
 * so an existing file is put through {@link loadCanvasFile} here and made to
 * throw.
 *
 * @param path Absolute path to the target file, named as a canvas file
 *   ({@link toCanvasFilePath}). The parent directory is created when missing
 * @returns true when newly created, false when it already existed
 * @throws CanvasFileError when the path is refused, the file cannot be created,
 *   or the existing file does not parse
 */
export async function ensureCanvasFile(path: string): Promise<boolean> {
	const filePath = await toCanvasFilePath(path);

	try {
		await access(filePath);
	} catch {
		// Not through saveCanvasFile: an empty canvas has nothing to validate
		await writeCanvasText(
			filePath,
			serializeCanvasFile(createEmptyCanvasDoc()),
		);
		return true;
	}

	await loadCanvasFile(filePath);
	return false;
}

/**
 * A new, empty canvas document: what a missing file is started as. A fresh
 * object on every call, so the caller may edit the one it gets.
 */
export function createEmptyCanvasDoc(): CanvasDoc {
	return { version: 1, root: [] };
}

/**
 * Serialize a CanvasDoc into formatted JSON text (tab indentation, trailing
 * newline), the form every write here puts on disk.
 *
 * @param doc Written as `JSON.stringify` sees it, unvalidated; a key whose value
 *   is `undefined` is left out
 */
export function serializeCanvasFile(doc: CanvasDoc): string {
	return `${JSON.stringify(doc, null, "\t")}\n`;
}

/**
 * Format a parse result into text readable by a human or an AI.
 *
 * @param result What a canvas parser returned. Starts with `valid: true` for
 *   `ok` (followed by one line per warning, when there are any) and
 *   `valid: false` for every other kind
 */
export function formatParseResult(result: CanvasParseResult): string {
	switch (result.kind) {
		case "ok": {
			if (result.warnings.length === 0) {
				return "valid: true";
			}
			// Keeping unknown types unread and dropping unknown enum values pass
			// silently on the display and save routes, but are reported here so the
			// writer corrects the file itself rather than the engine doing it silently.
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
