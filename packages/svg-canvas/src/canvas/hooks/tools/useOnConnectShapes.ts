import { useEffect, useRef } from "react";

import { EVENT_NAME_CONNECT_SHAPES } from "../../../constants/core/EventNames";
import { ConnectLineDefaultState } from "../../../constants/state/shapes/ConnectLineDefaultState";
import type { Frame } from "../../../types/core/Frame";
import type {
	AnchorPosition,
	ConnectShapesEvent,
} from "../../../types/events/ConnectShapesEvent";
import type { Diagram } from "../../../types/state/core/Diagram";
import type { ConnectableState } from "../../../types/state/shapes/ConnectableState";
import type { ConnectLineState } from "../../../types/state/shapes/ConnectLineState";
import type { ConnectPointState } from "../../../types/state/shapes/ConnectPointState";
import type { EllipseState } from "../../../types/state/shapes/EllipseState";
import type { PathPointState } from "../../../types/state/shapes/PathPointState";
import type { RectangleState } from "../../../types/state/shapes/RectangleState";
import { getDiagramById } from "../../../utils/core/getDiagramById";
import { calcOrientedFrameFromPoints } from "../../../utils/math/geometry/calcOrientedFrameFromPoints";
import { newId } from "../../../utils/shapes/common/newId";
import { generateOptimalFrameToFrameConnection } from "../../../utils/shapes/connectPoint/generateOptimalFrameToFrameConnection";
import { createEllipseConnectPoint } from "../../../utils/shapes/ellipse/createEllipseConnectPoint";
import { createRectangleConnectPoint } from "../../../utils/shapes/rectangle/createRectangleConnectPoint";
import { isConnectableState } from "../../../utils/validation/isConnectableState";
import { isFrame } from "../../../utils/validation/isFrame";
import type { SvgCanvasSubHooksProps } from "../../types/SvgCanvasSubHooksProps";
import { applyFunctionRecursively } from "../../utils/applyFunctionRecursively";

/**
 * Hook that monitors ConnectShapes events and performs shape connections.
 * This is a more generic version of useOnConnectNodes that supports
 * connecting any shapes (not just nodes) with customizable line styles,
 * arrow heads, and anchor positions.
 */
export const useOnConnectShapes = (props: SvgCanvasSubHooksProps) => {
	// Create references bypass to avoid function creation in every render.
	const refBusVal = {
		props,
	};
	const refBus = useRef(refBusVal);
	refBus.current = refBusVal;

	useEffect(() => {
		// Bypass references to avoid function creation in every render.
		const { eventBus } = refBus.current.props;

		const connectShapesListener = (e: Event) => {
			// Bypass references to avoid function creation in every render.
			const { props } = refBus.current;
			const { canvasState, setCanvasState } = props;

			const event = (e as CustomEvent<ConnectShapesEvent>).detail;

			const sourceShape = getDiagramById(
				canvasState.items,
				event.sourceShapeId,
			) as Diagram;
			const targetShape = getDiagramById(
				canvasState.items,
				event.targetShapeId,
			) as Diagram;

			if (!sourceShape || !targetShape) {
				console.error("Source or target shape not found.");
				return;
			}

			if (!isFrame(sourceShape) || !isFrame(targetShape)) {
				console.error("Source or target shape is not a frame.");
				return;
			}

			if (
				!isConnectableState(sourceShape) ||
				!isConnectableState(targetShape)
			) {
				console.error("Source or target shape is not connectable.");
				return;
			}

			// Determine anchor names
			const sourceAnchorName =
				event.sourceAnchor && event.sourceAnchor.trim() !== ""
					? event.sourceAnchor
					: "bottomCenterPoint";
			const targetAnchorName =
				event.targetAnchor && event.targetAnchor.trim() !== ""
					? event.targetAnchor
					: "topCenterPoint";

			// Try to find existing connect points
			let sourceConnectPoint = findConnectPoint(
				sourceShape as ConnectableState,
				event.sourceAnchor,
				"bottomCenterPoint",
			);
			let targetConnectPoint = findConnectPoint(
				targetShape as ConnectableState,
				event.targetAnchor,
				"topCenterPoint",
			);

			// Track if we need to update shapes with new connect points
			const updatedShapes: Diagram[] = [];

			// Generate missing source connect point
			if (!sourceConnectPoint) {
				sourceConnectPoint = generateConnectPoint(
					sourceShape,
					sourceAnchorName,
				);
				if (!sourceConnectPoint) {
					console.error(
						`Failed to generate source connect point: ${sourceAnchorName}`,
					);
					return;
				}

				// Create updated source shape with new connect point (immutable)
				const sourceConnectable = sourceShape as ConnectableState & Diagram;
				const updatedSourceShape = {
					...sourceConnectable,
					connectEnabled: true,
					connectPoints: [
						...(sourceConnectable.connectPoints || []),
						sourceConnectPoint,
					],
				};
				updatedShapes.push(updatedSourceShape);
			}

			// Generate missing target connect point
			if (!targetConnectPoint) {
				targetConnectPoint = generateConnectPoint(
					targetShape,
					targetAnchorName,
				);
				if (!targetConnectPoint) {
					console.error(
						`Failed to generate target connect point: ${targetAnchorName}`,
					);
					return;
				}

				// Create updated target shape with new connect point (immutable)
				const targetConnectable = targetShape as ConnectableState & Diagram;
				const updatedTargetShape = {
					...targetConnectable,
					connectEnabled: true,
					connectPoints: [
						...(targetConnectable.connectPoints || []),
						targetConnectPoint,
					],
				};
				updatedShapes.push(updatedTargetShape);
			}

			// Generate connection path points
			const points = generateOptimalFrameToFrameConnection(
				sourceConnectPoint.x,
				sourceConnectPoint.y,
				sourceShape as Frame,
				targetConnectPoint.x,
				targetConnectPoint.y,
				targetShape as Frame,
			);

			const frame = calcOrientedFrameFromPoints(
				points.map((p) => ({ x: p.x, y: p.y })),
			);

			const newPathPointId = (i: number) => {
				if (i === 0) return sourceConnectPoint.id;
				if (i === points.length - 1) return targetConnectPoint.id;
				return newId();
			};

			const pathPoints = points.map((p, i) => ({
				...p,
				id: newPathPointId(i),
				type: "PathPoint",
			})) as PathPointState[];

			// Create connection line with custom properties
			const connectLine: ConnectLineState = {
				...ConnectLineDefaultState,
				id: newId(),
				x: frame.x,
				y: frame.y,
				width: frame.width,
				height: frame.height,
				items: pathPoints,
				startOwnerId: sourceShape.id,
				endOwnerId: targetShape.id,
				// Apply custom arrow heads if specified
				...(event.startArrowHead !== undefined && {
					startArrowHead: event.startArrowHead,
				}),
				...(event.endArrowHead !== undefined && {
					endArrowHead: event.endArrowHead,
				}),
				// Apply custom path type if specified
				...(event.pathType !== undefined && {
					pathType: event.pathType,
				}),
				// Apply custom line style if specified
				...(event.lineStyle !== undefined && {
					strokeDashType: event.lineStyle,
				}),
			};

			// Update canvas state: add connection line and update shapes with new connect points
			setCanvasState((prevState) => {
				let newItems = prevState.items;

				// Update shapes with new connect points if needed (recursively)
				if (updatedShapes.length > 0) {
					newItems = applyFunctionRecursively(prevState.items, (item) => {
						const updatedShape = updatedShapes.find((s) => s.id === item.id);
						if (updatedShape) {
							return updatedShape;
						}
						return item;
					});
				}

				// Add the connection line
				newItems = [...newItems, connectLine];

				return {
					...prevState,
					items: newItems,
				};
			});
		};

		eventBus.addEventListener(EVENT_NAME_CONNECT_SHAPES, connectShapesListener);

		return () => {
			eventBus.removeEventListener(
				EVENT_NAME_CONNECT_SHAPES,
				connectShapesListener,
			);
		};
	}, []);
};

