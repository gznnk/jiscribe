import {
	type TransformedEllipse,
	type TransformedRect,
	type TransformedFrame,
	isRect,
	isEllipse,
} from "@workspace/geometry";

import type { Diagram } from "../../types/state/core/Diagram";

export const applyFrameToDiagram = (
	frame: TransformedFrame,
	diagram: Diagram,
): Diagram | undefined => {
	if (isRect(diagram)) {
		// For rectangle-based diagrams, directly map frame properties
		const x = frame.cx - frame.width / 2;
		const y = frame.cy - frame.height / 2;
		return {
			...diagram,
			x,
			y,
			width: frame.width,
			height: frame.height,
			rotation: frame.rotation,
			scaleX: frame.scaleX,
			scaleY: frame.scaleY,
		} as Diagram & TransformedRect;
	}
	if (isEllipse(diagram)) {
		// For ellipse-based diagrams, calculate rx and ry from width and height
		const rx = frame.width / 2;
		const ry = frame.height / 2;
		return {
			...diagram,
			cx: frame.cx,
			cy: frame.cy,
			rx,
			ry,
			rotation: frame.rotation,
			scaleX: frame.scaleX,
			scaleY: frame.scaleY,
		} as Diagram & TransformedEllipse;
	}

	return undefined;
};
