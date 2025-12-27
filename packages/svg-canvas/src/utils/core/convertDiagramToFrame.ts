import type { Frame } from "@workspace/geometry";
import { isEllipse, isRect } from "@workspace/geometry";

import type { Diagram } from "../../types/state/core/Diagram";

export const convertDiagramToFrame = (diagram: Diagram): Frame | undefined => {
	if (diagram.geometryType === "rect" && isRect(diagram)) {
		const cx = diagram.x + diagram.width / 2;
		const cy = diagram.y + diagram.height / 2;
		return {
			cx,
			cy,
			width: diagram.width,
			height: diagram.height,
			rotation: diagram.rotation ?? 0,
			scaleX: diagram.scaleX ?? 1,
			scaleY: diagram.scaleY ?? 1,
		};
	}
	if (diagram.geometryType === "ellipse" && isEllipse(diagram)) {
		const cx = diagram.cx;
		const cy = diagram.cy;
		const width = diagram.rx * 2;
		const height = diagram.ry * 2;
		return {
			cx,
			cy,
			width,
			height,
			rotation: diagram.rotation ?? 0,
			scaleX: diagram.scaleX ?? 1,
			scaleY: diagram.scaleY ?? 1,
		};
	}
	return undefined;
};
