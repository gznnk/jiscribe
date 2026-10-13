import { textSlotPart } from "@jiscribe/canvas";
import { createFrameObject } from "@jiscribe/canvas-sdk";

import { resolveCellPaint } from "./resolveCellPaint";
import {
	TableBody,
	TableCellBody,
	TableOutline,
	TableRule,
} from "./TableStyled";
import { readCachedTableLayout } from "../layout/readCachedTableLayout";
import type { TableState } from "../state/TableState";

/**
 * Table presentation: a grid of cells under the rules that divide them. Shared
 * Frame logic (transform, color resolution, per-cell text overlays placed by
 * calcTableTextSlotRegions, memo) lives in createFrameObject; here we draw the body,
 * the cells and the linework. The wrapping <g> carries the object's data-kind/data-id, and
 * each cell carries its cell id as its `data-part` address (textSlotPart), so a
 * click picks the cell it lands in and a double click resolves to the
 * cell it landed in (getGestureTarget).
 *
 * The text is drawn by createFrameObject, which gives every key of `state.text`
 * an overlay of its own — one per cell, `features.text` being `"slots"`.
 *
 * The box is taken from the layout rather than from the state's own
 * `width` / `height`, so the grid is drawn whole even on the render before the
 * content resizer has written the derived size back (see calcTableFrameSize).
 *
 * The table's body is painted first, then every cell, then every rule: the body
 * is what a cell with no `fill` of its own shows, and a cell's background can
 * never cover the rule beside it.
 */
export const Table = createFrameObject<TableState>((state, shape) => {
	const {
		"data-kind": dataKind,
		"data-id": dataId,
		transform,
		strokeColor,
		strokeAlpha,
		fillColor,
		fillAlpha,
		strokeWidth,
		strokeDasharray,
	} = shape;

	const { columnEdgeXs, rowEdgeYs, cellRects, width, height } =
		readCachedTableLayout(state);
	const left = columnEdgeXs[0];
	const right = columnEdgeXs[columnEdgeXs.length - 1];
	const top = rowEdgeYs[0];
	const bottom = rowEdgeYs[rowEdgeYs.length - 1];

	return (
		<g data-kind={dataKind} data-id={dataId} transform={transform}>
			<TableBody
				x={left}
				y={top}
				width={width}
				height={height}
				fillColor={fillColor}
				fillAlpha={fillAlpha}
			/>
			{Object.entries(cellRects).map(([cellId, rect]) => (
				<TableCellBody
					key={cellId}
					data-part={textSlotPart(cellId)}
					x={rect.x}
					y={rect.y}
					width={rect.width}
					height={rect.height}
					fillColor={resolveCellPaint(state.text?.[cellId]?.fill)}
				/>
			))}
			{/* The inner edges alone: the outer two are the outline's own sides. */}
			{columnEdgeXs.slice(1, -1).map((x, index) => (
				<TableRule
					key={`column-${index}`}
					x1={x}
					y1={top}
					x2={x}
					y2={bottom}
					strokeColor={strokeColor}
					strokeAlpha={strokeAlpha}
					strokeWidth={strokeWidth}
					strokeDasharray={strokeDasharray}
				/>
			))}
			{rowEdgeYs.slice(1, -1).map((y, index) => (
				<TableRule
					key={`row-${index}`}
					x1={left}
					y1={y}
					x2={right}
					y2={y}
					strokeColor={strokeColor}
					strokeAlpha={strokeAlpha}
					strokeWidth={strokeWidth}
					strokeDasharray={strokeDasharray}
				/>
			))}
			<TableOutline
				x={left}
				y={top}
				width={width}
				height={height}
				strokeColor={strokeColor}
				strokeAlpha={strokeAlpha}
				strokeWidth={strokeWidth}
				strokeDasharray={strokeDasharray}
			/>
		</g>
	);
});
