import { ShapeBodyPath, createFrameObject } from "@jiscribe/canvas-sdk";

import { buildDbPaths } from "./buildDbPaths";
import { DbCapEdgePath, DbRootGroup } from "./DbStyled";
import type { DbState } from "../../state/db/DbState";

/** Renders a database cylinder (Frame-family shared logic lives in createFrameObject; only the shape is swapped in). */
export const Db = createFrameObject<DbState>((state, shape) => {
	const { bodyPath, capEdgePath } = buildDbPaths(state.width, state.height);
	return (
		<DbRootGroup data-kind="object" data-id={state.id}>
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
			<DbCapEdgePath
				d={capEdgePath}
				transform={shape.transform}
				strokeColor={shape.strokeColor}
				strokeAlpha={shape.strokeAlpha}
				fillColor="none"
				strokeWidth={shape.strokeWidth}
				strokeDasharray={shape.strokeDasharray}
			/>
		</DbRootGroup>
	);
});
