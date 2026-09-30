import type { ObjectDoc } from "@jiscribe/doc/model/objects/base/ObjectDoc";
import type { TransformDoc } from "@jiscribe/doc/model/objects/base/TransformDoc";
import type { ObjectFeatures } from "@jiscribe/doc/model/objects/types/ObjectFeatures";
import { collectStyleKeys } from "@jiscribe/doc/model/objects/utils/collectStyleKeys";
import {
	roundDocEllipse,
	roundDocPoint,
	roundDocRect,
} from "@jiscribe/doc/model/objects/utils/roundDocNumbers";
import type {
	Ellipse,
	Frame,
	Point,
	Rect,
	TransformedFrame,
} from "@jiscribe/geometry";
import {
	calcFrameKeyPoint,
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
import { pick } from "../utils/stylePassthrough";

/**
 * Reads a State as the transformed box calcFrameKeyPoint takes. A type
 * declaring no transform carries none of the three fields, and reads as a box
 * that is neither rotated nor flipped.
 */
const readTransformedFrame = (state: ObjectState): TransformedFrame => {
	const frame = state as unknown as Frame & Partial<TransformState>;
	return {
		...frame,
		rotation: frame.rotation ?? 0,
		scaleX: frame.scaleX ?? 1,
		scaleY: frame.scaleY ?? 1,
	};
};

/**
 * Generates a Doc↔State mapper from `features` for Frame-family objects: the ones
 * whose State is a box with a transform, which their Doc spells as a rect, as an
 * ellipse, or — a box derived from content — as a position alone
 * (geometry: "rect" | "ellipse" | "point").
 *
 * The differences between Doc and State are the geometry, the transform, and the text
 * group (whose styling sits flat on a root-form Doc but inside each slot in the State).
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
 *   `TDoc["type"]`, and its `geometry` must be a Frame family one — "rect", "ellipse" or
 *   "point" (see `createPolyMapper` for poly shapes).
 * @param extraKeys - Shape-specific field names to pass through (non-style groups).
 */
export const createFrameMapper = <
	TDoc extends ObjectDoc,
	TState extends ObjectState & { type: TDoc["type"] },
>(
	features: ObjectFeatures & {
		type: TDoc["type"];
		geometry: "rect" | "ellipse" | "point";
	},
	extraKeys: readonly string[] = [],
): ObjectMapperType<TDoc, TState> => {
	const isEllipse = features.geometry === "ellipse";
	const isPoint = features.geometry === "point";
	const passthroughKeys = [...collectStyleKeys(features), ...extraKeys];

	return {
		toState: (doc) => {
			// A rect doc stating no height is one whose height follows its text.
			//
			// `supportsAutoHeight` is the actual verdict, and it reads two things a
			// mapper cannot see: the type's `textRegion` (a label drawn outside the
			// outline has no height to derive) and its `autoHeight: false` denial.
			// Only `features` is in hand here, so `geometry === "rect"` stands in for
			// the whole test. It holds because the parser has already applied the real
			// verdict: `height` is required for every type it refuses
			// (validateGeometryFields), so an absent height cannot reach this line
			// unless the type genuinely derives one.
			//
			// The frame is built at height 0 so the box's top edge lands exactly where
			// the doc's `y` put it, and the derivation pass grows it from there
			// (resizeAutoHeightStateToContent).
			const rect = doc as unknown as Rect;
			const autoHeight =
				features.geometry === "rect" && rect.height === undefined;
			const frame: Frame = isPoint
				? // A point doc carries no box at all, so the frame starts empty on the
					// doc's own coordinate: at zero size that coordinate is the center and
					// the drawn top-left corner alike, whatever the transform. The type's
					// ObjectContentResizer grows the box from there.
					{ cx: rect.x, cy: rect.y, width: 0, height: 0 }
				: isEllipse
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
			// geometry is derived from those, and both the halving and the transform
			// re-introduce a float tail even when the operands are already round
			// (roundDocNumbers).
			const frame = state as unknown as Frame;
			const geometry: Rect | Ellipse | Point = isPoint
				? // The whole box is the content's answer, so only the corner it was
					// grown from goes back out (see GeometryType).
					roundDocPoint(
						calcFrameKeyPoint(readTransformedFrame(state), "topLeft"),
					)
				: isEllipse
					? roundDocEllipse(convertFrameToEllipse(frame))
					: roundDocRect(convertFrameToRect(frame));
			// The derived height is the text's answer, not the document's, so it goes
			// back out the way it came in: absent. `y` is unaffected — it was read off
			// the same frame the height was.
			if (features.geometry === "rect" && state.autoHeight === true) {
				delete (geometry as Partial<Rect>).height;
			}
			const transform: Partial<TransformDoc> = features.transform
				? mapTransformStateToDoc(state as unknown as TransformState)
				: {};
			return {
				...ObjectMapper.toDoc(state),
				...pick(state as unknown as Record<string, unknown>, passthroughKeys),
				...mapTextStateToDoc(features.text, state as TextStyleState),
				...geometry,
				...transform,
			} as unknown as TDoc;
		},
	};
};
