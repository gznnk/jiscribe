import { resolveAutoColor } from "../../../../presentations/objects/utils/resolveAutoColor";
import { AUTO_COLOR } from "../../../../schemas/objects/utils/autoColor";
import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import type { StrokeStyleState } from "../../../../states/objects/base/StrokeStyleState";
import type { TextStyleState } from "../../../../states/objects/base/TextStyleState";
import { blankTextSlots } from "../../../../states/objects/types/TextSlots";

/** Uniform thin outline for the drag-drawing ghost, independent of the shape's real strokeWidth. */
const PREVIEW_STROKE_WIDTH = 1.5;

/**
 * Recolor a real object state into the drag-drawing ghost look so the shape's
 * own component can render the preview. The stroke matches the color that will
 * be applied after placement (auto → theme foreground); the fill is a
 * translucent tint of that stroke, and text is blanked so no overlay shows.
 */
export const ghostifyPreviewState = (state: ObjectState): ObjectState => {
	const stroke = resolveAutoColor(
		(state as StrokeStyleState).stroke ?? AUTO_COLOR,
		"ink",
	);
	const text = (state as TextStyleState).text;
	return {
		...state,
		stroke,
		fill: `color-mix(in srgb, ${stroke} 18%, transparent)`,
		strokeWidth: PREVIEW_STROKE_WIDTH,
		strokeDashType: "solid",
		// Emptied slot by slot: a text-less shape must not gain a text field.
		...(text ? { text: blankTextSlots(text) } : {}),
	} as ObjectState;
};
