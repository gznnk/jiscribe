import { resolveDocImageMimeType, splitDocRelativePath } from "@jiscribe/doc";

import type { ImageRequestId, ImageResolvedMessage } from "../types/messages";

/**
 * The `image` shape's file resolution, minus VSCode: the path check, the MIME
 * decision, the base64 encoding and the response shape. resolveDocImage adapts
 * `vscode.workspace.fs` into the {@link DocImageReader} injected here so this
 * half can be unit-tested (the imageDocumentOps / JiscribeImageEditorProvider
 * split is the same arrangement).
 */

/** Reads the bytes of a file under the document's folder, given the `src` segments. */
export type DocImageReader = (
	segments: readonly string[],
) => Promise<Uint8Array>;

/** What resolveDocImageContent produced, ready to be put into an imageResolved message. */
export type DocImageContent =
	{ ok: true; base64: string; mimeType: string } | { ok: false; error: string };

/**
 * Read the image an `image` shape names and encode it for the Webview.
 *
 * Refuses a `src` that breaks the doc-relative rule (see splitDocRelativePath)
 * or names an extension the canvas cannot draw, and reports a failed read, all
 * as `{ ok: false }` — the Webview turns each into a rejected resolveImage so
 * the canvas shows the shape as unresolved rather than blank.
 *
 * @param src - the raw `src` string from the doc, relative to the document's folder and staying inside it
 * @param readImageFile - reads the named file's bytes; rejecting counts as "cannot be read" and its message is passed on
 * @returns the base64 bytes with their MIME type, or the reason the image is unavailable
 */
export async function resolveDocImageContent(
	src: string,
	readImageFile: DocImageReader,
): Promise<DocImageContent> {
	const segments = splitDocRelativePath(src);
	if (segments === null) {
		return {
			ok: false,
			error: `Image src must be a relative path inside the document's folder: "${src}"`,
		};
	}
	const mimeType = resolveDocImageMimeType(src);
	if (mimeType === null) {
		return {
			ok: false,
			error: `Unsupported image file type: "${src}"`,
		};
	}
	let bytes: Uint8Array;
	try {
		bytes = await readImageFile(segments);
	} catch (err) {
		const detail = err instanceof Error ? `: ${err.message}` : "";
		return { ok: false, error: `Could not read image "${src}"${detail}` };
	}
	return {
		ok: true,
		base64: Buffer.from(bytes).toString("base64"),
		mimeType,
	};
}

/**
 * Address a resolution to the request it answers.
 *
 * @param requestId - the id the Webview sent on resolveImage, echoed back verbatim; the Webview keys its pending requests by it
 * @param content - what resolveDocImageContent produced, success or failure
 * @returns the message to post to the Webview
 */
export function buildImageResolvedMessage(
	requestId: ImageRequestId,
	content: DocImageContent,
): ImageResolvedMessage {
	return content.ok
		? {
				type: "imageResolved",
				requestId,
				ok: true,
				base64: content.base64,
				mimeType: content.mimeType,
			}
		: { type: "imageResolved", requestId, ok: false, error: content.error };
}
