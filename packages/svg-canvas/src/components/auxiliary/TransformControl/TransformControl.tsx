import type React from "react";
import { memo, useCallback, useEffect, useRef, useState } from "react";

import { ROTATE_POINT_MARGIN } from "./TransformControlConstants";
import { EVENT_NAME_TRANSFORM_CONTROL_CLICK } from "../../../constants/core/EventNames";
import { useEventBus } from "../../../context/EventBusContext";
import type { DiagramType } from "../../../types/core/DiagramType";
import type { Point } from "../../../types/core/Point";
import type { DiagramClickEvent } from "../../../types/events/DiagramClickEvent";
import type { DiagramDragEvent } from "../../../types/events/DiagramDragEvent";
import type { DiagramTransformEvent } from "../../../types/events/DiagramTransformEvent";
import type { EventPhase } from "../../../types/events/EventPhase";
import type { TransformativeState } from "../../../types/state/core/TransformativeState";
import { newEventId } from "../../../utils/core/newEventId";
import { degreesToRadians } from "../../../utils/math/common/degreesToRadians";
import { nanToZero } from "../../../utils/math/common/nanToZero";
import { radiansToDegrees } from "../../../utils/math/common/radiansToDegrees";
import { signNonZero } from "../../../utils/math/common/signNonZero";
import { calcRectangleVertices } from "../../../utils/math/geometry/calcRectangleVertices";
import { createLinearX2yFunction } from "../../../utils/math/geometry/createLinearX2yFunction";
import { createLinearY2xFunction } from "../../../utils/math/geometry/createLinearY2xFunction";
import { calcClosestCircleIntersection } from "../../../utils/math/points/calcClosestCircleIntersection";
import { calcRadians } from "../../../utils/math/points/calcRadians";
import { efficientAffineTransformation } from "../../../utils/math/transform/efficientAffineTransformation";
import { efficientInverseAffineTransformation } from "../../../utils/math/transform/efficientInverseAffineTransformation";
import { getCursorFromAngle } from "../../../utils/shapes/common/getCursorFromAngle";
import { BottomLabel } from "../../core/BottomLabel";
import { DragLine } from "../../core/DragLine";
import { DragPoint } from "../../core/DragPoint";
import { RotatePoint } from "../../core/RotatePoint";

/**
 * Props for the Transformative component.
 * Combines transformation data, selection state, and transformation event handlers.
 */
type Props = TransformativeState & {
	id: string;
	type: DiagramType;
	zoom?: number;
	onTransform?: (e: DiagramTransformEvent) => void;
};

/**
 * Component that handles transformation of diagram elements.
 * Provides handles for resizing, rotating, and moving elements on the canvas.
 */
