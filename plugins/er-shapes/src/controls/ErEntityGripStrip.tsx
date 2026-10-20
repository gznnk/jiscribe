import {
	calcAffineTransformedPoint,
	degreesToRadians,
} from "@jiscribe/geometry";
import type { Point } from "@jiscribe/geometry";
import { memo } from "react";

import { ErEntityGrip, GRIP_OFFSET } from "./ErEntityGrip";
import type { ErEntityState } from "../state/ErEntityState";

/** One grip of a strip: what it stands for and where along the edge it runs. */
export type ErEntityGripStripItem = {
	/** The part id the grip's click names, appended to the control's action. */
	partId: string;
	/** Where the grip starts along the edge, in the entity's local coordinates (a y for the left edge, an x for the top). */
	start: number;
	/** Where it ends, in the same coordinate. */
	end: number;
	/** The heading drawn on it. */
	label: string;
	/** Whether its part is among the picked ones. */
	selected: boolean;
};

type ErEntityGripStripProps = {
	/** The entity the grips stand beside; its transform is what they are placed through. */
	object: ErEntityState;
	/** The control's `data-action`; each grip appends its own part id to it. */
	action: string;
	/** Which edge the grips line: the left one heads the rows, the top one the lanes. */
	side: "left" | "top";
	/** The entity's edge on that side, in local coordinates: an x for the left edge, a y for the top. */
	edge: number;
	/** The grips, in the order they run along the edge. */
	items: readonly ErEntityGripStripItem[];
};

/**
 * A strip of grips laid against one edge of the entity, as a table's track
 * grips are (TableTrackGrips): each runs the full length of what it stands for,
 * so neighbours abut and only their borders part them. The outward offset is
 * taken in the entity's local coordinates before the transform, which puts the
 * grips outside a rotated or flipped entity too.
 */
const ErEntityGripStripComponent: React.FC<ErEntityGripStripProps> = ({
	object,
	action,
	side,
	edge,
	items,
}) => {
	const { id, cx, cy, rotation, scaleX, scaleY } = object;
	const radians = degreesToRadians(rotation);
	const lead = edge - GRIP_OFFSET;
	const toWorld = (across: number, along: number): Point =>
		side === "left"
			? calcAffineTransformedPoint(
					across,
					along,
					scaleX,
					scaleY,
					radians,
					cx,
					cy,
				)
			: calcAffineTransformedPoint(
					along,
					across,
					scaleX,
					scaleY,
					radians,
					cx,
					cy,
				);

	return (
		<>
			{items.map(({ partId, start, end, label, selected }) => (
				<ErEntityGrip
					key={partId}
					from={toWorld(lead, start)}
					to={toWorld(lead, end)}
					objectId={id}
					action={`${action}:${partId}`}
					label={label}
					selected={selected}
				/>
			))}
		</>
	);
};

export const ErEntityGripStrip = memo(ErEntityGripStripComponent);
