import type { Ellipse, Point, Rect } from "@workspace/geometry";
import { isEllipse, isPoint, isRect } from "@workspace/geometry";

import type { Diagram } from "../../types/state/core/Diagram";

export const applyPointToDiagram = (
	point: Point,
	diagram: Diagram,
): Diagram => {
	if (isRect(diagram)) {
		return {
			...diagram,
			x: point.x,
			y: point.y,
		} as Diagram & Rect;
	}
	if (isEllipse(diagram)) {
		return {
			...diagram,
			cx: point.x,
			cy: point.y,
		} as Diagram & Ellipse;
	}
	if (isPoint(diagram)) {
		return {
			...diagram,
			x: point.x,
			y: point.y,
		} as Diagram & Point;
	}
	return diagram;
};
