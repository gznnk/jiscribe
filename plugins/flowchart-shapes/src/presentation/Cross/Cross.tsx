import {
	BelowLabelHitArea,
	ShapeBodyPolygon,
	createFrameObject,
} from "@jiscribe/canvas-sdk";

import { buildCrossPoints } from "./buildCrossPoints";
import type { CrossState } from "../../state/cross/CrossState";

/**
 * Cross presentation (shared Frame logic lives in createFrameObject; only the
 * shape is swapped in). The arms fill the box, so the label hangs below it and
 * needs a grab area outside the silhouette — hence the group, which is the
 * single `data-kind="object"` element the DOM contract allows; the parts inside
 * carry none.
 */
export const Cross = createFrameObject<CrossState>((state, shape) => (
	<g
		data-kind={shape["data-kind"]}
		data-id={shape["data-id"]}
		transform={shape.transform}
	>
		<BelowLabelHitArea state={state} />
		<ShapeBodyPolygon
			strokeColor={shape.strokeColor}
			fillColor={shape.fillColor}
			strokeWidth={shape.strokeWidth}
			strokeDasharray={shape.strokeDasharray}
			points={buildCrossPoints(
				-state.width / 2,
				-state.height / 2,
				state.width,
				state.height,
			)}
		/>
	</g>
));
