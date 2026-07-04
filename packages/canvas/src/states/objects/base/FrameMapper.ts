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
import type { ObjectDoc } from "../../../schemas/objects/base/ObjectDoc";
import type { TransformDoc } from "../../../schemas/objects/base/TransformDoc";
import type { ObjectFeatures } from "../../../schemas/objects/types/ObjectFeatures";
import { collectStyleKeys, pick } from "../utils/stylePassthrough";

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
