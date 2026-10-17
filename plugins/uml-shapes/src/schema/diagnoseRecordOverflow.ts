import type { ObjectDocOverflowDiagnoser, TextSlot } from "@jiscribe/doc";
import { roundToDecimal } from "@jiscribe/geometry";

import { calcRecordContentHeight } from "./calcRecordContentHeight";

/**
 * Height a stored box may fall short of its compartments by before it is
 * reported, in local pixels: the rounding a stored height goes through. The
 * required height is the exact one `record_set_compartments` fits the box to.
 */
const RECORD_OVERFLOW_TOLERANCE = 0.5;

/**
 * The finding about a record too short for its compartments, empty when it is
 * tall enough. The box does not follow its rows — the bottom compartment takes
 * whatever height is left (calcRecordTextSlotRegions) — so a row added without
 * refitting the height is drawn past the bottom edge. Measured with the rule the
 * drawing splits the box with (calcRecordContentHeight).
 *
 * @param doc - A parsed record doc; one with no numeric `width` or `height` is passed over
 * @returns At most one message, naming the shortfall and the two ways to fix it
 */
export const diagnoseRecordOverflow: ObjectDocOverflowDiagnoser = (doc) => {
	const { width, height } = doc;
	if (typeof width !== "number" || typeof height !== "number") {
		return [];
	}
	const requiredHeight = calcRecordContentHeight({
		width,
		// Parse-time validation (validateRecordTextFields) has settled its shape.
		text: doc.text as Record<string, TextSlot> | undefined,
	});
	const shortfall = requiredHeight - height;
	if (shortfall <= RECORD_OVERFLOW_TOLERANCE) {
		return [];
	}
	return [
		`rows overflow record ${width}x${height}: its compartments need ${roundToDecimal(requiredHeight, 1)}px but the box is ${height}px tall, ${roundToDecimal(shortfall, 1)}px short, so the bottom rows are drawn past its edge; record_set_compartments refits the height to them, or resize_object it to height ${roundToDecimal(requiredHeight, 1)}`,
	];
};
