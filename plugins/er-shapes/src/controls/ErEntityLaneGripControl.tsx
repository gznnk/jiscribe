import type { SelectionControlProps } from "@jiscribe/canvas";
import {
	collectObjectPartIds,
	resolveLocaleMessages,
	useCanvasLocale,
} from "@jiscribe/canvas-sdk";
import type { LocaleMessages } from "@jiscribe/canvas-sdk";
import { memo } from "react";

import { ErEntityGripStrip } from "./ErEntityGripStrip";
import { calcErEntityColumnSlotBand } from "../layout/calcErEntityColumnSlotBand";
import { readCachedErEntityLayout } from "../layout/readCachedErEntityLayout";
import { ER_ENTITY_LANES } from "../parts/erEntityLaneIds";
import type { ErEntityLane } from "../parts/erEntityLaneIds";
import {
	ER_ENTITY_LANE_PART_DEFINITION,
	ER_ENTITY_LANE_PART_KIND,
} from "../parts/erEntityLanePartKind";
import type { ErEntityState } from "../state/ErEntityState";

/** The heading each lane's grip carries, per locale. */
const ER_ENTITY_LANE_LABELS: LocaleMessages<Record<ErEntityLane, string>> = {
	en: { key: "Key", name: "Name", type: "Type" },
	ja: { key: "キー", name: "名前", type: "型" },
};

/**
 * The lane grips: one named heading per lane (key, name, type), across the
 * outside of the entity's top edge above the title band, each as wide as its
 * lane, as a table heads its columns. Each grip's action carries its lane's part
 * id. An entity of no columns has no lanes and draws none.
 *
 * Placed from the layout rather than the state's box, for the reason the column
 * grips are (ErEntityColumnGripControl).
 */
const ErEntityLaneGripControlComponent: React.FC<
	SelectionControlProps<ErEntityState>
> = ({ object, action, selectedPart }) => {
	const locale = useCanvasLocale();
	const labels = resolveLocaleMessages(ER_ENTITY_LANE_LABELS, locale);
	const layout = readCachedErEntityLayout(object);
	if (layout.rows.length === 0) {
		return null;
	}
	const selectedLanes = new Set(
		selectedPart?.kind === ER_ENTITY_LANE_PART_KIND
			? collectObjectPartIds(
					selectedPart,
					ER_ENTITY_LANE_PART_DEFINITION,
					object,
				)
			: [],
	);

	return (
		<ErEntityGripStrip
			object={object}
			action={action}
			side="top"
			edge={layout.header.y}
			items={ER_ENTITY_LANES.map((lane) => {
				const laneBand = calcErEntityColumnSlotBand(
					layout,
					layout.header,
					lane,
				);
				return {
					partId: lane,
					start: laneBand.x,
					end: laneBand.x + laneBand.width,
					label: labels[lane],
					selected: selectedLanes.has(lane),
				};
			})}
		/>
	);
};

export const ErEntityLaneGripControl = memo(ErEntityLaneGripControlComponent);
