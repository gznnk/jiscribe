import {
	calcAffineTransformedPoint,
	degreesToRadians,
} from "@jiscribe/geometry";
import type { Point } from "@jiscribe/geometry";
import { memo } from "react";

import { INSERT_BADGE_OFFSET, TableInsertBadge } from "./TableInsertBadge";
import type { TableAxis } from "../grid/tableTrack";
import { readCachedTableLayout } from "../layout/readCachedTableLayout";
import type { TableState } from "../state/TableState";

type TableInsertBadgesProps = {
	/** The table the badges stand beside; its transform and layout are what they are placed from. */
	object: TableState;
	/** Canvas zoom, which every screen-px measurement here is divided by. */
	zoom: number;
	/** The control's `data-action`; each badge appends its own insertion index to it. */
	action: string;
	/** Which direction the tracks a click would insert run in. */
	axis: TableAxis;
};

/**
 * One `+` per boundary of one axis, laid just outside the table's trailing edge,
 * opposite the grips (TableTrackGrips): rows down the right, columns along the
 * bottom. Shared by both axes because the two differ only in which layout edges
 * the badges run along and which coordinate stays fixed.
 *
 * Every edge of the layout gets one, the outer two included — `columnEdgeXs` and
 * `rowEdgeYs` hold one more value than there are tracks, and those are exactly the
 * insertion positions `insertTableTrack` takes. A table would otherwise be unable
 * to gain a first or a last track by pointing at it, the inner rules being all
 * there is between the existing tracks.
 *
 * The badges are placed from the layout rather than from the state's box, so they
 * stand beside the drawn grid even on the render before the content resizer has
 * written the derived size back (the same reason the drawing reads it, Table).
 * The outward offset is taken in the table's local coordinates before the
 * transform, which puts the badges outside a rotated or flipped table too.
 */
const TableInsertBadgesComponent: React.FC<TableInsertBadgesProps> = ({
	object,
	zoom,
	action,
	axis,
}) => {
	const { id, cx, cy, rotation, scaleX, scaleY } = object;
	const { columnEdgeXs, rowEdgeYs } = readCachedTableLayout(object);
	const radians = degreesToRadians(rotation);

	const edges = axis === "row" ? rowEdgeYs : columnEdgeXs;
	// The coordinate the whole row of badges sits at: clear of the edge the tracks
	// end at, on the outside.
	const trailEdges = axis === "row" ? columnEdgeXs : rowEdgeYs;
	const trail = trailEdges[trailEdges.length - 1] + INSERT_BADGE_OFFSET / zoom;
	const toWorld = (along: number): Point =>
		axis === "row"
			? calcAffineTransformedPoint(
					trail,
					along,
					scaleX,
					scaleY,
					radians,
					cx,
					cy,
				)
			: calcAffineTransformedPoint(
					along,
					trail,
					scaleX,
					scaleY,
					radians,
					cx,
					cy,
				);

	return (
		<>
			{edges.map((edge, at) => (
				<TableInsertBadge
					key={`${axis}-${at}`}
					center={toWorld(edge)}
					zoom={zoom}
					objectId={id}
					action={`${action}:${at}`}
				/>
			))}
		</>
	);
};

export const TableInsertBadges = memo(TableInsertBadgesComponent);
