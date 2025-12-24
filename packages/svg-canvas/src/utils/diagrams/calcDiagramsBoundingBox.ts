import {
	calcElementsBoundingBox,
	type Box,
	type Frame,
	type Point,
} from "@workspace/geometry";

import type { Diagram } from "../../types/state/core/Diagram";

export const calcDiagramsBoundingBox = (diagrams: Diagram[]): Box => {
	const elements: (Point | Frame)[] = diagrams.map((d) => {
		if ("width" in d && "height" in d) {
			return d as unknown as Frame;
		}
		return { x: d.x, y: d.y };
	});
	return calcElementsBoundingBox(elements);
};
