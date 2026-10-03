import { createFrameObject } from "@jiscribe/canvas-sdk";

import { resolveCellPaint } from "./resolveCellPaint";
import { TableCellSurface, TableOutline, TableRule } from "./TableBoxStyled";
import { calcTableLayout } from "../layout/calcTableLayout";
import type { TableState } from "../state/TableState";

/**
 * Table presentation: a grid of cells under the rules that divide them. Shared
 * Frame logic (transform, color resolution, per-cell text overlays placed by
 * calcTableTextRegion, memo) lives in createFrameObject; here we draw the cells
 * and the linework. The wrapping <g> carries the object's data-kind/data-id, and
 * each cell carries its cell id as data-part, so a double click resolves to the
 * cell it landed in (getGestureTarget).
 *
 * The text is drawn by createFrameObject, which gives every key of `state.text`
 * an overlay of its own — one per cell, `features.text` being `"slots"`.
 *
 * The box is taken from the layout rather than from the state's own
 * `width` / `height`, so the grid is drawn whole even on the render before the
 * content resizer has written the derived size back (see calcTableFrameSize).
 *
 * Every cell is painted before any rule, so a cell's background can never cover
 * the rule beside it.
 */
export const TableBox = createFrameObject<TableState>((state, shape) => {
	const {
		"data-kind": dataKind,
		"data-id": dataId,
		transform,
		strokeColor,
		strokeAlpha,
		strokeWidth,
		strokeDasharray,
	} = shape;

	const { columnXs, rowYs, cellRects, width, height } = calcTableLayout(state);
	const left = columnXs[0];
	const right = columnXs[columnXs.length - 1];
	const top = rowYs[0];
	const bottom = rowYs[rowYs.length - 1];

	return (
		<g data-kind={dataKind} data-id={dataId} transform={transform}>
			{Object.entries(cellRects).map(([cellId, rect]) => (
				<TableCellSurface
					key={cellId}
					data-part={cellId}
					x={rect.x}
					y={rect.y}
					width={rect.width}
					height={rect.height}
					fillColor={resolveCellPaint(state.text?.[cellId]?.fill)}
				/>
			))}
			{/* The inner edges alone: the outer two are the outline's own sides. */}
			{columnXs.slice(1, -1).map((x, index) => (
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
			{rowYs.slice(1, -1).map((y, index) => (
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
