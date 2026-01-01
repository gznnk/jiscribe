import type { Frame, Point } from "@workspace/geometry";
import {
	convertEllipseToFrame,
	convertPointsToFrame,
	convertRectToFrame,
	isEllipse,
	isRect,
} from "@workspace/geometry";

import { convertDiagramToPoint } from "./convertDiagramToPoint";
import type { Diagram } from "../../types/state/core/Diagram";
import { isPolyState } from "../validation/isPolyState";

export const convertDiagramToFrame = (diagram: Diagram): Frame | undefined => {
	if (diagram.geometryType === "rect" && isRect(diagram)) {
		return convertRectToFrame(diagram);
	}
	if (diagram.geometryType === "ellipse" && isEllipse(diagram)) {
		return convertEllipseToFrame(diagram);
	}
	if (diagram.geometryType === "poly" && isPolyState(diagram)) {
		const points = diagram.points
			.map(convertDiagramToPoint)
			.filter((p): p is Point => p !== undefined);
		return convertPointsToFrame(points);
	}
	return undefined;
};
