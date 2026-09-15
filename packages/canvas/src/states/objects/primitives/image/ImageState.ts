import {
	ImageFeatures,
	type ImageExtraDoc,
} from "@jiscribe/doc/model/objects/primitives/image/ImageDoc";

import type { CreateObjectState } from "../../types/CreateObjectState";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const ImageStateBrand: unique symbol;

export type ImageState = CreateObjectState<
	typeof ImageFeatures,
	typeof ImageStateBrand,
	ImageExtraDoc
>;

/**
 * Type guard for ImageState, used to pick the objects whose `src` has to be
 * resolved out of a whole state (see collectStateImageSources).
 *
 * @param value - Any object state, or anything at all
 * @returns True when the object is of type `image` and carries a string `src`
 */
export const isImageState = (value: unknown): value is ImageState =>
	typeof value === "object" &&
	value !== null &&
	"type" in value &&
	value.type === ImageFeatures.type &&
	"src" in value &&
	typeof value.src === "string";
