import type { ObjectDoc, ObjectDocConnectPointEdgeAnchor } from "@jiscribe/doc";

import { calcErEntityLayout } from "./calcErEntityLayout";
import { readErEntityDocLayoutInput } from "./readErEntityLayoutSource";
import type { ErEntityDocLayoutFields } from "./readErEntityLayoutSource";
import {
	erEntityColumnConnectPointId,
	erEntityColumnPartId,
} from "../schema/erEntityColumnIds";

/**
 * Where each column connect point of an entity document sits on its box — the type's
 * `ObjectDocDefinition.extraConnectPointEdgeAnchors`: on the left and right sides at
 * the height of the column's row centre, as calcErEntityConnectPoints places them on
 * the canvas (both read the rows off calcErEntityLayout). The two points of a column
 * share its part id as their `alternateGroup`: a relationship line may be routed to
 * either end of the row.
 *
 * @param doc - Any entity doc; a field it lacks reads as its default (readErEntityDocLayoutInput)
 * @returns Every column's points in declared column order, left before right; none for an entity with no column
 */
export const calcErEntityConnectPointEdgeAnchors = (
	doc: ObjectDoc,
): ObjectDocConnectPointEdgeAnchor[] => {
	const { rows, height } = calcErEntityLayout(
		readErEntityDocLayoutInput(doc as ErEntityDocLayoutFields),
	);
	return rows.flatMap(({ columnIndex, band }) => {
		const t = (band.y + band.height / 2 + height / 2) / height;
		const alternateGroup = erEntityColumnPartId(columnIndex);
		return (["left", "right"] as const).map((side) => ({
			id: erEntityColumnConnectPointId(columnIndex, side),
			side,
			t,
			alternateGroup,
		}));
	});
};
