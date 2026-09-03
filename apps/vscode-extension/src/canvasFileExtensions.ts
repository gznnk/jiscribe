/**
 * File extensions recognized as Jiscribe canvas documents.
 *
 * `.jis` / `.jiscribe` are the canonical ones: an OS file association only ever
 * resolves the segment after the last dot, so the compound forms below can never
 * be registered with the shell. They stay supported for files created before the
 * single-segment extensions existed.
 */
export const CANVAS_FILE_EXTENSIONS = [
	".jiscribe.json",
	".jis.json",
	".jiscribe",
	".jis",
] as const;

/**
 * Whether a path names a Jiscribe canvas document.
 *
 * @param fileName - file name or full path; only its suffix is inspected
 * @returns true for any extension in {@link CANVAS_FILE_EXTENSIONS}
 */
export function isCanvasFileName(fileName: string): boolean {
	return CANVAS_FILE_EXTENSIONS.some((extension) =>
		fileName.endsWith(extension),
	);
}
