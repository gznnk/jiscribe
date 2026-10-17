import { createFrameObject } from "@jiscribe/canvas-sdk";

import { TableGrid } from "./TableGrid";
import { readCachedTableLayout } from "../layout/readCachedTableLayout";
import type { TableState } from "../state/TableState";

/**
 * Table presentation: a grid of cells under the rules that divide them. Shared
 * Frame logic (transform, color resolution, per-cell text overlays placed by
 * calcTableTextSlotRegions, memo) lives in createFrameObject; here we wrap the
 * grid (TableGrid) in the object's transform. The wrapping <g> carries the
 * object's data-kind/data-id.
 *
 * The text is drawn by createFrameObject, which gives every key of `state.text`
 * an overlay of its own — one per cell, `features.text` being `"slots"`.
 *
 * The box is taken from the layout rather than from the state's own
 * `width` / `height`, so the grid is drawn whole even on the render before the
 * content resizer has written the derived size back (see calcTableFrameSize).
 *
 * The transform is the only thing a move or a rotation changes here: the grid
 * receives the cached layout and the cells, both of which such a drag keeps,
 * and so is not drawn again for it.
 */
export const Table = createFrameObject<TableState>((state, shape) => {
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

	return (
		<g data-kind={dataKind} data-id={dataId} transform={transform}>
			<TableGrid
				layout={readCachedTableLayout(state)}
				text={state.text}
				strokeColor={strokeColor}
				strokeAlpha={strokeAlpha}
				fillColor={fillColor}
				fillAlpha={fillAlpha}
				strokeWidth={strokeWidth}
				strokeDasharray={strokeDasharray}
			/>
		</g>
	);
});
