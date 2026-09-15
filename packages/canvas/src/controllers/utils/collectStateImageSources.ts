import type { ObjectState } from "../../states/objects/base/ObjectState";
import { isImageState } from "../../states/objects/primitives/image/ImageState";

/**
 * The image files the canvas state draws, as the `src` strings it names them
 * with. The twin walking a `CanvasDoc` tree instead is `collectDocImageSources`
 * in `@jiscribe/doc`.
 *
 * The bytes live outside the document, so this is the list a host's
 * `resolveImage` is asked for (see useDocImages). The strings are passed on
 * untouched: whether one is a legal document-relative path is for whoever
 * resolves it to say.
 *
 * @param objects - The state's object map (`state.objects`); every entry is read, groups included, and children are entries of their own so nothing recurses
 * @returns Each distinct `src` once, in first-seen order; `[]` for a document that draws no image
 */
export const collectStateImageSources = (
	objects: Record<string, ObjectState>,
): string[] => {
	const sources = new Set<string>();
	for (const object of Object.values(objects)) {
		if (isImageState(object)) {
			sources.add(object.src);
		}
	}
	return [...sources];
};
