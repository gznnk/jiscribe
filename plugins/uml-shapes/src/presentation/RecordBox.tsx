import { createFrameObject } from "@workspace/canvas/unstable";
import type { Rect } from "@workspace/geometry";

import { calcRecordSlotRegions } from "./calcRecordSlotRegions";
import {
	RecordCompartment,
	RecordDivider,
	RecordOutline,
} from "./RecordBoxStyled";
import { RECORD_SLOT_IDS } from "../schema/RecordDoc";
import type { RecordState } from "../state/RecordState";

/**
 * Record presentation: a title band over one or two compartments of rows. Shared
 * Frame logic (transform, color resolution, per-slot text overlays placed by
 * calcRecordTextRegion, memo) lives in createFrameObject; here we draw the
 * compartments and the linework. The wrapping <g> carries the object's
 * data-kind/data-id, and each compartment carries its slot id as data-part, so a
 * double click resolves to the compartment it landed in (getKindAndId).
 *
 * Every fill is laid down before any line, so a compartment's fill can never
 * cover the divider above it.
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
	const regions: Record<string, Rect | undefined> =
		calcRecordSlotRegions(state);
	// Top to bottom: the canonical slot order, minus the compartments this box
	// does not have.
	const compartments = RECORD_SLOT_IDS.flatMap((slotId) => {
		const region = regions[slotId];
		return region === undefined ? [] : [{ slotId, region }];
	});

	return (
		<g data-kind={dataKind} data-id={dataId} transform={transform}>
			{compartments.map(({ slotId, region }) => (
				<RecordCompartment
					key={slotId}
					data-part={slotId}
					x={region.x}
					y={region.y}
					width={region.width}
					height={region.height}
					fillColor={fillColor}
				/>
			))}
			{compartments.slice(1).map(({ slotId, region }) => (
				<RecordDivider
					key={slotId}
					x1={region.x}
					y1={region.y}
					x2={region.x + region.width}
					y2={region.y}
					strokeColor={strokeColor}
					strokeWidth={strokeWidth}
					strokeDasharray={strokeDasharray}
				/>
			))}
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
