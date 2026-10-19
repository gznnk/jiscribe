import type { SelectionControlProps } from "@jiscribe/canvas";
import { getResizeCursorForRotation } from "@jiscribe/canvas-sdk";
import {
	calcAffineTransformedPoint,
	degreesToRadians,
} from "@jiscribe/geometry";
import { memo } from "react";

import { ErEntitySlotBoundaryStrip } from "./ErEntitySlotBoundaryStrip";
import { readCachedErEntityLayout } from "../layout/readCachedErEntityLayout";
import type { ErEntityState } from "../state/ErEntityState";

/**
 * A strip down the entity's right edge, from the bottom of the title band to the
 * bottom of the box, whose drag resizes the type column and the box with it
 * (handleErEntityTrailingEdge). It draws no guide: the box's outline is the
 * edge. The right width handle sits over its middle and keeps the press there.
 *
 * Placed from the layout rather than the state's box, for the reason
 * ErEntitySlotBoundaryControl gives.
 */
const ErEntityTrailingEdgeControlComponent: React.FC<
	SelectionControlProps<ErEntityState>
> = ({ object, zoom, action }) => {
	const { id, cx, cy, rotation, scaleX, scaleY } = object;
	const layout = readCachedErEntityLayout(object);
	const radians = degreesToRadians(rotation);
	const right = layout.width / 2;

	return (
		<ErEntitySlotBoundaryStrip
			from={calcAffineTransformedPoint(
				right,
				layout.header.y + layout.header.height,
				scaleX,
				scaleY,
				radians,
				cx,
				cy,
			)}
			to={calcAffineTransformedPoint(
				right,
				layout.height / 2,
				scaleX,
				scaleY,
				radians,
				cx,
				cy,
			)}
			zoom={zoom}
			objectId={id}
			action={action}
			cursor={getResizeCursorForRotation(0, rotation, scaleX, scaleY)}
			showGuide={false}
		/>
	);
};

export const ErEntityTrailingEdgeControl = memo(
	ErEntityTrailingEdgeControlComponent,
);
