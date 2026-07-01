import type { Ellipse, Frame, Rect } from "@workspace/geometry";
import {
	convertEllipseToFrame,
	convertFrameToEllipse,
	convertFrameToRect,
	convertRectToFrame,
} from "@workspace/geometry";

import type { ObjectMapperType } from "./MapperTypes";
import { ObjectMapper } from "./ObjectMapper";
import type { ObjectState } from "./ObjectState";
import {
	mapTransformDocToState,
	mapTransformStateToDoc,
} from "./TransformMapper";
import type { TransformState } from "./TransformState";
import { FILL_STYLE_KEYS } from "../../../schemas/objects/base/FillStyleDoc";
import type { ObjectDoc } from "../../../schemas/objects/base/ObjectDoc";
import { RADIUS_STYLE_KEYS } from "../../../schemas/objects/base/RadiusStyleDoc";
import { STROKE_STYLE_KEYS } from "../../../schemas/objects/base/StrokeStyleDoc";
import { TEXT_STYLE_KEYS } from "../../../schemas/objects/base/TextStyleDoc";
import type { TransformDoc } from "../../../schemas/objects/base/TransformDoc";
import type { ObjectFeatures } from "../../../schemas/objects/types/ObjectFeatures";

/**
 * Collects the pass-through keys for the style groups enabled in `features`.
 * stroke / fill / text / radius share the same field names between Doc and State,
 * so they are direction-independent. geometry and transform are excluded here since
 * the converters (convert* / mapTransform*) rebuild them.
 */
const collectStyleKeys = (features: ObjectFeatures): readonly string[] => [
	...(features.stroke ? STROKE_STYLE_KEYS : []),
	...(features.fill ? FILL_STYLE_KEYS : []),
	...(features.text ? TEXT_STYLE_KEYS : []),
	...(features.radius ? RADIUS_STYLE_KEYS : []),
];

/** Extracts only the keys that `src` owns and that are included in the allow-list `keys`. */
const pick = (
	src: Record<string, unknown>,
	keys: readonly string[],
): Record<string, unknown> => {
	const out: Record<string, unknown> = {};
	for (const key of keys) {
		if (Object.prototype.hasOwnProperty.call(src, key)) {
			out[key] = src[key];
		}
	}
	return out;
};

/**
 * Generates a Doc↔State mapper from `features` for Frame-family objects
 * (shapes with geometry: "rect" | "ellipse" + transform).
 *
 * The only differences between Doc and State are the geometry and transform
 * representations. Everything else (stroke / fill / text / radius / svgText …) shares
 * the same names and types, so this mapper converts only geometry/transform and passes
 * the rest through by **explicitly picking them via an allow-list**.
 *
 * The picked keys are the style groups enabled in `features` (`collectStyleKeys`) plus
 * shape-specific `extraKeys` (such as svg's svgText). Because it is an allow-list,
 * runtime-only fields like id/parentId/minWidth cannot structurally leak into the Doc.
 * Each key array is bound to its corresponding type via `AssertExhaustiveKeys`, so
 * missing a field when one is added becomes a compile error.
 */
export const createFrameMapper = <
	TDoc extends ObjectDoc,
	TState extends ObjectState,
>(
	features: ObjectFeatures,
	extraKeys: readonly string[] = [],
): ObjectMapperType<TDoc, TState> => {
	const isEllipse = features.geometry === "ellipse";
	const passthroughKeys = [...collectStyleKeys(features), ...extraKeys];

	return {
		toState: (doc) => {
			const frame: Frame = isEllipse
				? convertEllipseToFrame(doc as unknown as Ellipse)
				: convertRectToFrame(doc as unknown as Rect);
			const transform: Partial<TransformState> = features.transform
				? mapTransformDocToState(doc as unknown as TransformDoc)
				: {};
			return {
				...ObjectMapper.toState(doc),
				...pick(doc as unknown as Record<string, unknown>, passthroughKeys),
				...frame,
				...transform,
			} as unknown as TState;
		},

		toDoc: (state) => {
			const geometry: Rect | Ellipse = isEllipse
				? convertFrameToEllipse(state as unknown as Frame)
				: convertFrameToRect(state as unknown as Frame);
			const transform: Partial<TransformDoc> = features.transform
				? mapTransformStateToDoc(state as unknown as TransformState)
				: {};
			return {
				...ObjectMapper.toDoc(state),
				...pick(state as unknown as Record<string, unknown>, passthroughKeys),
				...geometry,
				...transform,
			} as unknown as TDoc;
		},
	};
};
