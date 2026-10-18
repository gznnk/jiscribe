import type { SelectionControlProps } from "@jiscribe/canvas";
import { collectObjectPartIds, createSvgTransform } from "@jiscribe/canvas-sdk";
import { memo } from "react";

import { ErEntityColumnGrip } from "./ErEntityColumnGrip";
import { readCachedErEntityLayout } from "../layout/readCachedErEntityLayout";
import {
	ER_ENTITY_COLUMN_PART_KIND,
	ER_ENTITY_COLUMN_PART_DEFINITION,
} from "../parts/erEntityColumnPartKind";
import { erEntityColumnPartId } from "../schema/erEntityColumnIds";
import type { ErEntityState } from "../state/ErEntityState";

/**
 * The column grips: one per row, down the outside of the entity's left edge.
 * Each grip's action carries its column's part id.
 *
 * The grips are placed from the layout rather than from the state's box, so they
 * stand beside the drawn rows even on the render before the content resizer has
 * written the derived size back (the same reason ErEntityBox reads it).
 */
const ErEntityColumnGripControlComponent: React.FC<
	SelectionControlProps<ErEntityState>
> = ({ object, zoom, action, selectedPart }) => {
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
		<g
			transform={createSvgTransform(
				object.scaleX,
				object.scaleY,
				object.rotation,
				object.cx,
				object.cy,
			)}
		>
			{layout.rows.map(({ columnIndex, band }) => {
				const partId = erEntityColumnPartId(columnIndex);
				return (
					<ErEntityColumnGrip
						key={partId}
						band={band}
						zoom={zoom}
						objectId={object.id}
						action={`${action}:${partId}`}
						selected={selectedPartIds.has(partId)}
					/>
				);
			})}
		</g>
	);
};

export const ErEntityColumnGripControl = memo(
	ErEntityColumnGripControlComponent,
);
