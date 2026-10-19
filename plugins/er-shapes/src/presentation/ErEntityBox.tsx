import { textSlotPart } from "@jiscribe/canvas";
import { createFrameObject } from "@jiscribe/canvas-sdk";

import { calcErEntityColumnSlotBands } from "./calcErEntityTextSlotRegions";
import {
	ErEntityBody,
	ErEntityDivider,
	ErEntityOutline,
	ErEntitySlotHitArea,
} from "./ErEntityBoxStyled";
import { readCachedErEntityLayout } from "../layout/readCachedErEntityLayout";
import { erEntityColumnTextSlotId } from "../schema/erEntityColumnIds";
import {
	ER_ENTITY_COLUMN_FIELDS,
	ER_ENTITY_NAME_TEXT_SLOT_ID,
} from "../schema/ErEntityDoc";
import type { ErEntityState } from "../state/ErEntityState";

/**
 * Entity presentation: the body fill, one invisible hit area per slot, the
 * divider under the title band and the border. The title band takes the body's fill and is set off
 * by its divider alone. Shared Frame logic (transform, color resolution, the
 * per-slot text overlays placed by calcErEntityTextSlotRegions, memo) lives in
 * createFrameObject. The layout is
 * taken from the slots rather than from the state's `height`, so the entity is
 * drawn whole even on the render before the content resizer has written the
 * derived size back.
 */
export const ErEntityBox = createFrameObject<ErEntityState>((state, shape) => {
	const {
		"data-kind": dataKind,
		"data-id": dataId,
		transform,
		strokeColor,
		strokeAlpha,
		fillColor,
		fillAlpha,
		strokeWidth,
		strokeDasharray,
	} = shape;

	const layout = readCachedErEntityLayout(state);
	const { header } = layout;
	const left = -layout.width / 2;
	const top = -layout.height / 2;
	const linework = {
		strokeColor,
		strokeAlpha,
		strokeWidth,
		strokeDasharray,
	};
	const dividerY = header.y + header.height;

	return (
		<g data-kind={dataKind} data-id={dataId} transform={transform}>
			<ErEntityBody
				x={left}
				y={top}
				width={layout.width}
				height={layout.height}
				fillColor={fillColor}
				fillAlpha={fillAlpha}
			/>
			<ErEntitySlotHitArea
				data-part={textSlotPart(ER_ENTITY_NAME_TEXT_SLOT_ID)}
				x={header.x}
				y={header.y}
				width={header.width}
				height={header.height}
			/>
			{calcErEntityColumnSlotBands(layout).flatMap((bands) =>
				ER_ENTITY_COLUMN_FIELDS.map((field) => {
					const slotId = erEntityColumnTextSlotId(bands.columnIndex, field);
					const band = bands[field];
					return (
						<ErEntitySlotHitArea
							key={slotId}
							data-part={textSlotPart(slotId)}
							x={band.x}
							y={band.y}
							width={band.width}
							height={band.height}
						/>
					);
				}),
			)}
			<ErEntityDivider
				x1={left}
				y1={dividerY}
				x2={left + layout.width}
				y2={dividerY}
				{...linework}
			/>
			<ErEntityOutline
				x={left}
				y={top}
				width={layout.width}
				height={layout.height}
				{...linework}
			/>
		</g>
	);
});
