import type { ObjectDoc } from "@jiscribe/doc/model/objects/base/ObjectDoc";
import type { TransformDoc } from "@jiscribe/doc/model/objects/base/TransformDoc";
import type { ObjectFeatures } from "@jiscribe/doc/model/objects/types/ObjectFeatures";
import {
	roundDocEllipse,
	roundDocRect,
} from "@jiscribe/doc/model/objects/utils/roundDocNumbers";
import type { Ellipse, Frame, Rect } from "@jiscribe/geometry";
import {
	convertEllipseToFrame,
	convertFrameToEllipse,
	convertFrameToRect,
	convertRectToFrame,
} from "@jiscribe/geometry";

import type { ObjectMapperType } from "./MapperTypes";
import { ObjectMapper } from "./ObjectMapper";
import type { ObjectState } from "./ObjectState";
import type { TextDocFields } from "./TextSlotsMapper";
import { mapTextDocToState, mapTextStateToDoc } from "./TextSlotsMapper";
import type { TextStyleState } from "./TextStyleState";
import {
	mapTransformDocToState,
	mapTransformStateToDoc,
} from "./TransformMapper";
import type { TransformState } from "./TransformState";
import { collectStyleKeys, pick } from "../utils/stylePassthrough";

/**
 * Generates a Doc↔State mapper from `features` for Frame-family objects
 * (shapes with geometry: "rect" | "ellipse" + transform).
 *
 * The differences between Doc and State are the geometry, the transform, and the text
 * group (whose styling sits flat on a `"body"` Doc but inside each slot in the State).
 * Everything else (stroke / fill / radius / svgText …) shares the same names and types, so
 * this mapper converts only those three and passes the rest through by **explicitly picking
 * them via an allow-list**.
 *
 * The picked keys are the style groups enabled in `features` (`collectStyleKeys`) plus
 * shape-specific `extraKeys` (such as svg's svgText). Because it is an allow-list,
 * runtime-only fields like id/parentId/minWidth cannot structurally leak into the Doc.
 * Each key array is bound to its corresponding type via `AssertExhaustiveKeys`, so
 * missing a field when one is added becomes a compile error.
 *
 * `features` is tied to `TDoc` through the `type` discriminator, so a call whose Doc, State,
 * and descriptor do not all name the same object type fails to compile. It is a discriminator
 * check, not a structural one: the style groups are not compared, which holds in practice
 * because each object type has exactly one feature descriptor.
 *
 * The body is one of the two places exempt from the double-cast ban (see eslint.config.js).
 * TypeScript cannot check it: `TDoc` / `TState` are unresolved inside a generic body, so the
 * conditional types the real Doc / State are built from never reduce, and the assembled object —
 * part `pick()` result typed as `Record<string, unknown>` — cannot be proven to cover them.
 * The round-trip test over every registered type covers this from the runtime side instead.
 *
 * @param features - Feature descriptor of the type being mapped. Its `type` must match
 *   `TDoc["type"]`, and its `geometry` must be a Frame family one (see `createPolyMapper`
 *   for poly shapes).
 * @param extraKeys - Shape-specific field names to pass through (non-style groups).
 */
export const createFrameMapper = <
	TDoc extends ObjectDoc,
	TState extends ObjectState & { type: TDoc["type"] },
>(
	features: ObjectFeatures & {
		type: TDoc["type"];
		geometry: "rect" | "ellipse";
	},
	extraKeys: readonly string[] = [],
): ObjectMapperType<TDoc, TState> => {
	const isEllipse = features.geometry === "ellipse";
	const passthroughKeys = [...collectStyleKeys(features), ...extraKeys];

	return {
		toState: (doc) => {
			// A rect doc stating no height is one whose height follows its text
			// (supportsAutoHeight). The frame is built at height 0 so the box's top
			// edge lands exactly where the doc's `y` put it, and the derivation pass
			// grows it from there (resizeAutoHeightStateToContent).
			const rect = doc as unknown as Rect;
			const autoHeight = !isEllipse && rect.height === undefined;
			const frame: Frame = isEllipse
				? convertEllipseToFrame(doc as unknown as Ellipse)
				: convertRectToFrame(autoHeight ? { ...rect, height: 0 } : rect);
			const transform: Partial<TransformState> = features.transform
				? mapTransformDocToState(doc as unknown as TransformDoc)
				: {};
			return {
				...ObjectMapper.toState(doc),
				...pick(doc as unknown as Record<string, unknown>, passthroughKeys),
				...mapTextDocToState(features.text, doc as TextDocFields),
				...frame,
				...transform,
				...(autoHeight ? { autoHeight: true } : {}),
			} as unknown as TState;
		},

		toDoc: (state) => {
			// Rounded here, not at the State's cx / cy / width / height: the Doc's
			// geometry is derived from those, and the halving re-introduces a float
			// tail even when both operands are already round (roundDocNumbers).
			const frame = state as unknown as Frame;
			const geometry: Rect | Ellipse = isEllipse
				? roundDocEllipse(convertFrameToEllipse(frame))
				: roundDocRect(convertFrameToRect(frame));
			// The derived height is the text's answer, not the document's, so it goes
			// back out the way it came in: absent. `y` is unaffected — it was read off
			// the same frame the height was.
			if (!isEllipse && state.autoHeight === true) {
				delete (geometry as Partial<Rect>).height;
			}
			const transform: Partial<TransformDoc> = features.transform
				? mapTransformStateToDoc(state as unknown as TransformState)
				: {};
			return {
				...ObjectMapper.toDoc(state),
				...pick(state as unknown as Record<string, unknown>, passthroughKeys),
				...mapTextStateToDoc(features.text, (state as TextStyleState).text),
				...geometry,
				...transform,
			} as unknown as TDoc;
		},
	};
};
