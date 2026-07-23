import type { ObjectDoc } from "../base/ObjectDoc";
import type { ObjectFactory } from "../types/ObjectFactory";
import {
	numberOverride,
	pickSupportedDocDefaults,
} from "../types/ObjectFactory";

/** Minimal shape that DOC_DEFAULTS of Frame-family shapes (geometry: "rect" / top-left origin) must satisfy. */
type FrameDefaults = { width: number; height: number } & Record<
	string,
	unknown
>;

type FrameObjectFactoryOptions = {
	/**
	 * Whether drag-drawing from a two-point bounds is supported (default true).
	 * Shapes set to false (such as sticky) have no createDocFromBounds and are
	 * center-placed on click.
	 */
	supportsBounds?: boolean;
};

/**
 * Builds a `ObjectFactory` from DEFAULTS for Frame-family shapes
 * (geometry: "rect", top-left origin x/y/width/height). Consolidates shapes
 * such as rect / diamond / sticky whose creation logic differs only in the
 * defaults and whether bounds are supported.
 *
 * Center-based ellipses (cx/cy/rx/ry) are out of scope because their placement
 * calculation differs.
 */
export const createFrameObjectFactory = (
	defaults: FrameDefaults,
	options: FrameObjectFactoryOptions = {},
): ObjectFactory => {
	const { supportsBounds = true } = options;

	const factory: ObjectFactory = {
		createDoc(position, overrides, docDefaults) {
			const width = numberOverride(overrides?.width, defaults.width);
			const height = numberOverride(overrides?.height, defaults.height);
			return {
				...defaults,
				...pickSupportedDocDefaults(defaults, docDefaults),
				...overrides,
				id: crypto.randomUUID(),
				x: position.x - width / 2,
				y: position.y - height / 2,
			} as unknown as ObjectDoc;
		},

		calcDimensions(overrides) {
			return {
				halfWidth: numberOverride(overrides?.width, defaults.width) / 2,
				halfHeight: numberOverride(overrides?.height, defaults.height) / 2,
			};
		},
	};

	if (supportsBounds) {
		factory.createDocFromBounds = (
			x1,
			y1,
			x2,
			y2,
			overrides,
			minSize = 5,
			docDefaults,
		) => {
			const width = Math.abs(x2 - x1);
			const height = Math.abs(y2 - y1);
			if (width < minSize || height < minSize) {
				return null;
			}
			return {
				...defaults,
				...pickSupportedDocDefaults(defaults, docDefaults),
				...overrides,
				id: crypto.randomUUID(),
				x: Math.min(x1, x2),
				y: Math.min(y1, y2),
				width,
				height,
			} as unknown as ObjectDoc;
		};
	}

	return factory;
};
