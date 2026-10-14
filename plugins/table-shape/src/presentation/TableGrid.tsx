import { textSlotPart } from "@jiscribe/canvas";
import type { FillPaintProps, StrokePaintProps } from "@jiscribe/canvas-sdk";
import { memo } from "react";
import type React from "react";

import { resolveCellPaint } from "./resolveCellPaint";
import {
	TableBody,
	TableCellBody,
	TableOutline,
	TableRule,
} from "./TableStyled";
import type { TableLayout } from "../layout/calcTableLayout";
import type { TableState } from "../state/TableState";

type TableGridProps = FillPaintProps &
	StrokePaintProps & {
		/** Rule width in px, the outline's and every rule's alike. */
		strokeWidth: number;
		/** SVG dash pattern of the rules and the outline; undefined draws them solid. */
		strokeDasharray?: string;
		/** The grid to draw, in the table's local coordinates; compared by identity, so pass the cached one (readCachedTableLayout). */
		layout: TableLayout;
		/** The cells, read for their `fill` alone; compared by identity. */
		text: TableState["text"];
	};

/**
 * Everything a table draws inside its transform: the body, every cell, then
 * every rule. The body is what a cell with no `fill` of its own shows, and a
 * cell's background can never cover the rule beside it. Each cell carries its
 * cell id as its `data-part` address (textSlotPart), so a click picks the cell it
 * lands in and a double click resolves to the cell it landed in
 * (getGestureTarget).
 *
 * Memoized apart from the transform the caller wraps it in: a move or a rotation
 * keeps the cached layout and the cells, so its drag draws none of the cells
 * again.
 */
const TableGridComponent: React.FC<TableGridProps> = ({
	layout,
	text,
	strokeColor,
	strokeAlpha,
	fillColor,
	fillAlpha,
	strokeWidth,
	strokeDasharray,
}) => {
	const { columnEdgeXs, rowEdgeYs, cellRects, width, height } = layout;
	const left = columnEdgeXs[0];
	const right = columnEdgeXs[columnEdgeXs.length - 1];
	const top = rowEdgeYs[0];
	const bottom = rowEdgeYs[rowEdgeYs.length - 1];

	return (
		<>
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
					fillColor={resolveCellPaint(text?.[cellId]?.fill)}
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
		</>
	);
};

export const TableGrid = memo(TableGridComponent);
