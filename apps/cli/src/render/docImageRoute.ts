import { HARNESS_DOC_IMAGE_PATH } from "../../harness/harnessBridge";
import { readDocImage } from "../docImages";
import type { HarnessAsset } from "./harnessAssets";

/**
 * Serves the images the document names, out of the directory it sits in.
 *
 * Kept apart from the harness's own asset handler rather than made a branch of
 * it: what it answers with is not part of the built harness but the user's own
 * files, and it is wanted even when the harness has not been built.
 *
 * @param docDirPath - Directory of the input `.jis`; every `src` is resolved against it and cannot leave it
 * @param reportUnavailable - Told the reason once per `src` the page asked for and cannot be served (the harness mounts the document twice, so the page asks twice); the page draws a placeholder in its place, so without this the output would hide the gap
 * @returns A function taking the request URL and giving back what to answer with, or null for a URL that is not an image request, or whose `src` breaks the doc-relative rule, names an extension the canvas cannot draw, or is not there — all of which the caller answers as a 404
 */
export const createDocImageHandler = (
	docDirPath: string,
	reportUnavailable: (reason: string) => void,
): ((requestUrl: URL) => HarnessAsset | null) => {
	const reportedSources = new Set<string>();
	return (requestUrl) => {
		if (requestUrl.pathname !== HARNESS_DOC_IMAGE_PATH) {
			return null;
		}
		const src = requestUrl.searchParams.get("src");
		if (src === null) {
			return null;
		}
		const image = readDocImage(docDirPath, src);
		if (!image.ok) {
			if (!reportedSources.has(src)) {
				reportedSources.add(src);
				reportUnavailable(image.reason);
			}
			return null;
		}
		return { body: image.body, contentType: image.contentType };
	};
};
