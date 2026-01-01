import type { Frame, Point } from "@workspace/geometry";
import {
	convertEllipseGeometryToFrame,
	convertPointsToFrame,
	convertRectGeometryToFrame,
	isEllipse,
	isRect,
} from "@workspace/geometry";

import { convertDiagramToPoint } from "./convertDiagramToPoint";
import type { Diagram } from "../../types/state/core/Diagram";
import { isItemableState } from "../validation/isItemableState";

export const convertDiagramToFrame = (diagram: Diagram): Frame | undefined => {
	if (diagram.geometryType === "rect" && isRect(diagram)) {
		return convertRectGeometryToFrame(diagram);
	}
	if (diagram.geometryType === "ellipse" && isEllipse(diagram)) {
		return convertEllipseGeometryToFrame(diagram);
	}
	// TODO: polyはpointsで持つようにしたい
	if (diagram.geometryType === "poly" && isItemableState(diagram)) {
		const points = diagram.items
			.map(convertDiagramToPoint)
			.filter((p): p is Point => p !== undefined);
		return convertPointsToFrame(points);
	}
	return undefined;
};
