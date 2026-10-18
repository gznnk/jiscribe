import type { SelectionControlProps } from "@jiscribe/canvas";
import { collectObjectPartIds } from "@jiscribe/canvas-sdk";
import { memo } from "react";

import { ErEntityGripStrip } from "./ErEntityGripStrip";
import { readCachedErEntityLayout } from "../layout/readCachedErEntityLayout";
import {
	ER_ENTITY_COLUMN_PART_KIND,
	ER_ENTITY_COLUMN_PART_DEFINITION,
} from "../parts/erEntityColumnPartKind";
import { erEntityColumnPartId } from "../schema/erEntityColumnIds";
import type { ErEntityState } from "../state/ErEntityState";

/**
 * The column grips: one numbered heading per row (from `1`), down the outside of
 * the entity's left edge, as a table heads its rows. Each grip's action carries
 * its column's part id.
 *
 * The grips are placed from the layout rather than from the state's box, so they
 * stand beside the drawn rows even on the render before the content resizer has
 * written the derived size back (the same reason ErEntityBox reads it).
 */
const ErEntityColumnGripControlComponent: React.FC<
	SelectionControlProps<ErEntityState>
> = ({ object, action, selectedPart }) => {
	const layout = readCachedErEntityLayout(object);
	// The selection stores the ends of its ranges; the kind's own definition is
	// what expands them, as it does for every other reader of the pick.
	const selectedPartIds = new Set(
		selectedPart?.kind === ER_ENTITY_COLUMN_PART_KIND
			? collectObjectPartIds(
					selectedPart,
					ER_ENTITY_COLUMN_PART_DEFINITION,
					object,
				)
			: [],
	);

	return (
		<ErEntityGripStrip
			object={object}
			action={action}
			side="left"
			edge={-layout.width / 2}
			items={layout.rows.map(({ columnIndex, band }) => {
				const partId = erEntityColumnPartId(columnIndex);
				return {
					partId,
					start: band.y,
					end: band.y + band.height,
					label: String(columnIndex + 1),
					selected: selectedPartIds.has(partId),
				};
			})}
		/>
	);
};

export const ErEntityColumnGripControl = memo(
	ErEntityColumnGripControlComponent,
);
