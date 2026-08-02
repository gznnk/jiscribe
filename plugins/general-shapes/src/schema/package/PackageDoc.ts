import type { CreateObjectType, ObjectFeatures } from "@workspace/canvas/doc";
import {
	AUTO_COLOR,
	BELOW_LABEL_STYLE_DEFAULTS,
} from "@workspace/canvas/unstable-doc";

/**
 * An isometric box, used for libraries, build artifacts and deployment units.
 *
 * It adopts rect geometry (x/y/width/height) and only swaps the rendering. This
 * lets it reuse Frame-based transforms and connector outline connections with
 * the same mechanism as Rect. The text is drawn as a label below the box, auto-sized to the text itself, so it stays readable at any box size.
 */
export const PackageFeatures = {
	type: "package",
	geometry: "rect",
	transform: true,
	stroke: true,
	fill: true,
	text: "body",
	connectable: true,
} as const satisfies ObjectFeatures;

/**
 * Where the isometric box's side edges start, as a fraction of the height from
 * the top (and, mirrored, from the bottom). Shared by the silhouette and the
 * outline.
 */
export const PACKAGE_SHOULDER_RATIO = 0.26;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const PackageDocBrand: unique symbol;

export type PackageDoc = CreateObjectType<
	typeof PackageFeatures,
	typeof PackageDocBrand
>;

export const PACKAGE_DOC_DEFAULTS: Omit<PackageDoc, "id"> = {
	type: "package",
	x: 0,
	y: 0,
	width: 110,
	height: 110,
	fill: "transparent",
	stroke: AUTO_COLOR,
	strokeWidth: 2,
	text: "",
	...BELOW_LABEL_STYLE_DEFAULTS,
} as const as PackageDoc;
