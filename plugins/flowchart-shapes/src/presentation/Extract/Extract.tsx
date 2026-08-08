import {
	BelowLabelHitArea,
	ShapeBodyPolygon,
	createFrameObject,
} from "@workspace/canvas-sdk";

import { buildExtractPoints } from "./buildExtractPoints";
import type { ExtractState } from "../../state/extract/ExtractState";

/**
 * Extract presentation (shared Frame logic lives in createFrameObject; only the
 * shape is swapped in). The triangle narrows to a point, so the label hangs
 * below the box and needs a grab area outside the silhouette — hence the group,
 * which is the single `data-kind="object"` element the DOM contract allows; the
 * parts inside carry none.
 */
export const Extract = createFrameObject<ExtractState>((state, shape) => (
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
			points={buildExtractPoints(
				-state.width / 2,
				-state.height / 2,
				state.width,
				state.height,
			)}
		/>
	</g>
));
