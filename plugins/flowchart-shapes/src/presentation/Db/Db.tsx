import { ShapeBodyPath, createFrameObject } from "@jiscribe/canvas-sdk";

import { buildDbPaths } from "./buildDbPaths";
import type { DbState } from "../../state/db/DbState";

/** Renders a database cylinder (Frame-family shared logic lives in createFrameObject; only the shape is swapped in). */
export const Db = createFrameObject<DbState>((state, shape) => {
	const { bodyPath, capEdgePath } = buildDbPaths(state.width, state.height);
	return (
		<g data-kind="object" data-id={state.id} style={{ cursor: "grab" }}>
			<ShapeBodyPath
				d={bodyPath}
				transform={shape.transform}
				strokeColor={shape.strokeColor}
				strokeAlpha={shape.strokeAlpha}
				fillColor={shape.fillColor}
				fillAlpha={shape.fillAlpha}
				strokeWidth={shape.strokeWidth}
				strokeDasharray={shape.strokeDasharray}
			/>
			{/* Cap edge is decoration only; the body silhouette handles hit testing */}
			<ShapeBodyPath
				d={capEdgePath}
				transform={shape.transform}
				strokeColor={shape.strokeColor}
				strokeAlpha={shape.strokeAlpha}
				fillColor="none"
				strokeWidth={shape.strokeWidth}
				strokeDasharray={shape.strokeDasharray}
				style={{ pointerEvents: "none" }}
			/>
		</g>
	);
});
