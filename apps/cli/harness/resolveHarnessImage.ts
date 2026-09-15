import { toHarnessDocImageUrl } from "./harnessBridge";

/**
 * Fetches the file an image shape names, for the Canvas's `resolveImage`.
 *
 * The request goes to the harness's own origin, where the Node side answers it
 * out of the document's directory (see createDocImageHandler): a `src` the
 * document may not name, or a file that is not there, comes back as a 404 and is
 * rejected here, which is what the canvas draws as an unresolved image.
 *
 * @param src - The raw `src` string from the doc, `/`-separated and relative to the document
 * @returns The file's bytes; rejects when the harness has nothing to serve for `src`
 */
export const resolveHarnessImage = async (src: string): Promise<Blob> => {
	const response = await fetch(toHarnessDocImageUrl(src));
	if (!response.ok) {
		throw new Error(
			`the harness has no image for "${src}" (${response.status})`,
		);
	}
	return await response.blob();
};
