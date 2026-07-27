import { createFrameObject } from "@workspace/canvas/unstable";

import { calcRecordSlotRegions } from "./calcRecordSlotRegions";
import {
	RecordDivider,
	RecordHeader,
	RecordOutline,
	RecordRows,
} from "./RecordBoxStyled";
import type { RecordState } from "../state/RecordState";

/**
 * Record presentation: a title band over a compartment of rows. Shared Frame
 * logic (transform, color resolution, per-slot text overlays placed by
 * calcRecordTextRegion, memo) lives in createFrameObject; here we draw the two
 * compartments and the linework. The wrapping <g> carries the object's
 * data-kind/data-id, and each compartment carries its slot id as data-part, so a
 * double click resolves to the compartment it landed in (getKindAndId).
 */
export const RecordBox = createFrameObject<RecordState>((state, shape) => {
	const {
		"data-kind": dataKind,
		"data-id": dataId,
		transform,
		strokeColor,
		fillColor,
		strokeWidth,
		strokeDasharray,
	} = shape;

	const { width, height } = state;
	const regions = calcRecordSlotRegions(state);

	return (
		<g data-kind={dataKind} data-id={dataId} transform={transform}>
			<RecordHeader
				data-part="name"
				x={regions.name.x}
				y={regions.name.y}
				width={regions.name.width}
				height={regions.name.height}
				fillColor={fillColor}
			/>
			<RecordRows
				data-part="rows"
				x={regions.rows.x}
				y={regions.rows.y}
				width={regions.rows.width}
				height={regions.rows.height}
				fillColor={fillColor}
			/>
			<RecordDivider
				x1={regions.rows.x}
				y1={regions.rows.y}
				x2={regions.rows.x + regions.rows.width}
				y2={regions.rows.y}
				strokeColor={strokeColor}
				strokeWidth={strokeWidth}
				strokeDasharray={strokeDasharray}
			/>
			<RecordOutline
				x={-width / 2}
				y={-height / 2}
				width={width}
				height={height}
				strokeColor={strokeColor}
				strokeWidth={strokeWidth}
				strokeDasharray={strokeDasharray}
			/>
		</g>
	);
});
