import { unionBoundingBoxes } from "@jiscribe/geometry";
import type { BoundingBox, Point } from "@jiscribe/geometry";

import { pickShapeStyleFields } from "./pickShapeStyleFields";
import type { VisualExtentRegistries } from "./VisualExtentRegistries";
import { calcArrowReach } from "../../rendering/objects/arrows";
import type { ObjectState } from "../../states/objects/base/ObjectState";

/** How far (world units) each end's head reaches from its tip; 0 for an end with none. */
type ArrowHeadReaches = {
	startReach: number;
	endReach: number;
};

/** Both ends reaching nothing: a line whose type declares no arrowheads. */
const NO_ARROW_HEAD_REACHES: ArrowHeadReaches = { startReach: 0, endReach: 0 };

/**
 * How far each of a line's heads reaches from its tip (calcArrowReach). The
 * marks are the line's own `startArrow` / `endArrow`, the only place the
 * renderer reads them from; the stroke width and the scale are resolved through
 * the shape-style defaults, as the renderer resolves them.
 *
 * @param line - The line whose heads are sized; a type not declaring `features.arrow` reaches 0 at both ends, and so does an end whose own mark is unset or "None"
 * @param shapeStyleDefaults - The canvas's shape-style defaults (VisualExtentRegistries)
 */
export const resolveArrowHeadReaches = (
	line: ObjectState,
	shapeStyleDefaults: VisualExtentRegistries["objectShapeStyleDefaults"],
): ArrowHeadReaches => {
	if (line.features?.arrow !== true) {
		return NO_ARROW_HEAD_REACHES;
	}
	const ownStyle = pickShapeStyleFields(line);
	const { strokeWidth, arrowScale } = shapeStyleDefaults.resolveShapeStyle(
		line.type,
		ownStyle,
	);
	return {
		startReach: calcArrowReach(ownStyle.startArrow, strokeWidth, arrowScale),
		endReach: calcArrowReach(ownStyle.endArrow, strokeWidth, arrowScale),
	};
};

/** The square of half side `reach` centered on `tip`; null for an end with no head. */
const squareAround = (tip: Point, reach: number): BoundingBox | null =>
	reach > 0
		? {
				left: tip.x - reach,
				top: tip.y - reach,
				right: tip.x + reach,
				bottom: tip.y + reach,
			}
		: null;

/**
 * Widens a line's box by the arrowheads drawn at its ends: a square of each
 * head's reach centered on its tip, whichever way the head points. For the
 * visual-extent consumers only — the selection frame, hit test and snapping
 * keep the line's own points.
 *
 * @param lineBox - The box of the line's path (and label), world coordinates
 * @param line - The line whose heads are added (see resolveArrowHeadReaches)
 * @param startTip - The first point of the drawn path, where the start head's tip sits
 * @param endTip - The last point of the drawn path, where the end head's tip sits
 * @param shapeStyleDefaults - The canvas's shape-style defaults (VisualExtentRegistries)
 * @returns A new box, equal to `lineBox` when neither end carries a head
 */
export const unionArrowHeadsBoundingBox = (
	lineBox: BoundingBox,
	line: ObjectState,
	startTip: Point,
	endTip: Point,
	shapeStyleDefaults: VisualExtentRegistries["objectShapeStyleDefaults"],
): BoundingBox => {
	const { startReach, endReach } = resolveArrowHeadReaches(
		line,
		shapeStyleDefaults,
	);
	return (
		unionBoundingBoxes([
			lineBox,
			squareAround(startTip, startReach),
			squareAround(endTip, endReach),
		]) ?? lineBox
	);
};
