import type { TextStyleDoc } from "@jiscribe/doc/model/objects/base/TextStyleDoc";
import type { TextDoc } from "@jiscribe/doc/model/objects/primitives/text/TextDoc";
import {
	roundDocCoordinate,
	roundDocSize,
} from "@jiscribe/doc/model/objects/utils/roundDocNumbers";

import { calcTextObjectFrameSize } from "./calcTextObjectFrameSize";
import {
	calcTextCenterFromDrawnTopLeft,
	calcTextDrawnTopLeft,
} from "./textDrawnTopLeft";
import type { TextState } from "./TextState";
import type {
	DocToStateMapper,
	StateToDocMapper,
} from "../../base/MapperTypes";
import { ObjectMapper } from "../../base/ObjectMapper";
import {
	mapTextDocToState,
	mapTextStateToDoc,
} from "../../base/TextSlotsMapper";
import {
	mapTransformDocToState,
	mapTransformStateToDoc,
} from "../../base/TransformMapper";
import { rebrand } from "../../utils/rebrand";

/**
 * Converts TextDoc to TextState, measuring the box the doc does not store.
 *
 * The measurement resolves an unset fontFamily to DEFAULT_FONT_FAMILY, the same
 * fallback the overlay draws it with, so the box this layer produces is the one
 * the canvas keeps. It is reached headlessly too (MCP / diagnostics / docOps),
 * which is why it must not depend on anything only a viewer knows.
 */
export const textToState: DocToStateMapper<TextDoc, TextState> = (doc) => {
	// Only the block layout stores a width to wrap in; one missing it is measured
	// like a label, the diagnostic for it being the parser's to report.
	const size = calcTextObjectFrameSize(
		doc.text ?? "",
		doc,
		doc.textLayout === "block" ? doc.width : undefined,
	);
	const transform = mapTransformDocToState(doc);
	// The doc's (x, y) is the drawn top-left, so the center is that corner plus the
	// transformed half-diagonal. Left unrounded: rounding both directions would
	// round the coordinate twice on a doc round trip.
	const center = calcTextCenterFromDrawnTopLeft(
		{ x: doc.x, y: doc.y },
		size,
		transform,
	);

	return rebrand<TextState>({
		...ObjectMapper.toState(doc),
		...mapTextDocToState("body", doc),
		...transform,
		type: "text",
		cx: center.x,
		cy: center.y,
		width: size.width,
		height: size.height,
		...(doc.textLayout !== undefined ? { textLayout: doc.textLayout } : {}),
	});
};

/**
 * Converts TextState to TextDoc, dropping the derived size and keeping only the
 * drawn top-left corner the box was measured around. A block text keeps its
 * width too: that one is authored rather than derived, and dropping it would
 * turn the object into a label on the next save.
 */
export const textToDoc: StateToDocMapper<TextState, TextDoc> = (state) => {
	const drawnTopLeft = calcTextDrawnTopLeft(state);

	return rebrand<TextDoc>({
		...ObjectMapper.toDoc(state),
		// A "body" type's text folds back to a plain string; the union that covers
		// keyed types too cannot be narrowed from the argument.
		...(mapTextStateToDoc("body", state) as TextStyleDoc),
		...mapTransformStateToDoc(state),
		type: "text",
		// Rounded because the transform makes the round trip exact only to a float
		// epsilon, and two callers read the doc as an exact value: the mapper
		// round-trip test compares docs with toEqual, and isSameCanvasDocContent
		// stringifies the doc to decide whether the file is dirty.
		x: roundDocCoordinate(drawnTopLeft.x),
		y: roundDocCoordinate(drawnTopLeft.y),
		...(state.textLayout !== undefined ? { textLayout: state.textLayout } : {}),
		...(state.textLayout === "block"
			? { width: roundDocSize(state.width) }
			: {}),
	});
};
