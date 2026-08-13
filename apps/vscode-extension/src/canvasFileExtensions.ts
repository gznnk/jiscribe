/**
 * File extensions recognized as Jiscribe canvas documents.
 *
 * `.jis` / `.jiscribe` are the canonical ones: an OS file association only ever
 * resolves the segment after the last dot, so the compound forms below can never
 * be registered with the shell. They stay supported for files created before the
 * single-segment extensions existed.
 *
 * Ordered longest-first so suffix matching strips the full extension rather than
 * stopping at a shorter one.
 */
export const CANVAS_FILE_EXTENSIONS = [
	".jiscribe.json",
	".jis.json",
	".jiscribe",
	".jis",
] as const;

/**
 * Extension used when creating a new canvas. Single-segment so the file can be
 * opened from the OS shell.
 */
export const DEFAULT_CANVAS_FILE_EXTENSION = ".jis";

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

/**
 * Strips a recognized canvas extension from a file name.
 *
 * @param fileName - file name to strip; returned unchanged when it has no
 *   recognized canvas extension
 * @returns the name without its canvas extension
 */
export function stripCanvasFileExtension(fileName: string): string {
	for (const extension of CANVAS_FILE_EXTENSIONS) {
		if (fileName.endsWith(extension)) {
			return fileName.slice(0, -extension.length);
		}
	}
	return fileName;
}
