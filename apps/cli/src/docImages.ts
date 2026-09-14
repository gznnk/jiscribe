import { readFileSync } from "node:fs";
import { join } from "node:path";

import { resolveDocImageMimeType, splitDocRelativePath } from "@jiscribe/doc";

/**
 * The `image` shape's file resolution, shared by the two things that draw a
 * document here: the render harness, which fetches an image over the intercepted
 * harness origin, and the preview page, which carries its images as data URIs
 * because it has nothing beside it to fetch from.
 */

/** The file an image `src` named, or the reason it is not available. */
export type DocImageResult =
	| { ok: true; body: Buffer; contentType: string }
	| { ok: false; reason: string };

/**
 * Reads the file an image `src` names, relative to the document's own directory.
 *
 * @param docDirPath - Directory the `.jis` file sits in; `src` is resolved against it and cannot leave it
 * @param src - The raw `src` string from the doc, `/`-separated (see splitDocRelativePath for the rule it must follow)
 * @returns The bytes with the content type its extension claims, or the reason the image is unavailable: a `src` breaking the doc-relative rule, an extension the canvas cannot draw, or a file that cannot be read
 */
export const readDocImage = (
	docDirPath: string,
	src: string,
): DocImageResult => {
	const segments = splitDocRelativePath(src);
	if (segments === null) {
		return {
			ok: false,
			reason: `"${src}" is not a relative path inside the document's directory`,
		};
	}
	const contentType = resolveDocImageMimeType(src);
	if (contentType === null) {
		return {
			ok: false,
			reason: `"${src}" is not an image file type the canvas can draw`,
		};
	}
	try {
		return {
			ok: true,
			body: readFileSync(join(docDirPath, ...segments)),
			contentType,
		};
	} catch (error) {
		return {
			ok: false,
			reason: `cannot read "${src}": ${error instanceof Error ? error.message : String(error)}`,
		};
	}
};

/**
 * The same bytes as a `data:` URL, for a page that has to carry its images.
 *
 * @param image - A read image; its content type becomes the URL's media type
 * @returns The base64 `data:` URL, which `fetch` in a page turns back into a Blob
 */
export const toDocImageDataUri = (image: {
	body: Buffer;
	contentType: string;
}): string =>
	`data:${image.contentType};base64,${image.body.toString("base64")}`;
