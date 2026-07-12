import { DbElement } from "./DbStyled";
import { DB_CAP_RATIO } from "../../../../schemas/objects/primitives/db/DbDoc";
import type { DbState } from "../../../../states/objects/primitives/db/DbState";
import { createFrameObject } from "../../base/createFrameObject";

/**
 * Builds the cylinder paths centered at the origin.
 * - body: the full silhouette (top bulge, straight sides, bottom bulge), closed for fill
 * - capEdge: the front (lower) half of the top cap ellipse, stroked only
 */
const buildDbPaths = (
	width: number,
	height: number,
): { bodyPath: string; capEdgePath: string } => {
	const halfWidth = width / 2;
	const halfHeight = height / 2;
	const capRy = height * DB_CAP_RATIO;
	const topY = -halfHeight + capRy;
	const bottomY = halfHeight - capRy;
	const arc = `${halfWidth} ${capRy} 0 0`;

	return {
		bodyPath:
			`M ${-halfWidth} ${topY} A ${arc} 1 ${halfWidth} ${topY} ` +
			`L ${halfWidth} ${bottomY} A ${arc} 1 ${-halfWidth} ${bottomY} Z`,
		capEdgePath: `M ${-halfWidth} ${topY} A ${arc} 0 ${halfWidth} ${topY}`,
	};
};

/** Renders a database cylinder (Frame-family shared logic lives in createFrameObject; only the shape is swapped in). */
export const Db = createFrameObject<DbState>((state, shape) => {
	const { bodyPath, capEdgePath } = buildDbPaths(state.width, state.height);
	return (
		<g data-kind="object" data-id={state.id} style={{ cursor: "grab" }}>
			<DbElement
				d={bodyPath}
				transform={shape.transform}
				strokeColor={shape.strokeColor}
				fillColor={shape.fillColor}
				strokeWidth={shape.strokeWidth}
				strokeDasharray={shape.strokeDasharray}
			/>
			{/* Cap edge is decoration only; the body silhouette handles hit testing */}
			<DbElement
				d={capEdgePath}
				transform={shape.transform}
				strokeColor={shape.strokeColor}
				fillColor="none"
				strokeWidth={shape.strokeWidth}
				strokeDasharray={shape.strokeDasharray}
				style={{ pointerEvents: "none" }}
			/>
		</g>
	);
});
