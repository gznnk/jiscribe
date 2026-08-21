import { calcDrawBounds } from "./calcDrawBounds";
import { numberOverride } from "./numberOverride";
import type { ObjectDoc } from "../base/ObjectDoc";
import type { ObjectFactory } from "../types/ObjectFactory";

/**
 * Minimal shape that DOC_DEFAULTS of Frame-family shapes (geometry: "rect" / top-left origin)
 * must satisfy. Carrying `type` (and `meta`) from ObjectDoc keeps the assembled object
 * structurally an ObjectDoc once `id` is added, so the return needs no `unknown` hop.
 */
type FrameDefaults = Omit<ObjectDoc, "id"> & {
	width: number;
	height: number;
} & Record<string, unknown>;

type FrameObjectFactoryOptions = {
	/**
	 * Whether drag-drawing from a two-point bounds is supported (default true).
	 * Shapes set to false have no createDocFromBounds and are
	 * center-placed on click.
	 */
	supportsBounds?: boolean;
};

/**
 * Builds a `ObjectFactory` from DEFAULTS for Frame-family shapes
 * (geometry: "rect", top-left origin x/y/width/height). Consolidates shapes
 * such as rect / diamond / note whose creation logic differs only in the
 * defaults and whether bounds are supported.
 *
 * Center-based ellipses (cx/cy/rx/ry) are out of scope because their placement
 * calculation differs.
 *
 * @param defaults - The shape's DOC_DEFAULTS minus `id`; every created doc is a deep copy
 *   of it, so nested values (a record's text slots) are never shared between objects
 * @param options - Only `supportsBounds`, which decides whether the factory carries
 *   `createDocFromBounds` (default true)
 */
export const createFrameObjectFactory = (
	defaults: FrameDefaults,
	options: FrameObjectFactoryOptions = {},
): ObjectFactory => {
	const { supportsBounds = true } = options;

	const factory: ObjectFactory = {
		createDoc(position, overrides) {
			const width = numberOverride(overrides?.width, defaults.width);
			const height = numberOverride(overrides?.height, defaults.height);
			// Cloned because defaults and overrides are module-level constants: a nested
			// value shared between two created objects (a record's text slots) would let
			// an in-place edit of one rewrite the other.
			return structuredClone({
				...defaults,
				...overrides,
				id: crypto.randomUUID(),
				x: position.x - width / 2,
				y: position.y - height / 2,
			});
		},

		calcDimensions(overrides) {
			return {
				halfWidth: numberOverride(overrides?.width, defaults.width) / 2,
				halfHeight: numberOverride(overrides?.height, defaults.height) / 2,
			};
		},
	};

	if (supportsBounds) {
		factory.createDocFromBounds = (x1, y1, x2, y2, overrides, minSize) => {
			const bounds = calcDrawBounds(x1, y1, x2, y2, minSize);
			if (bounds === null) {
				return null;
			}
			// Cloned for the same reason as in createDoc.
			return structuredClone({
				...defaults,
				...overrides,
				id: crypto.randomUUID(),
				x: bounds.left,
				y: bounds.top,
				width: bounds.width,
				height: bounds.height,
			});
		};
	}

	return factory;
};
