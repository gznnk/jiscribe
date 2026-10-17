import type { ObjectMapperType } from "@jiscribe/canvas";
import {
	mapTransformDocToState,
	mapTransformStateToDoc,
	ObjectMapper,
} from "@jiscribe/canvas-sdk";
import { collectStyleKeys, roundDocCoordinate } from "@jiscribe/canvas-sdk/doc";
import {
	calcFrameCenterFromTopLeft,
	calcFrameKeyPoint,
} from "@jiscribe/geometry";

import type { TableState } from "./TableState";
import { mapTableGridToCells } from "../grid/mapTableGridToCells";
import { readTableDocGrid } from "../grid/readTableDocGrid";
import {
	calcTableLayout,
	calcTableMinHeight,
	calcTableMinWidth,
} from "../layout/calcTableLayout";
import { TableFeatures } from "../schema/TableDoc";
import type { TableDoc } from "../schema/TableDoc";

/**
 * The fields that read the same on a doc and on a state, so the mapper carries
 * them across untouched: the style groups the features enable, which for a table
 * is the stroke group and the fill group (`collectStyleKeys`).
 *
 * The grid's own three fields (TABLE_EXTRA_KEYS) are deliberately not here. All
 * three are converted rather than carried: the two tracks are cloned, and `cells`
 * changes form entirely on the way to `text`.
 */
const TABLE_PASSTHROUGH_KEYS = collectStyleKeys(TableFeatures);

/**
 * The passthrough fields `src` owns. An allow-list rather than a copy, for the
 * reason the shared mapper picks by one: nothing a runtime state carries on its
 * own (id / parentId / minWidth / minHeight) can then leak into the document.
 */
const pickPassthrough = (
	src: Readonly<Record<string, unknown>>,
): Record<string, unknown> => {
	const picked: Record<string, unknown> = {};
	for (const key of TABLE_PASSTHROUGH_KEYS) {
		if (Object.prototype.hasOwnProperty.call(src, key)) {
			picked[key] = src[key];
		}
	}
	return picked;
};

/**
 * TableDoc -> TableState: the grid moved into the keyed slot map the text
 * machinery reads, and the box measured from that grid.
 *
 * Written out rather than built from `createFrameMapper`, which refuses a
 * `geometry: "point"` type: the doc holds the corner the table is drawn from and
 * nothing about its size, so the box is measured here — by the same layout the
 * content resizer keeps it at (calcTableFrameSize) — instead of a placeholder
 * being handed out for the resizer to grow. A state that never reaches the
 * derivation pass (doc ops, a headless measurement) would otherwise read as a
 * table with no extent at all.
 */
export const tableToState: ObjectMapperType<TableDoc, TableState>["toState"] = (
	doc,
) => {
	const { columns, rows, text } = readTableDocGrid(doc);
	const transform = mapTransformDocToState(doc);
	// Computed outright, not through the layout cache: an entry under a state
	// nobody renders yet would never be read (as calcTableFrameSize does).
	const layout = calcTableLayout({
		columns,
		rows,
		text,
		strokeWidth: doc.strokeWidth,
	});
	// The doc's (x, y) is the drawn top-left, so the center is that corner plus the
	// transformed half-diagonal. Left unrounded: rounding both directions would
	// round the coordinate twice on a doc round trip.
	const center = calcFrameCenterFromTopLeft(
		{ x: doc.x, y: doc.y },
		layout,
		transform,
	);

	return {
		...ObjectMapper.toState(doc),
		...pickPassthrough(doc),
		...transform,
		type: "table",
		cx: center.x,
		cy: center.y,
		width: layout.width,
		height: layout.height,
		minWidth: calcTableMinWidth(columns),
		minHeight: calcTableMinHeight(layout),
		columns,
		rows,
		text,
	} as TableState;
};

/**
 * TableState -> TableDoc: the slot map folded back into the grid, and the derived
 * box dropped in favour of the corner it was measured around. The keyed slot map
 * is never written: a table spells its cells out as `cells` instead.
 */
export const tableToDoc: ObjectMapperType<TableDoc, TableState>["toDoc"] = (
	state,
) => {
	const drawnTopLeft = calcFrameKeyPoint(state, "topLeft");

	return {
		...ObjectMapper.toDoc(state),
		...pickPassthrough(state),
		...mapTransformStateToDoc(state),
		type: "table",
		// Rounded because the transform makes the round trip exact only to a float
		// epsilon, and two callers read the doc as an exact value: the mapper
		// round-trip test compares docs with toEqual, and isSameCanvasDocContent
		// stringifies the doc to decide whether the file is dirty.
		x: roundDocCoordinate(drawnTopLeft.x),
		y: roundDocCoordinate(drawnTopLeft.y),
		columns: state.columns.map((column) => ({ ...column })),
		rows: state.rows.map((row) => ({ ...row })),
		cells: mapTableGridToCells(state),
	} as TableDoc;
};