/**
 * Generates a connection point for a shape based on its type.
 *
 * @param shape - The shape to generate connection points for
 * @param anchorName - The name of the anchor point to generate
 * @returns The generated connection point or undefined if generation fails
 */
const generateConnectPoint = (
	shape: Diagram,
	anchorName: string,
): ConnectPointState | undefined => {
	let generatedPoints: ConnectPointState[] = [];

	if (shape.type === "Rectangle") {
		const rectangleShape = shape as RectangleState;
		generatedPoints = createRectangleConnectPoint({
			x: rectangleShape.x,
			y: rectangleShape.y,
			width: rectangleShape.width,
			height: rectangleShape.height,
			rotation: rectangleShape.rotation,
			scaleX: rectangleShape.scaleX,
			scaleY: rectangleShape.scaleY,
		});
	} else if (shape.type === "Ellipse") {
		const ellipseShape = shape as EllipseState;
		generatedPoints = createEllipseConnectPoint({
			x: ellipseShape.x,
			y: ellipseShape.y,
			width: ellipseShape.width,
			height: ellipseShape.height,
			rotation: ellipseShape.rotation,
			scaleX: ellipseShape.scaleX,
			scaleY: ellipseShape.scaleY,
		});
	} else {
		console.error(
			`Cannot generate connect point for unsupported shape type: ${shape.type}`,
		);
		return undefined;
	}

	// Find the specific connect point we need from the generated points
	const connectPoint = generatedPoints.find(
		(p: ConnectPointState) => p.name === anchorName,
	);

	if (!connectPoint) {
		console.error(
			`Failed to generate connect point "${anchorName}" for shape type: ${shape.type}`,
		);
		return undefined;
	}

	return connectPoint;
};

/**
 * Finds a connection point on a shape based on the anchor position.
 * If no anchor is specified, uses the default anchor name.
 * Does NOT generate missing points - returns undefined if not found.
 *
 * @param shape - The connectable shape to find the point on
 * @param anchor - The anchor position name (optional)
 * @param defaultAnchor - The default anchor name to use if none specified
 * @returns The connection point or undefined if not found
 */
const findConnectPoint = (
	shape: ConnectableState,
	anchor: AnchorPosition | undefined,
	defaultAnchor: string,
): ConnectPointState | undefined => {
	// Empty string should be treated as undefined (use default)
	const anchorName = anchor && anchor.trim() !== "" ? anchor : defaultAnchor;

	// Find existing connect point
	const existingPoint = shape.connectPoints?.find((p) => p.name === anchorName);

	return existingPoint;
};
