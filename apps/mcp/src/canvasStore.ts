// The canvas file layer as the tools reach it. The layer itself is
// @jiscribe/doc-tools/file; runtime.ts, canvasFileLock.ts and server.ts call it
// through this module, so a test can stand in for one function with vi.mock.

import type { CanvasDoc } from "@jiscribe/doc";
import {
	CanvasFileError,
	isErrnoWithCode,
	loadCanvasFile as loadCanvasFileFromDisk,
	readCanvasFileText as readCanvasFileTextFromDisk,
	saveCanvasFile as saveCanvasFileWithOptions,
	type LoadedCanvasFile,
} from "@jiscribe/doc-tools/file";

export {
	CANVAS_FILE_EXTENSIONS,
	CanvasFileError,
	createEmptyCanvasDoc,
	ensureCanvasFile,
	toCanvasFilePath,
} from "@jiscribe/doc-tools/file";

/**
 * Re-throw a read failure on a path with no file behind it as one naming
 * open_canvas, the only tool that creates a canvas file; any other error passes
 * through unchanged.
 */
const pointMissingFileAtOpenCanvas = (
	filePath: string,
	error: unknown,
): never => {
	if (
		error instanceof CanvasFileError &&
		isErrnoWithCode(error.cause, "ENOENT")
	) {
		throw new CanvasFileError(
			`${filePath} does not exist yet; open_canvas creates it as an empty canvas (headless: true opens no window), then call this again`,
		);
	}
	throw error;
};

/**
 * Read and parse a canvas file (see loadCanvasFile in @jiscribe/doc-tools/file).
 *
 * @param path Absolute path, named as a canvas file
 * @throws CanvasFileError naming open_canvas when nothing is at the path
 */
export const loadCanvasFile = (path: string): Promise<LoadedCanvasFile> =>
	loadCanvasFileFromDisk(path).catch((error: unknown) =>
		pointMissingFileAtOpenCanvas(path, error),
	);

/**
 * Read a canvas file's text without validating it (see readCanvasFileText in
 * @jiscribe/doc-tools/file).
 *
 * @param path Absolute path, named as a canvas file
 * @throws CanvasFileError naming open_canvas when nothing is at the path
 */
export const readCanvasFileText = (path: string): Promise<string> =>
	readCanvasFileTextFromDisk(path).catch((error: unknown) =>
		pointMissingFileAtOpenCanvas(path, error),
	);

/**
 * Validate a CanvasDoc and write it back, refusing with what `diagnose_canvas`
 * would add (see saveCanvasFile in @jiscribe/doc-tools/file).
 *
 * @param path Absolute path, named as a canvas file
 * @param doc The CanvasDoc to write out
 * @param loaded The file as `doc` was loaded from it; omitted for a file being
 *   created
 */
export const saveCanvasFile = (
	path: string,
	doc: CanvasDoc,
	loaded?: LoadedCanvasFile,
): Promise<void> =>
	saveCanvasFileWithOptions(path, doc, {
		validatorName: "diagnose_canvas",
		loaded,
	});
