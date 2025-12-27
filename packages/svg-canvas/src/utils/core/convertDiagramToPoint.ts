import { isEllipse, isPoint, isRect, type Point } from "@workspace/geometry";

import type { Diagram } from "../../types/state/core/Diagram";
import { isItemableState } from "../validation/isItemableState";

export const convertDiagramToPoint = (diagram: Diagram): Point | undefined => {
	if (diagram.geometryType === "rect" && isRect(diagram)) {
		return { x: diagram.x, y: diagram.y };
	}
	if (diagram.geometryType === "ellipse" && isEllipse(diagram)) {
		return { x: diagram.cx, y: diagram.cy };
	}
	if (diagram.geometryType === "point" && isPoint(diagram)) {
		return { x: diagram.x, y: diagram.y };
	}
	if (diagram.geometryType === "poly") {
		if (isItemableState(diagram) && diagram.items.length > 0) {
			return convertDiagramToPoint(diagram.items[0]);
		}
	}
	return undefined;
};
