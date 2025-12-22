import { affineTransformation } from "./affineTransformation";
import type { Diagram } from "../../../types/state/core/Diagram";
import type { DiagramBaseState } from "../../../types/state/core/DiagramBaseState";
import { isFrame } from "../../validation/isFrame";
import { degreesToRadians } from "../common/degreesToRadians";

/**
 * Transforms relative coordinates to absolute coordinates based on target diagram properties.
 *
 * @param diagrams - Array of diagrams with relative coordinates to transform
 * @param targetDiagram - Target diagram that defines the coordinate space
 * @returns Array of diagrams with absolute coordinates
 */
export const transformRelativeToAbsoluteCoordinates = (
	diagrams: Diagram[],
	targetDiagram: DiagramBaseState,
): Diagram[] => {
	// Get target diagram center position
	const { x: targetCenterX, y: targetCenterY } = targetDiagram;

	return diagrams.map((diagram) => {
		// Check if target diagram has transformation properties
		if (isFrame(targetDiagram)) {
			const {
				width,
				height,
				rotation = 0,
				scaleX = 1,
				scaleY = 1,
			} = targetDiagram;

			// Convert rotation to radians
			const rotationRadians = degreesToRadians(rotation);

			// For relative coordinates within the frame, we need to:
			// 1. Treat the relative coordinates as offsets from the frame's top-left corner
			// 2. Convert these to offsets from the frame's center
			// 3. Apply the frame's transformation (scale, rotation)
			// 4. Add the frame's center position

			// Convert relative coordinates to offsets from center
			// Assuming relative coordinates are from top-left of the frame
			const offsetFromCenterX = diagram.x - width / 2;
			const offsetFromCenterY = diagram.y - height / 2;

			// Apply affine transformation to convert frame-relative coordinates to absolute
			const transformedPosition = affineTransformation(
				offsetFromCenterX, // offset from frame center x
				offsetFromCenterY, // offset from frame center y
				scaleX, // target frame's x scale
				scaleY, // target frame's y scale
				rotationRadians, // target frame's rotation
				targetCenterX, // target frame's center x position
				targetCenterY, // target frame's center y position
			);

			// Apply child diagram's own transformations if they exist
			// Check if the diagram itself has transformation properties (like frames or transformable shapes)
			const childRotation = isFrame(diagram) ? diagram.rotation : 0;
			const childScaleX = isFrame(diagram) ? diagram.scaleX : 1;
			const childScaleY = isFrame(diagram) ? diagram.scaleY : 1;

			// Combine parent and child transformations
			const finalRotation = rotation + childRotation;
			const finalScaleX = scaleX * childScaleX;
			const finalScaleY = scaleY * childScaleY;

			// Return diagram with transformed coordinates and combined transformations
			return {
				...diagram,
				x: transformedPosition.x,
				y: transformedPosition.y,
				rotation: finalRotation,
				scaleX: finalScaleX,
				scaleY: finalScaleY,
			};
		} else {
			// For non-frame targets, just add target center position as offset
			// This assumes the relative coordinates are offsets from the target center

			// Apply child diagram's own transformations if they exist
			// (for non-frame targets, we don't inherit parent transformations, only position)
			// Check if the diagram itself has transformation properties (like frames or transformable shapes)
			const childRotation = isFrame(diagram) ? diagram.rotation : 0;
			const childScaleX = isFrame(diagram) ? diagram.scaleX : 1;
			const childScaleY = isFrame(diagram) ? diagram.scaleY : 1;

			return {
				...diagram,
				x: diagram.x + targetCenterX,
				y: diagram.y + targetCenterY,
				rotation: childRotation,
				scaleX: childScaleX,
				scaleY: childScaleY,
			};
		}
	});
};
