import type { OrthogonalDirection } from "../types/OrthogonalDirection";

/** 反対方向を返す。 */
export const oppositeDirection = (
	d: OrthogonalDirection,
): OrthogonalDirection => {
	switch (d) {
		case "up":
			return "down";
		case "down":
			return "up";
		case "left":
			return "right";
		case "right":
			return "left";
	}
};
