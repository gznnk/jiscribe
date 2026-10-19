import type { SelectionControlProps } from "@jiscribe/canvas";
import { getResizeCursorForRotation } from "@jiscribe/canvas-sdk";
import {
	calcAffineTransformedPoint,
	degreesToRadians,
} from "@jiscribe/geometry";
import { memo } from "react";

import {
	ER_ENTITY_KEY_NAME_BOUNDARY,
	ER_ENTITY_NAME_TYPE_BOUNDARY,
} from "./erEntitySlotBoundaryAction";
import { ErEntitySlotBoundaryStrip } from "./ErEntitySlotBoundaryStrip";
import { readCachedErEntityLayout } from "../layout/readCachedErEntityLayout";
import type { ErEntityState } from "../state/ErEntityState";

/**
 * The two slot boundaries of every row, each a dashed guide and a strip running
 * from the bottom of the title band to the bottom of the box: key / name and
 * name / type. The
 * strip's `data-action` appends its index, which handleErEntitySlotBoundary
 * reads back. The title band gets none: it spans the whole width.
 *
 * Placed from the layout rather than the state's box, so the strips sit on the
 * slot boundaries even on the render before the content resizer has written the
 * derived size back (the same reason ErEntityBox reads it).
 */
const ErEntitySlotBoundaryControlComponent: React.FC<
	SelectionControlProps<ErEntityState>
> = ({ object, zoom, action }) => {
	const { id, cx, cy, rotation, scaleX, scaleY } = object;
	const layout = readCachedErEntityLayout(object);
	const radians = degreesToRadians(rotation);
	const top = layout.header.y + layout.header.height;
	const bottom = layout.height / 2;
	const boundaryXs = [
		{
			boundaryIndex: ER_ENTITY_KEY_NAME_BOUNDARY,
			x: -layout.width / 2 + layout.keyWidth,
		},
		{
			boundaryIndex: ER_ENTITY_NAME_TYPE_BOUNDARY,
			x: layout.width / 2 - layout.typeWidth,
		},
	];
	const cursor = getResizeCursorForRotation(0, rotation, scaleX, scaleY);

	return (
		<>
			{boundaryXs.map(({ boundaryIndex, x }) => (
				<ErEntitySlotBoundaryStrip
					key={boundaryIndex}
					from={calcAffineTransformedPoint(
						x,
						top,
						scaleX,
						scaleY,
						radians,
						cx,
						cy,
					)}
					to={calcAffineTransformedPoint(
						x,
						bottom,
						scaleX,
						scaleY,
						radians,
						cx,
						cy,
					)}
					zoom={zoom}
					objectId={id}
					action={`${action}:${boundaryIndex}`}
					cursor={cursor}
					showGuide
				/>
			))}
		</>
	);
};

export const ErEntitySlotBoundaryControl = memo(
	ErEntitySlotBoundaryControlComponent,
);
