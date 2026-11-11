import type { Point, Rect } from "@jiscribe/geometry";

import type { LayoutEdgeAnchor } from "./types";

/** Where an anchor sits on a box, in the same coordinates as `bounds`. */
export const calcAnchorPoint = (
	bounds: Rect,
	anchor: LayoutEdgeAnchor,
): Point => {
	switch (anchor.side) {
		case "top":
			return { x: bounds.x + bounds.width * anchor.t, y: bounds.y };
		case "bottom":
			return {
				x: bounds.x + bounds.width * anchor.t,
				y: bounds.y + bounds.height,
			};
		case "left":
			return { x: bounds.x, y: bounds.y + bounds.height * anchor.t };
		case "right":
			return {
				x: bounds.x + bounds.width,
				y: bounds.y + bounds.height * anchor.t,
			};
	}
};
