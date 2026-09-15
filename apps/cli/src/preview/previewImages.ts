import type { CanvasDoc } from "@jiscribe/doc";
import { collectDocImageSources } from "@jiscribe/doc";

import { readDocImage, toDocImageDataUri } from "../docImages";

/** Every image the page carries, keyed by the `src` the document names it with. */
export type PreviewImageDataUris = Readonly<Record<string, string>>;

/** The images a preview page is written with, and what had to be left out of it. */
export type PreviewImages = {
	/** The table the page's resolver looks a `src` up in. */
	dataUris: PreviewImageDataUris;
	/**
	 * One line per `src` that could not be read, for the command to print. An
	 * image missing from the page is a silent hole in the drawing otherwise: the
	 * shape renders as unresolved and nothing says why.
	 */
	warnings: readonly string[];
};

/**
 * Reads every image a document names, for the page to carry as data URIs.
 *
 * The preview is one file that asks nothing of the machine opening it, so an
 * image cannot be fetched from beside it the way the render harness fetches one:
 * the bytes travel in the page or the shape cannot be drawn.
 *
 * @param doc - The validated document the page will mount; read but not modified
 * @param docDirPath - Directory the `.jis` sits in; every `src` is resolved against it and cannot leave it
 * @returns The table to bake into the page, and a warning per image left out of it — an unreadable image is left out rather than failing the command, since the rest of the drawing is still worth having
 */
export const collectPreviewImages = (
	doc: CanvasDoc,
	docDirPath: string,
): PreviewImages => {
	const dataUris: Record<string, string> = {};
	const warnings: string[] = [];
	for (const src of collectDocImageSources(doc)) {
		const image = readDocImage(docDirPath, src);
		if (image.ok) {
			dataUris[src] = toDocImageDataUri(image);
		} else {
			warnings.push(image.reason);
		}
	}
	return { dataUris, warnings };
};
