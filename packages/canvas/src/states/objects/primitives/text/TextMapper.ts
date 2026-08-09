import { roundToDecimal } from "@workspace/geometry";

import { calcTextObjectFrameSize } from "./calcTextObjectFrameSize";
import {
	calcTextCenterFromDrawnTopLeft,
	calcTextDrawnTopLeft,
} from "./textDrawnTopLeft";
import type { TextState } from "./TextState";
import { DEFAULT_FONT_FAMILY } from "../../../../constants/defaultFontFamily";
import { PRECISION } from "../../../../constants/precision";
import type { TextStyleDoc } from "../../../../schemas/objects/base/TextStyleDoc";
import type { TextDoc } from "../../../../schemas/objects/primitives/text/TextDoc";
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
 * The measurement here is provisional: this layer is headless and cannot reach
 * the host theme, so an object that names no fontFamily is measured with the
 * built-in default. `canvasToState` re-measures with the theme's family right
 * after, and the reducer keeps it current from then on. Headless consumers
 * (MCP / diagnostics / docOps), which only ever come through here, get a box
 * that is coherent on its own terms.
 */
export const textToState: DocToStateMapper<TextDoc, TextState> = (doc) => {
	const size = calcTextObjectFrameSize(
		doc.text ?? "",
		doc,
		DEFAULT_FONT_FAMILY,
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
	});
};

/**
 * Converts TextState to TextDoc, dropping the derived size and keeping only the
 * drawn top-left corner the box was measured around.
 */
export const textToDoc: StateToDocMapper<TextState, TextDoc> = (state) => {
	const drawnTopLeft = calcTextDrawnTopLeft(state);

	return rebrand<TextDoc>({
		...ObjectMapper.toDoc(state),
		// A "body" type's text folds back to a plain string; the union that covers
		// keyed types too cannot be narrowed from the argument.
		...(mapTextStateToDoc("body", state.text) as TextStyleDoc),
		...mapTransformStateToDoc(state),
		type: "text",
		// Rounded because the transform makes the round trip exact only to a float
		// epsilon, and two callers read the doc as an exact value: the mapper
		// round-trip test compares docs with toEqual, and isSameCanvasDocContent
		// stringifies the doc to decide whether the file is dirty.
		x: roundToDecimal(drawnTopLeft.x, PRECISION.COORDINATE),
		y: roundToDecimal(drawnTopLeft.y, PRECISION.COORDINATE),
	});
};
