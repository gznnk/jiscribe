import type { TextState } from "./TextState";
import { DEFAULT_FONT_FAMILY } from "../../../../constants/defaultFontFamily";
import type { TextStyleDoc } from "../../../../schemas/objects/base/TextStyleDoc";
import { calcTextObjectFrameSize } from "../../../../schemas/objects/primitives/text/calcTextObjectFrameSize";
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
	const { width, height } = calcTextObjectFrameSize(
		doc.text ?? "",
		doc,
		DEFAULT_FONT_FAMILY,
	);

	return rebrand<TextState>({
		...ObjectMapper.toState(doc),
		...mapTextDocToState("body", doc),
		...mapTransformDocToState(doc),
		type: "text",
		// The doc's (x, y) is the box's top-left, so the center follows the size.
		cx: doc.x + width / 2,
		cy: doc.y + height / 2,
		width,
		height,
	});
};

/**
 * Converts TextState to TextDoc, dropping the derived size and keeping only the
 * top-left corner it was measured around.
 */
export const textToDoc: StateToDocMapper<TextState, TextDoc> = (state) =>
	rebrand<TextDoc>({
		...ObjectMapper.toDoc(state),
		// A "body" type's text folds back to a plain string; the union that covers
		// keyed types too cannot be narrowed from the argument.
		...(mapTextStateToDoc("body", state.text) as TextStyleDoc),
		...mapTransformStateToDoc(state),
		type: "text",
		x: state.cx - state.width / 2,
		y: state.cy - state.height / 2,
	});
