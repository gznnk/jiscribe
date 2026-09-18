import { constants as bufferConstants } from "node:buffer";

import { resolveDocImageMimeType, splitDocRelativePath } from "@jiscribe/doc";

import { describeErrorDetail } from "./describeErrorDetail";
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

/**
 * The most bytes whose base64 still fits in a JS string: the encoding grows 3
 * bytes into 4 characters, and a longer result makes toString("base64") throw
 * RangeError instead of returning anything.
 */
export const MAX_ENCODABLE_IMAGE_BYTES =
	Math.floor(bufferConstants.MAX_STRING_LENGTH / 4) * 3;

/** What resolveDocImageContent produced, ready to be put into an imageResolved message. */
export type DocImageContent =
	{ ok: true; base64: string; mimeType: string } | { ok: false; error: string };

/**
 * Read the image an `image` shape names and encode it for the Webview.
 *
 * Refuses a `src` that breaks the doc-relative rule (see splitDocRelativePath)
 * or names an extension the canvas cannot draw, and reports a failed read or a
 * file too big to encode ({@link MAX_ENCODABLE_IMAGE_BYTES}), all as
 * `{ ok: false }` — the Webview turns each into a rejected resolveImage so the
 * canvas shows the shape as unresolved rather than blank. Never rejects: the
 * answer is the only thing that settles the Webview's pending request.
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
	} catch (error) {
		const detail = describeErrorDetail(error);
		return { ok: false, error: `Could not read image "${src}"${detail}` };
	}
	if (bytes.length > MAX_ENCODABLE_IMAGE_BYTES) {
		return {
			ok: false,
			error: `Image "${src}" is too large to display: ${bytes.length} bytes, over the ${MAX_ENCODABLE_IMAGE_BYTES} that can be encoded`,
		};
	}
	let base64: string;
	try {
		base64 = Buffer.from(bytes).toString("base64");
	} catch (error) {
		// The size check above covers the length the encoder refuses; this catches
		// what is left (an allocation that fails on the way there), because the
		// caller voids this Promise and the Webview waits for the answer forever
		const detail = describeErrorDetail(error);
		return { ok: false, error: `Could not encode image "${src}"${detail}` };
	}
	return { ok: true, base64, mimeType };
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