const TransformControlComponent: React.FC<Props> = ({
	id,
	x,
	y,
	width,
	height,
	minWidth = 0,
	minHeight = 0,
	rotation,
	scaleX,
	scaleY,
	keepProportion,
	rotateEnabled,
	inversionEnabled,
	zoom = 1,
	onTransform,
}) => {
	const eventBus = useEventBus();

	const [isResizing, setIsResizing] = useState(false);
	const [isRotating, setIsRotating] = useState(false);
	const [isShiftKeyDown, setShiftKeyDown] = useState(false);

	const doKeepProportion = keepProportion || isShiftKeyDown;

	const startFrame = useRef({
		x,
		y,
		width,
		height,
		rotation,
		scaleX,
		scaleY,
		aspectRatio: width / height,
		...calcRectangleVertices({
			x,
			y,
			width,
			height,
			rotation,
			scaleX,
			scaleY,
		}),
	});

	const vertices = calcRectangleVertices({
		x,
		y,
		width,
		height,
		rotation,
		scaleX,
		scaleY,
	});

	const radians = degreesToRadians(rotation);
	const isSwapped = (rotation + 405) % 180 > 90;

	const affineTransformationOnDrag = (x: number, y: number) =>
		efficientAffineTransformation(
			x,
			y,
			1,
			1,
			radians,
			startFrame.current.x,
			startFrame.current.y,
		);

	const inverseAffineTransformationOnDrag = (x: number, y: number) =>
		efficientInverseAffineTransformation(
			x,
			y,
			1,
			1,
			radians,
			startFrame.current.x,
			startFrame.current.y,
		);

	const recordStartFrame = () => {
		startFrame.current = {
			x,
			y,
			width,
			height,
			rotation,
			scaleX,
			scaleY,
			aspectRatio: width / height,
			...vertices,
		};
	};

	const triggerTransform = (
		e: DiagramDragEvent,
		centerPoint: Point,
		newWidth: number,
		newHeight: number,
	) => {
		const event = {
			eventId: e.eventId,
			eventPhase: e.eventPhase,
			id,
			startFrame: {
				...startFrame.current,
			},
			endFrame: {
				x: centerPoint.x,
				y: centerPoint.y,
				width: Math.abs(newWidth),
				height: Math.abs(newHeight),
				scaleX: signNonZero(newWidth),
				scaleY: signNonZero(newHeight),
				rotation,
			},
			cursorX: e.cursorX,
			cursorY: e.cursorY,
			minX: e.minX,
			minY: e.minY,
		};

		onTransform?.(event);
	};

	const setResizingByEvent = (eventPhase: EventPhase) => {
		if (eventPhase === "Started") {
			setIsResizing(true);
		} else if (eventPhase === "Ended") {
			setIsResizing(false);
		}
	};

	/**
	 * Calculates the height that maintains the original aspect ratio.
	 *
	 * @param width - The new width (can be negative when flipped)
	 * @param aspectRatio - The original aspect ratio (width / height)
	 * @param scaleX - Horizontal scaling factor (can include flip)
	 * @param scaleY - Vertical scaling factor (can include flip)
	 * @returns The calculated height, preserving the aspect ratio
	 */
	const calcHeightWithAspectRatio = (
		width: number,
		aspectRatio: number,
		scaleX: number,
		scaleY: number,
	) => {
		return nanToZero(width / aspectRatio) * scaleX * scaleY;
	};

	/**
	 * Calculates the width that maintains the original aspect ratio.
	 *
	 * @param height - The new height (can be negative when flipped)
	 * @param aspectRatio - The original aspect ratio (width / height)
	 * @param scaleX - Horizontal scaling factor (can include flip)
	 * @param scaleY - Vertical scaling factor (can include flip)
	 * @returns The calculated width, preserving the aspect ratio
	 */
	const calcWidthWithAspectRatio = (
		height: number,
		aspectRatio: number,
		scaleX: number,
		scaleY: number,
	) => {
		return nanToZero(height * aspectRatio) * scaleX * scaleY;
	};

	/**
	 * Checks if dimensions are below minimum values and adjusts them.
	 * Also handles inversion prevention when inversionEnabled is false.
	 * Returns adjusted dimensions that meet minimum requirements.
	 */
	const enforceMinimumDimensions = (
		newWidth: number,
		newHeight: number,
		aspectRatio?: number,
		shouldKeepProportion?: boolean,
	): { width: number; height: number } => {
		// If inversion is disabled, prevent negative dimensions
		if (!inversionEnabled) {
			if (newWidth < 0) {
				newWidth = Math.max(minWidth, 0);
			}
			if (newHeight < 0) {
				newHeight = Math.max(minHeight, 0);
			}
		}

		const absWidth = Math.abs(newWidth);
		const absHeight = Math.abs(newHeight);
		const widthSign = signNonZero(newWidth);
		const heightSign = signNonZero(newHeight);

		// Check if either dimension is below minimum
		const widthBelowMin = absWidth < minWidth;
		const heightBelowMin = absHeight < minHeight;

		if (!widthBelowMin && !heightBelowMin) {
			return { width: newWidth, height: newHeight };
		}

		if (!shouldKeepProportion || !aspectRatio) {
			// Without proportion constraint, just enforce minimums independently
			return {
				width: widthBelowMin ? minWidth * widthSign : newWidth,
				height: heightBelowMin ? minHeight * heightSign : newHeight,
			};
		}

		// With proportion constraint, we need to adjust both dimensions
		// Choose the constraint that results in larger dimensions
		const minWidthFromHeight = minHeight * aspectRatio;
		const minHeightFromWidth = minWidth / aspectRatio;

		let adjustedWidth: number;
		let adjustedHeight: number;

		if (minWidthFromHeight > minWidth) {
			// Height constraint is more restrictive
			adjustedHeight = minHeight * heightSign;
			adjustedWidth = minWidthFromHeight * widthSign;
		} else {
			// Width constraint is more restrictive
			adjustedWidth = minWidth * widthSign;
			adjustedHeight = minHeightFromWidth * heightSign;
		}

		return {
			width: adjustedWidth,
			height: adjustedHeight,
		};
	};

	// Create references bypass to avoid function creation in every render.
	const refBusVal = {
		// Component properties
		id,
		x,
		y,
		width,
		height,
		rotation,
		scaleX,
		scaleY,
		zoom,
		onTransform,
		// Internal variables and functions
		vertices,
		doKeepProportion,
		isSwapped,
		affineTransformationOnDrag,
		inverseAffineTransformationOnDrag,
		recordStartFrame,
		triggerTransform,
		setResizingByEvent,
		calcHeightWithAspectRatio,
		calcWidthWithAspectRatio,
		enforceMinimumDimensions,
		minWidth,
		minHeight,
	};
	const refBus = useRef(refBusVal);
	refBus.current = refBusVal;

	// --- LeftTop Start --- //
	const handleDragLeftTop = useCallback((e: DiagramDragEvent) => {
		const {
			doKeepProportion,
			inverseAffineTransformationOnDrag,
			affineTransformationOnDrag,
			recordStartFrame,
			triggerTransform,
			setResizingByEvent,
			calcHeightWithAspectRatio,
			enforceMinimumDimensions,
		} = refBus.current;

		setResizingByEvent(e.eventPhase);

		if (e.eventPhase === "Started") {
			recordStartFrame();
		}

		const inversedDragPoint = inverseAffineTransformationOnDrag(e.endX, e.endY);
		const inversedRightBottom = inverseAffineTransformationOnDrag(
			startFrame.current.bottomRightPoint.x,
			startFrame.current.bottomRightPoint.y,
		);

		let newWidth = inversedRightBottom.x - inversedDragPoint.x;
		let newHeight: number;
		if (doKeepProportion && startFrame.current.aspectRatio) {
			newHeight = calcHeightWithAspectRatio(
				newWidth,
				startFrame.current.aspectRatio,
				startFrame.current.scaleX,
				startFrame.current.scaleY,
			);
		} else {
			newHeight = inversedRightBottom.y - inversedDragPoint.y;
		}

		// Enforce minimum dimensions
		const enforced = enforceMinimumDimensions(
			newWidth,
			newHeight,
			startFrame.current.aspectRatio,
			doKeepProportion,
		);
		newWidth = enforced.width;
		newHeight = enforced.height;

		const inversedCenterX = inversedRightBottom.x - nanToZero(newWidth / 2);
		const inversedCenterY = inversedRightBottom.y - nanToZero(newHeight / 2);

		const center = affineTransformationOnDrag(inversedCenterX, inversedCenterY);

		// Pass cursor position to enable auto-scrolling
		triggerTransform(e, center, newWidth, newHeight);
	}, []);

	const linearDragFunctionLeftTop = useCallback(
		(x: number, y: number) =>
			createLinearY2xFunction(
				startFrame.current.topLeftPoint,
				startFrame.current.bottomRightPoint,
			)(x, y),
		[],
	);
	// --- LeftTop End --- //

	// --- LeftBottom Start --- //
	const handleDragLeftBottom = useCallback((e: DiagramDragEvent) => {
		const {
			doKeepProportion,
			inverseAffineTransformationOnDrag,
			affineTransformationOnDrag,
			recordStartFrame,
			triggerTransform,
			setResizingByEvent,
			calcHeightWithAspectRatio,
			enforceMinimumDimensions,
		} = refBus.current;

		setResizingByEvent(e.eventPhase);

		if (e.eventPhase === "Started") {
			recordStartFrame();
		}

		const inversedDragPoint = inverseAffineTransformationOnDrag(e.endX, e.endY);
		const inversedRightTop = inverseAffineTransformationOnDrag(
			startFrame.current.topRightPoint.x,
			startFrame.current.topRightPoint.y,
		);

		let newWidth = inversedRightTop.x - inversedDragPoint.x;
		let newHeight: number;
		if (doKeepProportion && startFrame.current.aspectRatio) {
			newHeight = calcHeightWithAspectRatio(
				newWidth,
				startFrame.current.aspectRatio,
				startFrame.current.scaleX,
				startFrame.current.scaleY,
			);
		} else {
			newHeight = inversedDragPoint.y - inversedRightTop.y;
		}

		// Enforce minimum dimensions
		const enforced = enforceMinimumDimensions(
			newWidth,
			newHeight,
			startFrame.current.aspectRatio,
			doKeepProportion,
		);
		newWidth = enforced.width;
		newHeight = enforced.height;

		const inversedCenterX = inversedRightTop.x - nanToZero(newWidth / 2);
		const inversedCenterY = inversedRightTop.y + nanToZero(newHeight / 2);

		const center = affineTransformationOnDrag(inversedCenterX, inversedCenterY);

		triggerTransform(e, center, newWidth, newHeight);
	}, []);

	const linearDragFunctionLeftBottom = useCallback(
		(x: number, y: number) =>
			createLinearY2xFunction(
				startFrame.current.topRightPoint,
				startFrame.current.bottomLeftPoint,
			)(x, y),
		[],
	);
	// --- LeftTop Bottom --- //

	// --- RightTop Start --- //
	const handleDragRightTop = useCallback((e: DiagramDragEvent) => {
		const {
			doKeepProportion,
			inverseAffineTransformationOnDrag,
			affineTransformationOnDrag,
			recordStartFrame,
			triggerTransform,
			setResizingByEvent,
			calcHeightWithAspectRatio,
			enforceMinimumDimensions,
		} = refBus.current;

		setResizingByEvent(e.eventPhase);

		if (e.eventPhase === "Started") {
			recordStartFrame();
		}

		const inversedDragPoint = inverseAffineTransformationOnDrag(e.endX, e.endY);
		const inversedLeftBottom = inverseAffineTransformationOnDrag(
			startFrame.current.bottomLeftPoint.x,
			startFrame.current.bottomLeftPoint.y,
		);

		let newWidth = inversedDragPoint.x - inversedLeftBottom.x;
		let newHeight: number;
		if (doKeepProportion && startFrame.current.aspectRatio) {
			newHeight = calcHeightWithAspectRatio(
				newWidth,
				startFrame.current.aspectRatio,
				startFrame.current.scaleX,
				startFrame.current.scaleY,
			);
		} else {
			newHeight = inversedLeftBottom.y - inversedDragPoint.y;
		}

		// Enforce minimum dimensions
		const enforced = enforceMinimumDimensions(
			newWidth,
			newHeight,
			startFrame.current.aspectRatio,
			doKeepProportion,
		);
		newWidth = enforced.width;
		newHeight = enforced.height;

		const inversedCenterX = inversedLeftBottom.x + nanToZero(newWidth / 2);
		const inversedCenterY = inversedLeftBottom.y - nanToZero(newHeight / 2);

		const center = affineTransformationOnDrag(inversedCenterX, inversedCenterY);

		triggerTransform(e, center, newWidth, newHeight);
	}, []);

	const linearDragFunctionRightTop = useCallback(
		(x: number, y: number) =>
			createLinearY2xFunction(
				startFrame.current.topRightPoint,
				startFrame.current.bottomLeftPoint,
			)(x, y),
		[],
	);
	// --- RightTop End --- //

	// --- RightBottom Start --- //
	const handleDragRightBottom = useCallback((e: DiagramDragEvent) => {
		const {
			doKeepProportion,
			inverseAffineTransformationOnDrag,
			affineTransformationOnDrag,
			recordStartFrame,
			triggerTransform,
			setResizingByEvent,
			calcHeightWithAspectRatio,
			enforceMinimumDimensions,
		} = refBus.current;

		setResizingByEvent(e.eventPhase);

		if (e.eventPhase === "Started") {
			recordStartFrame();
		}

		const inversedDragPoint = inverseAffineTransformationOnDrag(e.endX, e.endY);
		const inversedLeftTop = inverseAffineTransformationOnDrag(
			startFrame.current.topLeftPoint.x,
			startFrame.current.topLeftPoint.y,
		);

		let newWidth = inversedDragPoint.x - inversedLeftTop.x;
		let newHeight: number;
		if (doKeepProportion && startFrame.current.aspectRatio) {
			newHeight = calcHeightWithAspectRatio(
				newWidth,
				startFrame.current.aspectRatio,
				startFrame.current.scaleX,
				startFrame.current.scaleY,
			);
		} else {
			newHeight = inversedDragPoint.y - inversedLeftTop.y;
		}

		// Enforce minimum dimensions
		const enforced = enforceMinimumDimensions(
			newWidth,
			newHeight,
			startFrame.current.aspectRatio,
			doKeepProportion,
		);
		newWidth = enforced.width;
		newHeight = enforced.height;

		const inversedCenterX = inversedLeftTop.x + nanToZero(newWidth / 2);
		const inversedCenterY = inversedLeftTop.y + nanToZero(newHeight / 2);

		const center = affineTransformationOnDrag(inversedCenterX, inversedCenterY);

		triggerTransform(e, center, newWidth, newHeight);
	}, []);

	const linearDragFunctionRightBottom = useCallback(
		(x: number, y: number) =>
			createLinearY2xFunction(
				startFrame.current.bottomRightPoint,
				startFrame.current.topLeftPoint,
			)(x, y),
		[],
	);
	// --- RightBottom End --- //

	// --- TopCenter Start --- //
	const handleDragTopCenter = useCallback((e: DiagramDragEvent) => {
		const {
			doKeepProportion,
			inverseAffineTransformationOnDrag,
			affineTransformationOnDrag,
			recordStartFrame,
			triggerTransform,
			setResizingByEvent,
			calcWidthWithAspectRatio,
			enforceMinimumDimensions,
		} = refBus.current;

		setResizingByEvent(e.eventPhase);

		if (e.eventPhase === "Started") {
			recordStartFrame();
		}

		const inversedDragPoint = inverseAffineTransformationOnDrag(e.endX, e.endY);
		const inversedBottomCenter = inverseAffineTransformationOnDrag(
			startFrame.current.bottomCenterPoint.x,
			startFrame.current.bottomCenterPoint.y,
		);

		let newWidth: number;
		let newHeight = inversedBottomCenter.y - inversedDragPoint.y;
		if (doKeepProportion && startFrame.current.aspectRatio) {
			newWidth = calcWidthWithAspectRatio(
				newHeight,
				startFrame.current.aspectRatio,
				startFrame.current.scaleX,
				startFrame.current.scaleY,
			);
		} else {
			newWidth = startFrame.current.width * startFrame.current.scaleX;
		}

		// Enforce minimum dimensions
		const enforced = enforceMinimumDimensions(
			newWidth,
			newHeight,
			startFrame.current.aspectRatio,
			doKeepProportion,
		);
		newWidth = enforced.width;
		newHeight = enforced.height;

		const inversedCenterX = inversedBottomCenter.x;
		const inversedCenterY = inversedBottomCenter.y - nanToZero(newHeight / 2);

		const center = affineTransformationOnDrag(inversedCenterX, inversedCenterY);

		triggerTransform(e, center, newWidth, newHeight);
	}, []);

	const linearDragFunctionTopCenter = useCallback(
		(x: number, y: number) =>
			!refBus.current.isSwapped
				? createLinearY2xFunction(
						startFrame.current.bottomCenterPoint,
						startFrame.current.topCenterPoint,
					)(x, y)
				: createLinearX2yFunction(
						startFrame.current.bottomCenterPoint,
						startFrame.current.topCenterPoint,
					)(x, y),
		[],
	);
	// --- TopCenter End --- //

	// --- LeftCenter Start --- //
	const handleDragLeftCenter = useCallback((e: DiagramDragEvent) => {
		const {
			doKeepProportion,
			inverseAffineTransformationOnDrag,
			affineTransformationOnDrag,
			recordStartFrame,
			triggerTransform,
			setResizingByEvent,
			calcHeightWithAspectRatio,
			enforceMinimumDimensions,
		} = refBus.current;

		setResizingByEvent(e.eventPhase);

		if (e.eventPhase === "Started") {
			recordStartFrame();
		}

		const inversedDragPoint = inverseAffineTransformationOnDrag(e.endX, e.endY);
		const inversedRightCenter = inverseAffineTransformationOnDrag(
			startFrame.current.rightCenterPoint.x,
			startFrame.current.rightCenterPoint.y,
		);

		let newWidth = inversedRightCenter.x - inversedDragPoint.x;
		let newHeight: number;
		if (doKeepProportion && startFrame.current.aspectRatio) {
			newHeight = calcHeightWithAspectRatio(
				newWidth,
				startFrame.current.aspectRatio,
				startFrame.current.scaleX,
				startFrame.current.scaleY,
			);
		} else {
			newHeight = startFrame.current.height * startFrame.current.scaleY;
		}

		// Enforce minimum dimensions
		const enforced = enforceMinimumDimensions(
			newWidth,
			newHeight,
			startFrame.current.aspectRatio,
			doKeepProportion,
		);
		newWidth = enforced.width;
		newHeight = enforced.height;

		const inversedCenterX = inversedRightCenter.x - nanToZero(newWidth / 2);
		const inversedCenterY = inversedRightCenter.y;

		const center = affineTransformationOnDrag(inversedCenterX, inversedCenterY);

		triggerTransform(e, center, newWidth, newHeight);
	}, []);

	const linearDragFunctionLeftCenter = useCallback(
		(x: number, y: number) =>
			!refBus.current.isSwapped
				? createLinearX2yFunction(
						startFrame.current.leftCenterPoint,
						startFrame.current.rightCenterPoint,
					)(x, y)
				: createLinearY2xFunction(
						startFrame.current.leftCenterPoint,
						startFrame.current.rightCenterPoint,
					)(x, y),
		[],
	);
	// --- LeftCenter End --- //

	// --- RightCenter Start --- //
	const handleDragRightCenter = useCallback((e: DiagramDragEvent) => {
		const {
			doKeepProportion,
			inverseAffineTransformationOnDrag,
			affineTransformationOnDrag,
			recordStartFrame,
			triggerTransform,
			setResizingByEvent,
			calcHeightWithAspectRatio,
			enforceMinimumDimensions,
		} = refBus.current;

		setResizingByEvent(e.eventPhase);

		if (e.eventPhase === "Started") {
			recordStartFrame();
		}

		const inversedDragPoint = inverseAffineTransformationOnDrag(e.endX, e.endY);
		const inversedLeftCenter = inverseAffineTransformationOnDrag(
			startFrame.current.leftCenterPoint.x,
			startFrame.current.leftCenterPoint.y,
		);

		let newWidth = inversedDragPoint.x - inversedLeftCenter.x;
		let newHeight: number;
		if (doKeepProportion && startFrame.current.aspectRatio) {
			newHeight = calcHeightWithAspectRatio(
				newWidth,
				startFrame.current.aspectRatio,
				startFrame.current.scaleX,
				startFrame.current.scaleY,
			);
		} else {
			newHeight = startFrame.current.height * startFrame.current.scaleY;
		}

		// Enforce minimum dimensions
		const enforced = enforceMinimumDimensions(
			newWidth,
			newHeight,
			startFrame.current.aspectRatio,
			doKeepProportion,
		);
		newWidth = enforced.width;
		newHeight = enforced.height;

		const inversedCenterX = inversedLeftCenter.x + nanToZero(newWidth / 2);
		const inversedCenterY = inversedLeftCenter.y;

		const center = affineTransformationOnDrag(inversedCenterX, inversedCenterY);

		triggerTransform(e, center, newWidth, newHeight);
	}, []);

	const linearDragFunctionRightCenter = useCallback(
		(x: number, y: number) =>
			!refBus.current.isSwapped
				? createLinearX2yFunction(
						startFrame.current.leftCenterPoint,
						startFrame.current.rightCenterPoint,
					)(x, y)
				: createLinearY2xFunction(
						startFrame.current.leftCenterPoint,
						startFrame.current.rightCenterPoint,
					)(x, y),
		[],
	);
	// --- RightCenter End --- //

	// --- BottomCenter Start --- //
	const handleDragBottomCenter = useCallback((e: DiagramDragEvent) => {
		const {
			doKeepProportion,
			inverseAffineTransformationOnDrag,
			affineTransformationOnDrag,
			recordStartFrame,
			triggerTransform,
			setResizingByEvent,
			calcWidthWithAspectRatio,
			enforceMinimumDimensions,
		} = refBus.current;

		setResizingByEvent(e.eventPhase);

		if (e.eventPhase === "Started") {
			recordStartFrame();
		}

		const inversedDragPoint = inverseAffineTransformationOnDrag(e.endX, e.endY);
		const inversedTopCenter = inverseAffineTransformationOnDrag(
			startFrame.current.topCenterPoint.x,
			startFrame.current.topCenterPoint.y,
		);

		let newWidth: number;
		let newHeight = inversedDragPoint.y - inversedTopCenter.y;
		if (doKeepProportion && startFrame.current.aspectRatio) {
			newWidth = calcWidthWithAspectRatio(
				newHeight,
				startFrame.current.aspectRatio,
				startFrame.current.scaleX,
				startFrame.current.scaleY,
			);
		} else {
			newWidth = startFrame.current.width * startFrame.current.scaleX;
		}

		// Enforce minimum dimensions
		const enforced = enforceMinimumDimensions(
			newWidth,
			newHeight,
			startFrame.current.aspectRatio,
			doKeepProportion,
		);
		newWidth = enforced.width;
		newHeight = enforced.height;

		const inversedCenterX = inversedTopCenter.x;
		const inversedCenterY = inversedTopCenter.y + nanToZero(newHeight / 2);

		const center = affineTransformationOnDrag(inversedCenterX, inversedCenterY);

		triggerTransform(e, center, newWidth, newHeight);
	}, []);

	const linearDragFunctionBottomCenter = useCallback(
		(x: number, y: number) =>
			!refBus.current.isSwapped
				? createLinearY2xFunction(
						startFrame.current.bottomCenterPoint,
						startFrame.current.topCenterPoint,
					)(x, y)
				: createLinearX2yFunction(
						startFrame.current.bottomCenterPoint,
						startFrame.current.topCenterPoint,
					)(x, y),
		[],
	);
	// --- BottomCenter End --- //

	// Monitor shift key state
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			setShiftKeyDown(e.shiftKey);
		};
		const handleKeyUp = (e: KeyboardEvent) => {
			if (e.key === "Shift") {
				setShiftKeyDown(false);
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		window.addEventListener("keyup", handleKeyUp);

		return () => {
			// Cleanup
			window.removeEventListener("keydown", handleKeyDown);
			window.removeEventListener("keyup", handleKeyUp);
		};
	}, []);

	// Rotation
	// Adjust rotation point margin based on zoom to maintain consistent visual distance
	const adjustedRotatePointMargin = ROTATE_POINT_MARGIN / zoom;
	const rotationPoint = efficientAffineTransformation(
		width / 2 + adjustedRotatePointMargin,
		-(height / 2 + adjustedRotatePointMargin),
		1,
		1,
		radians,
		x,
		y,
	);
	/**
	 * Rotation point drag handler
	 */
	const handleDragRotationPoint = useCallback((e: DiagramDragEvent) => {
		const {
			id,
			x,
			y,
			width,
			height,
			scaleX,
			scaleY,
			onTransform,
			rotation,
			vertices,
		} = refBus.current;

		if (e.eventPhase === "Started") {
			setIsRotating(true);

			startFrame.current = {
				x,
				y,
				width,
				height,
				rotation,
				scaleX,
				scaleY,
				aspectRatio: width / height,
				...vertices,
			};

			onTransform?.({
				eventId: e.eventId,
				eventPhase: "Started",
				id,
				startFrame: startFrame.current,
				endFrame: startFrame.current,
				cursorX: e.cursorX,
				cursorY: e.cursorY,
				minX: e.minX,
				minY: e.minY,
			});

			return;
		}

		const radian = calcRadians(x, y, e.endX, e.endY);
		const rotatePointRadian = calcRadians(x, y, x + width, y - height);
		const newRotation =
			Math.round(radiansToDegrees(radian - rotatePointRadian) + 360) % 360;
		const event = {
			eventId: e.eventId,
			eventPhase: e.eventPhase,
			id,
			startFrame: {
				...startFrame.current,
			},
			endFrame: {
				x,
				y,
				width,
				height,
				scaleX,
				scaleY,
				rotation: newRotation,
			},
			cursorX: e.cursorX,
			cursorY: e.cursorY,
		};

		onTransform?.(event);

		if (e.eventPhase === "Ended") setIsRotating(false);
	}, []);

	const dragFunctionRotationPoint = useCallback((rx: number, ry: number) => {
		const { x, y, width, zoom } = refBus.current;

		// Adjust rotation point margin based on zoom to maintain consistent visual distance
		const adjustedRotatePointMargin = ROTATE_POINT_MARGIN / zoom;

		return calcClosestCircleIntersection(
			x,
			y,
			width / 2 + adjustedRotatePointMargin,
			rx,
			ry,
		);
	}, []);

	/**
	 * Handle click events from drag lines and points.
	 * Emits TransformControlClickEvent via EventBus for decoupled handling.
	 */
	const handleClick = useCallback(
		(e: DiagramClickEvent) => {
			// Emit event via EventBus for shapes to listen to
			eventBus.dispatchEvent(
				new CustomEvent(EVENT_NAME_TRANSFORM_CONTROL_CLICK, {
					detail: {
						eventId: newEventId(),
						id,
						clientX: e.clientX,
						clientY: e.clientY,
					},
				}),
			);
		},
		[id, eventBus],
	);

	// Get the cursor for each drag point based on the rotation angle.
	const cursors = {
		topCenter: getCursorFromAngle(rotation, scaleX, scaleY),
		rightTop: getCursorFromAngle(rotation + 45, scaleX, scaleY),
		rightCenter: getCursorFromAngle(rotation + 90, scaleX, scaleY),
		rightBottom: getCursorFromAngle(rotation + 135, scaleX, scaleY),
		bottomCenter: getCursorFromAngle(rotation + 180, scaleX, scaleY),
		leftBottom: getCursorFromAngle(rotation + 225, scaleX, scaleY),
		leftCenter: getCursorFromAngle(rotation + 270, scaleX, scaleY),
		leftTop: getCursorFromAngle(rotation + 315, scaleX, scaleY),
	};

	return (
		<>
			{!isRotating && (
				<>
					{/* Top DragLine */}
					<DragLine
						id={`${id}-topCenter-line`}
						x={vertices.topCenterPoint.x}
						y={vertices.topCenterPoint.y}
						startX={vertices.topLeftPoint.x}
						startY={vertices.topLeftPoint.y}
						endX={vertices.topRightPoint.x}
						endY={vertices.topRightPoint.y}
						cursor={cursors.topCenter}
						zoom={zoom}
						onDrag={handleDragTopCenter}
						onClick={handleClick}
						dragPositioningFunction={linearDragFunctionTopCenter}
					/>
					{/* Left DragLine */}
					<DragLine
						id={`${id}-leftCenter-line`}
						x={vertices.leftCenterPoint.x}
						y={vertices.leftCenterPoint.y}
						startX={vertices.topLeftPoint.x}
						startY={vertices.topLeftPoint.y}
						endX={vertices.bottomLeftPoint.x}
						endY={vertices.bottomLeftPoint.y}
						cursor={cursors.leftCenter}
						zoom={zoom}
						onDrag={handleDragLeftCenter}
						onClick={handleClick}
						dragPositioningFunction={linearDragFunctionLeftCenter}
					/>
					{/* Right DragLine */}
					<DragLine
						id={`${id}-rightCenter-line`}
						x={vertices.rightCenterPoint.x}
						y={vertices.rightCenterPoint.y}
						startX={vertices.topRightPoint.x}
						startY={vertices.topRightPoint.y}
						endX={vertices.bottomRightPoint.x}
						endY={vertices.bottomRightPoint.y}
						cursor={cursors.rightCenter}
						zoom={zoom}
						onDrag={handleDragRightCenter}
						onClick={handleClick}
						dragPositioningFunction={linearDragFunctionRightCenter}
					/>
					{/* Bottom DragLine */}
					<DragLine
						id={`${id}-bottomCenter-line`}
						x={vertices.bottomCenterPoint.x}
						y={vertices.bottomCenterPoint.y}
						startX={vertices.bottomLeftPoint.x}
						startY={vertices.bottomLeftPoint.y}
						endX={vertices.bottomRightPoint.x}
						endY={vertices.bottomRightPoint.y}
						cursor={cursors.bottomCenter}
						zoom={zoom}
						onDrag={handleDragBottomCenter}
						onClick={handleClick}
						dragPositioningFunction={linearDragFunctionBottomCenter}
					/>
					{/* Top left DragPoint */}
					<DragPoint
						id={`${id}-topLeft`}
						x={vertices.topLeftPoint.x}
						y={vertices.topLeftPoint.y}
						cursor={cursors.leftTop}
						zoom={zoom}
						onDrag={handleDragLeftTop}
						dragPositioningFunction={
							doKeepProportion ? linearDragFunctionLeftTop : undefined
						}
					/>
					{/* Bottom left DragPoint */}
					<DragPoint
						id={`${id}-bottomLeft`}
						x={vertices.bottomLeftPoint.x}
						y={vertices.bottomLeftPoint.y}
						cursor={cursors.leftBottom}
						zoom={zoom}
						onDrag={handleDragLeftBottom}
						dragPositioningFunction={
							doKeepProportion ? linearDragFunctionLeftBottom : undefined
						}
					/>
					{/* Top right DragPoint */}
					<DragPoint
						id={`${id}-topRight`}
						x={vertices.topRightPoint.x}
						y={vertices.topRightPoint.y}
						cursor={cursors.rightTop}
						zoom={zoom}
						onDrag={handleDragRightTop}
						dragPositioningFunction={
							doKeepProportion ? linearDragFunctionRightTop : undefined
						}
					/>
					{/* Bottom right DragPoint */}
					<DragPoint
						id={`${id}-bottomRight`}
						x={vertices.bottomRightPoint.x}
						y={vertices.bottomRightPoint.y}
						cursor={cursors.rightBottom}
						zoom={zoom}
						onDrag={handleDragRightBottom}
						dragPositioningFunction={
							doKeepProportion ? linearDragFunctionRightBottom : undefined
						}
					/>
					{/* Top center DragPoint */}
					<DragPoint
						id={`${id}-topCenter`}
						x={vertices.topCenterPoint.x}
						y={vertices.topCenterPoint.y}
						cursor={cursors.topCenter}
						zoom={zoom}
						onDrag={handleDragTopCenter}
						dragPositioningFunction={linearDragFunctionTopCenter}
					/>
					{/* Left center DragPoint */}
					<DragPoint
						id={`${id}-leftCenter`}
						x={vertices.leftCenterPoint.x}
						y={vertices.leftCenterPoint.y}
						cursor={cursors.leftCenter}
						zoom={zoom}
						onDrag={handleDragLeftCenter}
						dragPositioningFunction={linearDragFunctionLeftCenter}
					/>
					{/* Right center DragPoint */}
					<DragPoint
						id={`${id}-rightCenter`}
						x={vertices.rightCenterPoint.x}
						y={vertices.rightCenterPoint.y}
						cursor={cursors.rightCenter}
						zoom={zoom}
						onDrag={handleDragRightCenter}
						dragPositioningFunction={linearDragFunctionRightCenter}
					/>
					{/* Bottom center DragPoint */}
					<DragPoint
						id={`${id}-bottomCenter`}
						x={vertices.bottomCenterPoint.x}
						y={vertices.bottomCenterPoint.y}
						cursor={cursors.bottomCenter}
						zoom={zoom}
						onDrag={handleDragBottomCenter}
						dragPositioningFunction={linearDragFunctionBottomCenter}
					/>
				</>
			)}
			{/* Rotate point. */}
			{!isResizing && rotateEnabled && (
				<RotatePoint
					id={`rotation-${id}`}
					x={rotationPoint.x}
					y={rotationPoint.y}
					rotation={rotation}
					zoom={zoom}
					onDrag={handleDragRotationPoint}
					dragPositioningFunction={dragFunctionRotationPoint}
				/>
			)}
			{/* Resizing label. */}
			{isResizing && (
				<BottomLabel
					x={x}
					y={y}
					width={width}
					height={height}
					rotation={rotation}
					scaleX={scaleX}
					scaleY={scaleY}
				>{`${Math.round(width)} x ${Math.round(height)}`}</BottomLabel>
			)}
		</>
	);
};

export const TransformControl = memo(TransformControlComponent);
