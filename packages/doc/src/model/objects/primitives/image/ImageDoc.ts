import type { CreateObjectType } from "../../types/CreateObjectType";
import type { ObjectFeatures } from "../../types/ObjectFeatures";

export const ImageFeatures = {
	type: "image",
	geometry: "rect",
	transform: true,
	// Unlike svg, an image is a node of the diagram rather than decoration, so
	// connectors may own it.
	connectable: true,
} as const satisfies ObjectFeatures;

/**
 * Fields specific to image objects.
 *
 * The bytes are not part of the document: `src` names a file that travels beside
 * the `.jis`, and the host resolves it at render time (the canvas `resolveImage`
 * prop). `width` / `height` are therefore required like every other box — the
 * layout has to hold up with no resolver present.
 */
export type ImageExtraDoc = {
	/**
	 * Path to the image file, relative to the directory the `.jis` lives in and
	 * inside it (see {@link import("../../../../file/docRelativePath").splitDocRelativePath}).
	 * Passed to the host untouched: the canvas neither resolves nor validates it.
	 */
	src: string;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const ImageDocBrand: unique symbol;

export type ImageDoc = CreateObjectType<
	typeof ImageFeatures,
	typeof ImageDocBrand,
	ImageExtraDoc
>;

/** Doc fields image carries beyond the ones its features imply (see ObjectDocDefinition.extraKeys). */
export const IMAGE_EXTRA_KEYS = [
	"src",
] as const satisfies readonly (keyof ImageDoc)[];
