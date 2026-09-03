/**
 * JSON text of an empty canvas document — what a new file starts from, and what
 * an existing file with no content yet is treated as.
 */
export const EMPTY_CANVAS_DOC_JSON = JSON.stringify(
	{
		version: 1,
		root: [],
	},
	null,
	2,
);

/**
 * Convert a canvas file's raw text into the document source handed to the Webview.
 *
 * A file created empty in the Explorer (or by `touch`) holds no JSON to parse.
 * Reporting a syntax error there would make "create the file, then draw" a dead
 * end, so treat it as a new document. Nothing is written back for it: the file
 * stays empty on disk until the first edit commits.
 *
 * @param fileText - the file's current text; blank (empty or whitespace only)
 *   yields EMPTY_CANVAS_DOC_JSON
 * @returns re-indented JSON when the text parses, otherwise fileText unchanged
 *   so the Webview reports the syntax error itself
 */
export function toWebviewDocSource(fileText: string): string {
	if (fileText.trim() === "") {
		return EMPTY_CANVAS_DOC_JSON;
	}
	try {
		return JSON.stringify(JSON.parse(fileText), null, 2);
	} catch {
		return fileText;
	}
}
