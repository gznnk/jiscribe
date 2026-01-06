import type { TransformedFrame, Point, TransformedRect, TransformedEllipse } from "@workspace/geometry";
import {
	convertTransformedEllipseToFrame,
	convertPointsToFrame,
	convertTransformedRectToFrame,
} from "@workspace/geometry";

import { convertDiagramToPoint } from "./convertDiagramToPoint";
import type { Diagram } from "../../types/state/core/Diagram";
import { isPolyState } from "../validation/isPolyState";

export const convertDiagramToFrame = (diagram: Diagram): TransformedFrame | undefined => {
	if (diagram.geometryType === "rect") {
		// Type assertion: we know from geometryType that diagram has rect properties
		const d = diagram as Diagram & TransformedRect;
		const rect: TransformedRect = {
			x: d.x,
			y: d.y,
			width: d.width,
			height: d.height,
			rotation: d.rotation,
			scaleX: d.scaleX,
			scaleY: d.scaleY,
		};
		return convertTransformedRectToFrame(rect);
	}
	if (diagram.geometryType === "ellipse") {
		// Type assertion: we know from geometryType that diagram has ellipse properties
		const d = diagram as Diagram & TransformedEllipse;
		const ellipse: TransformedEllipse = {
			cx: d.cx,
			cy: d.cy,
			rx: d.rx,
			ry: d.ry,
			rotation: d.rotation,
			scaleX: d.scaleX,
			scaleY: d.scaleY,
		};
		return convertTransformedEllipseToFrame(ellipse);
	}
	if (diagram.geometryType === "poly" && isPolyState(diagram)) {
		const points = diagram.points
			.map(convertDiagramToPoint)
			.filter((p): p is Point => p !== undefined);
		return convertPointsToFrame(points);
	}
	return undefined;
};
