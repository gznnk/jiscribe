import { collectCowChangedKeys } from "./cowObjects";
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

const imageSourceOf = (object: ObjectState | undefined): string | undefined =>
	object !== undefined && isImageState(object) ? object.src : undefined;

/**
 * Whether two object maps are known to name the same image files, decided from
 * the IDs a copy-on-write view wrote alone — what lets a drag frame skip
 * {@link collectStateImageSources}' full scan.
 *
 * @param objects - The newer map
 * @param previousObjects - The map last scanned
 * @returns true only when every written ID keeps its `src` (or stays a non-image); false when an image src changed, appeared or disappeared, and also when the maps share no backing Record and only a full scan could tell
 */
export const holdsSameImageSources = (
	objects: Record<string, ObjectState>,
	previousObjects: Record<string, ObjectState>,
): boolean => {
	const changedIds = collectCowChangedKeys(objects, previousObjects);
	if (changedIds === null) {
		return false;
	}
	for (const id of changedIds) {
		if (imageSourceOf(objects[id]) !== imageSourceOf(previousObjects[id])) {
			return false;
		}
	}
	return true;
};
