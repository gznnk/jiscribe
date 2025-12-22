import type { Diagram } from "../../types/state/core/Diagram";
import { calcUnrotatedItemableBoundingBox } from "../../utils/core/calcUnrotatedItemableBoundingBox";
import { degreesToRadians } from "../../utils/math/common/degreesToRadians";
import { rotatePoint } from "../../utils/math/points/rotatePoint";
import { isFrame } from "../../utils/validation/isFrame";
import { isItemableState } from "../../utils/validation/isItemableState";

/**
 * Adjusts a single diagram's size if its children extend beyond bounds.
 * Returns the adjusted diagram or the original if no adjustment is needed.
 *
 * @param diagram - The diagram to adjust
 * @returns The adjusted diagram or the original diagram
 */
export const adjustTargetDiagramSize = (diagram: Diagram): Diagram => {
	// Only process Frame type diagrams with itemableType === "canvas"
	if (
		!isFrame(diagram) ||
		!isItemableState(diagram) ||
		diagram.itemableType !== "canvas" ||
		!diagram.items ||
		diagram.items.length === 0
	) {
		return diagram;
	}

	// Step 1: Calculate children bounds in unrotated space
	const childrenBounds = calcUnrotatedItemableBoundingBox(
		diagram.items,
		diagram.x,
		diagram.y,
		diagram.rotation,
	);

	// Step 2: Calculate target bounds in unrotated space
	const targetCenterX = diagram.x;
	const targetCenterY = diagram.y;
	const halfWidth = diagram.width / 2;
	const halfHeight = diagram.height / 2;
	const targetBounds = {
		left: targetCenterX - halfWidth,
		top: targetCenterY - halfHeight,
		right: targetCenterX + halfWidth,
		bottom: targetCenterY + halfHeight,
	};

	// Step 3: Check if children extend beyond target bounds
	const needsResize =
		childrenBounds.left < targetBounds.left ||
		childrenBounds.right > targetBounds.right ||
		childrenBounds.top < targetBounds.top ||
		childrenBounds.bottom > targetBounds.bottom;

	if (!needsResize) {
		return diagram;
	}

	// Step 4: Calculate new bounds that contain all children
	const newLeft = Math.min(targetBounds.left, childrenBounds.left);
	const newTop = Math.min(targetBounds.top, childrenBounds.top);
	const newRight = Math.max(targetBounds.right, childrenBounds.right);
	const newBottom = Math.max(targetBounds.bottom, childrenBounds.bottom);

	// Calculate new center, width, and height
	// First calculate center in unrotated coordinate system
	const unrotatedNewCenterX = (newLeft + newRight) / 2;
	const unrotatedNewCenterY = (newTop + newBottom) / 2;

	// Rotate the new center back to the original coordinate system
	const rotationRadians = degreesToRadians(diagram.rotation);
	const rotatedNewCenter = rotatePoint(
		unrotatedNewCenterX,
		unrotatedNewCenterY,
		diagram.x,
		diagram.y,
		rotationRadians,
	);

	const newCenterX = rotatedNewCenter.x;
	const newCenterY = rotatedNewCenter.y;
	const newWidth = Math.abs(newRight - newLeft);
	const newHeight = Math.abs(newBottom - newTop);

	// Return updated diagram with new dimensions
	return {
		...diagram,
		x: newCenterX,
		y: newCenterY,
		width: newWidth,
		height: newHeight,
	} as Diagram;
};
