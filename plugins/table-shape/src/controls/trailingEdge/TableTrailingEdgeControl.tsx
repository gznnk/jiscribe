import type { SelectionControlProps } from "@jiscribe/canvas";
import { getResizeCursorForRotation } from "@jiscribe/canvas-sdk";
import { memo } from "react";

import { calcTableTrailingEdges } from "./calcTableTrailingEdges";
import type { TableAxis } from "../../grid/tableTrack";
import type { TableState } from "../../state/TableState";
import { TableBoundaryStrip } from "../shared/TableBoundaryStrip";

/**
 * Handles for the table's two trailing edges, the ones away from the corner it is
 * drawn from (calcTableTrailingEdges says which those are under a flip): a strip
 * down the edge after the last column and one across the edge after the last row,
 * each its full length. Each strip's `data-action` appends the axis whose last
 * track it resizes (handleTableTrailingEdge reads it back).
 *
 * Registered apart from the boundary controls, which cover the inner rules alone.
 */
const TableTrailingEdgeControlComponent: React.FC<
	SelectionControlProps<TableState>
> = ({ object, zoom, action }) => {
	const { id, rotation, scaleX, scaleY } = object;
	const edges = calcTableTrailingEdges(object);

	return (
		<>
			<TableBoundaryStrip
				from={edges.column.from}
				to={edges.column.to}
				zoom={zoom}
				objectId={id}
				action={`${action}:${"column" satisfies TableAxis}`}
				cursor={getResizeCursorForRotation(0, rotation, scaleX, scaleY)}
			/>
			<TableBoundaryStrip
				from={edges.row.from}
				to={edges.row.to}
				zoom={zoom}
				objectId={id}
				action={`${action}:${"row" satisfies TableAxis}`}
				cursor={getResizeCursorForRotation(90, rotation, scaleX, scaleY)}
			/>
		</>
	);
};

export const TableTrailingEdgeControl = memo(TableTrailingEdgeControlComponent);
