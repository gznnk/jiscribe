// The canvas file layer as the tools reach it. The layer itself is
// @jiscribe/doc-tools/file; runtime.ts, canvasFileLock.ts and server.ts call it
// through this module, so a test can stand in for one function with vi.mock.

import type { CanvasDoc } from "@jiscribe/doc";
import {
	saveCanvasFile as saveCanvasFileWithOptions,
	type LoadedCanvasFile,
} from "@jiscribe/doc-tools/file";

export {
	CANVAS_FILE_EXTENSIONS,
	CanvasFileError,
	createEmptyCanvasDoc,
	ensureCanvasFile,
	loadCanvasFile,
	readCanvasFileText,
	toCanvasFilePath,
} from "@jiscribe/doc-tools/file";

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
