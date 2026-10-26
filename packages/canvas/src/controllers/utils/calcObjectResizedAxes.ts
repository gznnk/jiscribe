import type { Transform } from "@jiscribe/geometry";
import { degreesToRadians } from "@jiscribe/geometry";

import { classifyChildRelativeRotation } from "./classifyChildRelativeRotation";
import type { ObjectState } from "../../states/objects/base/ObjectState";
import type {
	ResizedAxes,
	ResizeHeldEdge,
} from "../../states/registry/ObjectContentResizerRegistry";
import type { TransformDragResize } from "../CanvasTypes";

const flipHeldEdge = (edge: ResizeHeldEdge): ResizeHeldEdge => {
	if (edge === "center") {
		return edge;
	}
	return edge === "start" ? "end" : "start";
};

/**
 * The edge one of the object's axes holds: the one the frame axis it runs along
 * holds, turned round when the two point opposite ways. An oblique object is
 * scaled along both of its axes by any written frame axis (transformFrameByGroup
 * approximates it), so an axis whose own frame axis is not written holds its
 * middle. `dotWidth` / `dotHeight` are the object axis' dot products with the
 * frame's x and y axes, flips included.
 */
const calcHeldEdgeAlong = (
	resize: TransformDragResize,
	dotWidth: number,
	dotHeight: number,
	isOblique: boolean,
): ResizeHeldEdge | undefined => {
	const runsAlongWidth = Math.abs(dotWidth) >= Math.abs(dotHeight);
	const frameEdge = runsAlongWidth ? resize.axes.width : resize.axes.height;
	if (frameEdge === undefined) {
		const writesAnyAxis =
			resize.axes.width !== undefined || resize.axes.height !== undefined;
		return isOblique && writesAnyAxis ? "center" : undefined;
	}
	return (runsAlongWidth ? dotWidth : dotHeight) < 0
		? flipHeldEdge(frameEdge)
		: frameEdge;
};

/**
 * The axes a transform-handle resize writes onto one object, in the object's own
 * frame: the dragged frame's axes turned through the object's rotation and flips
 * relative to it. A child turned 90° in a group resized by its side handles has
 * its height written, and one flipped against the frame holds the opposite edge.
 *
 * @param resize - The resize under way (the `"transform"` drag's `resize`), stated in the dragged frame
 * @param object - The object the resize reaches: the selected one, or one a group or multi-select resize scales; one without a transform reads as unrotated and unflipped
 * @returns `resize.axes` itself for an object aligned with the frame, else the restated axes
 */
export const calcObjectResizedAxes = (
	resize: TransformDragResize,
	object: ObjectState,
): ResizedAxes => {
	// Read field by field rather than through isTransform: this runs for every
	// object a resize frame changes.
	const { rotation = 0, scaleX = 1, scaleY = 1 } = object as Partial<Transform>;
	const { frame } = resize;
	if (
		rotation === frame.rotation &&
		scaleX === frame.scaleX &&
		scaleY === frame.scaleY
	) {
		return resize.axes;
	}
	const isOblique =
		classifyChildRelativeRotation(rotation, frame.rotation) === "oblique";
	// The axes' dot products reduce to the relative rotation: the object's x axis
	// is scaleX·(cos, sin) of its rotation, its y axis scaleY·(−sin, cos).
	const relativeRadians = degreesToRadians(rotation - frame.rotation);
	const cos = Math.cos(relativeRadians);
	const sin = Math.sin(relativeRadians);
	const width = calcHeldEdgeAlong(
		resize,
		scaleX * frame.scaleX * cos,
		scaleX * frame.scaleY * sin,
		isOblique,
	);
	const height = calcHeldEdgeAlong(
		resize,
		-scaleY * frame.scaleX * sin,
		scaleY * frame.scaleY * cos,
		isOblique,
	);
	return {
		...(width && { width }),
		...(height && { height }),
	};
};
