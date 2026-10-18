import { roundDocCoordinate } from "@jiscribe/canvas-sdk/doc";
import type { OwnedEndpointRef } from "@jiscribe/doc";

import type { ErEntityColumnSource } from "./ErEntityColumnSource";
import type { ErEntityLayout } from "../layout/calcErEntityLayout";
import { erEntityColumnConnectPointId } from "../schema/erEntityColumnIds";
import type { ErEntityColumnConnectPointSide } from "../schema/erEntityColumnIds";

/** Where the anchor of an end goes, keyed by the column connect point id it names before a rewrite. */
export type ErEntityConnectPointRemap = Record<
	string,
	OwnedEndpointRef["anchor"]
>;

const ER_ENTITY_COLUMN_SIDES: readonly ErEntityColumnConnectPointSide[] = [
	"left",
	"right",
];

/**
 * Where on its side of the box a removed column's row sat, as an edge anchor's
 * ratio along the rewritten box: the row center's distance from the top edge —
 * the drawn corner the rewrite keeps — over the new height, held to the edge.
 */
const calcRemovedRowRatio = (
	startLayout: ErEntityLayout,
	rewrittenLayout: ErEntityLayout,
	startColumnIndex: number,
): number => {
	const { band } = startLayout.rows[startColumnIndex];
	const rowCenterFromTop = band.y + band.height / 2 + startLayout.height / 2;
	return roundDocCoordinate(
		Math.min(Math.max(rowCenterFromTop / rewrittenLayout.height, 0), 1),
	);
};

/**
 * Where every column connect point of an entity goes when its columns are
 * rewritten (rewriteErEntityColumns): a moved column's points to the same side of
 * its new index; a removed column's to an edge anchor on the same side of the box
 * at the height the row stood (the attachment kept rather than the connector
 * dropped, as core keeps a connector whose owner is deleted). The one rule the
 * canvas commands (rewriteErEntityColumnsOnCanvas) and the AI tools'
 * `connectPointRemap` share.
 *
 * @param startLayout - The entity before the rewrite, laid out (calcErEntityLayout, or readCachedErEntityLayout on the canvas side); its row count is the column count
 * @param rewrittenLayout - The entity after the rewrite, laid out the same way; only its height is read
 * @param columnSources - One entry per column of the result, in declared order: the index it had in the entity before, or null for a fresh column
 * @returns The points that change, keyed by their id before the rewrite; a column staying at its index has no entry, and neither has an id naming a column the entity did not have, which already drew at the center and is no column's to carry
 */
export const buildErEntityConnectPointRemap = (
	startLayout: ErEntityLayout,
	rewrittenLayout: ErEntityLayout,
	columnSources: readonly ErEntityColumnSource[],
): ErEntityConnectPointRemap => {
	const newIndexByStartIndex = new Map<number, number>();
	columnSources.forEach((sourceIndex, newIndex) => {
		if (sourceIndex !== null) {
			newIndexByStartIndex.set(sourceIndex, newIndex);
		}
	});
	const remap: ErEntityConnectPointRemap = {};
	for (let startIndex = 0; startIndex < startLayout.rows.length; startIndex++) {
		const newIndex = newIndexByStartIndex.get(startIndex);
		if (newIndex === startIndex) {
			continue;
		}
		for (const side of ER_ENTITY_COLUMN_SIDES) {
			remap[erEntityColumnConnectPointId(startIndex, side)] =
				newIndex === undefined
					? {
							kind: "edge",
							side,
							t: calcRemovedRowRatio(startLayout, rewrittenLayout, startIndex),
						}
					: {
							kind: "connectPoint",
							id: erEntityColumnConnectPointId(newIndex, side),
						};
		}
	}
	return remap;
};
