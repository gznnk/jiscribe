/**
 * The image files an `image` object may name, keyed by lower-cased extension.
 *
 * Every host reads this one list when it serves a file for an image `src`: a
 * host that hands out bytes for other extensions turns its resolver into a way
 * to read any file beside the `.jis`.
 */
const DOC_IMAGE_MIME_TYPES: Readonly<Record<string, string>> = {
	png: "image/png",
	jpg: "image/jpeg",
	jpeg: "image/jpeg",
	gif: "image/gif",
	webp: "image/webp",
	avif: "image/avif",
	bmp: "image/bmp",
	svg: "image/svg+xml",
};

/**
 * The MIME type an image `src` claims by its file extension.
 *
 * @param docRelativePath - The raw `src` string, or any `/`-separated path ending in the file name; only the extension of the last segment is read, case-insensitively
 * @returns The MIME type to serve the file as, or null when the last segment has no extension or the extension is not one an image object may name
 */
export const resolveDocImageMimeType = (
	docRelativePath: string,
): string | null => {
	const fileName = docRelativePath.slice(docRelativePath.lastIndexOf("/") + 1);
	const dotIndex = fileName.lastIndexOf(".");
	if (dotIndex === -1) {
		return null;
	}
	return (
		DOC_IMAGE_MIME_TYPES[fileName.slice(dotIndex + 1).toLowerCase()] ?? null
	);
};
