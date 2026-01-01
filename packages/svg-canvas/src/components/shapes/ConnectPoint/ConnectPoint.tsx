import { calcRectangleBoundingBoxGeometry } from "@workspace/geometry";
import type { Point } from "@workspace/geometry";
import type React from "react";
import { memo, useCallback, useEffect, useRef, useState } from "react";

import type { ConnectingPoint, ConnectionEvent } from "./ConnectPointTypes";
import { EVENT_NAME_CONNECTION } from "../../../constants/core/EventNames";
import { ConnectLineDefaultState } from "../../../constants/state/shapes/ConnectLineDefaultState";
import { useEventBus } from "../../../context/EventBusContext";
import type { PathPointData } from "../../../types/data/shapes/PathPointData";
import type { DiagramDragDropEvent } from "../../../types/events/DiagramDragDropEvent";
import type { DiagramDragEvent } from "../../../types/events/DiagramDragEvent";
import type { DiagramHoverChangeEvent } from "../../../types/events/DiagramHoverChangeEvent";
import type { EventPhase } from "../../../types/events/EventPhase";
import type { ConnectPointProps } from "../../../types/props/shapes/ConnectPointProps";
import type { PathPointState } from "../../../types/state/shapes/PathPointState";
import { newId } from "../../../utils/shapes/common/newId";
import { generateOptimalFrameToFrameConnection } from "../../../utils/shapes/connectPoint/generateOptimalFrameToFrameConnection";
import { generatePathFromFrameToPoint } from "../../../utils/shapes/connectPoint/generatePathFromFrameToPoint";
import { getLineDirection } from "../../../utils/shapes/connectPoint/getLineDirection";
import { DragPoint } from "../../core/DragPoint";

/**
 * Connect point component
 */
const ConnectPointComponent: React.FC<ConnectPointProps> = ({
	id,
	x,
	y,
	ownerId,
	ownerFrame,
	alwaysVisible,
	connectType = "both",
	onConnect,
	onPreviewConnectLine,
}) => {
	// Get eventBus from context
	const eventBus = useEventBus();

	// Hover state management
	const [isHovered, setIsHovered] = useState(false);
	// Connection line coordinates
	const [pathPoints, setPathPoints] = useState<PathPointData[]>([]);
	// Connecting point
	const connectingPoint = useRef<ConnectingPoint | undefined>(undefined);
	// Bounding box geometry of the connect point's owner
	const ownerBoundingBoxGeometry = calcRectangleBoundingBoxGeometry(ownerFrame);
	// Direction of the connect point
	const direction = getLineDirection(ownerFrame.cx, ownerFrame.cy, x, y);

	/**
	 * Update connection line coordinates
	 */
	const updatePathPoints = (
		dragX: number,
		dragY: number,
		eventPhase: EventPhase,
		minX?: number,
		minY?: number,
	) => {
		let newPoints: Point[] = [];

		if (!connectingPoint.current) {
			// Connection line during dragging
			newPoints = generatePathFromFrameToPoint(
				x,
				y,
				direction,
				ownerBoundingBoxGeometry,
				dragX,
				dragY,
			);
		} else {
			// Connection line when there is a connecting point
			newPoints = generateOptimalFrameToFrameConnection(
				x,
				y,
				ownerFrame,
				connectingPoint.current.x, // X coordinate of the connection destination
				connectingPoint.current.y, // Y coordinate of the connection destination
				connectingPoint.current.ownerFrame, // Shape of the connection destination's owner
			);
		}

		const newPathPoints = newPoints.map(
			(p, i) =>
				({
					id: `${id}-${i}`, // Assign temporary ID
					x: p.x,
					y: p.y,
				}) as PathPointData,
		);

		setPathPoints(newPathPoints);

		// Notify the path data for the new connection line rendering.
		onPreviewConnectLine?.({
			id,
			x,
			y,
			ownerId,
			eventPhase,
			pathData: {
				...ConnectLineDefaultState,
				id: `${id}-connecting-path`,
				points: newPathPoints.map((p) => ({
					...p,
					geometryType: "point",
				})) as PathPointState[],
			},
			minX,
			minY,
		});
	};

	// To avoid frequent handler generation, hold referenced values in useRef
	const refBusVal = {
		// Properties
		id,
		x,
		y,
		ownerId,
		ownerFrame,
		connectType,
		onConnect,
		onPreviewConnectLine,
		// Internal variables and functions
		eventBus,
		pathPoints,
		updatePathPoints,
	};
	const refBus = useRef(refBusVal);
	refBus.current = refBusVal;

	/**
	 * Drag event handler for the connect point
	 */
	const handleDrag = useCallback((e: DiagramDragEvent) => {
		const {
			id,
			x,
			y,
			ownerId,
			connectType,
			onPreviewConnectLine,
			updatePathPoints,
		} = refBus.current;

		if (connectType === "end-only") {
			return;
		}

		// Clear connecting point when starting a new drag to allow fresh connections
		if (e.eventPhase === "Started") {
			connectingPoint.current = undefined;
		}

		if (connectingPoint.current) {
			// If there is a connecting point, use that point as the end point
			return;
		}

		if (e.eventPhase !== "Ended") {
			updatePathPoints(e.endX, e.endY, e.eventPhase, e.minX, e.minY);
		} else {
			setPathPoints([]);

			// Clear the path data for the new connection line rendering.
			onPreviewConnectLine?.({
				id,
				x,
				y,
				ownerId,
				eventPhase: e.eventPhase,
				pathData: undefined,
			});
		}
	}, []);

	/**
	 * Event handler when an element is dragged over this connect point
	 */
	const handleDragOver = useCallback((e: DiagramDragDropEvent) => {
		if (e.dropItem.type === "ConnectPoint") {
			setIsHovered(true);

			const { id, x, y, ownerId, ownerFrame, eventBus } = refBus.current;

			// Send notification to the connection destination
			eventBus.dispatchEvent(
				new CustomEvent(EVENT_NAME_CONNECTION, {
					detail: {
						eventId: e.eventId,
						type: "connecting",
						startPointId: e.dropItem.id,
						startX: e.dropItem.x,
						startY: e.dropItem.y,
						endPointId: id,
						endX: x,
						endY: y,
						endOwnerId: ownerId,
						endOwnerFrame: ownerFrame,
					},
				}),
			);
		}
	}, []);

	/**
	 * Event handler when an element is dragged away from this connect point
	 */
	const handleDragLeave = useCallback((e: DiagramDragDropEvent) => {
		setIsHovered(false);
		// Processing when connection is cancelled
		if (e.dropItem.type === "ConnectPoint") {
			const { id, x, y, ownerId, ownerFrame, eventBus } = refBus.current;

			// Send notification to the connection destination
			eventBus.dispatchEvent(
				new CustomEvent(EVENT_NAME_CONNECTION, {
					detail: {
						eventId: e.eventId,
						type: "disconnect",
						startPointId: e.dropItem.id,
						startX: e.dropItem.x,
						startY: e.dropItem.y,
						endPointId: id,
						endX: x,
						endY: y,
						endOwnerId: ownerId,
						endOwnerFrame: ownerFrame,
					},
				}),
			);
		}
	}, []);

	/**
	 * Event handler when an element is dropped on this connect point
	 */
	const handleDrop = useCallback((e: DiagramDragDropEvent) => {
		// Processing when dropped
		if (e.dropItem.type === "ConnectPoint") {
			const { id, x, y, ownerId, ownerFrame, eventBus } = refBus.current;

			// Send notification to the connection destination
			eventBus.dispatchEvent(
				new CustomEvent(EVENT_NAME_CONNECTION, {
					detail: {
						eventId: e.eventId,
						type: "connect",
						startPointId: e.dropItem.id,
						startX: e.dropItem.x,
						startY: e.dropItem.y,
						endPointId: id,
						endX: x,
						endY: y,
						endOwnerId: ownerId,
						endOwnerFrame: ownerFrame,
					},
				}),
			);
		}
		setIsHovered(false);
	}, []);

	/**
	 * Hover state change event handler
	 *
	 * @param {DiagramHoverChangeEvent} e Hover state change event
	 * @returns {void}
	 */
	const handleHover = useCallback((e: DiagramHoverChangeEvent) => {
		const { connectType } = refBus.current;
		if (connectType === "end-only") {
			return;
		}
		setIsHovered(e.isHovered);
	}, []);

	useEffect(() => {
		// Handle connection events from connected points
		const handleConnection = (e: Event) => {
			// Get referenced values via refBus
			const { id, x, y, pathPoints, ownerId, onConnect, updatePathPoints } =
				refBus.current;

			const customEvent = e as CustomEvent<ConnectionEvent>;
			if (customEvent.detail.startPointId === id) {
				if (customEvent.detail.type === "connecting") {
					// Processing when connection starts
					// Hold the connection destination point
					connectingPoint.current = {
						id: customEvent.detail.endPointId,
						x: customEvent.detail.endX,
						y: customEvent.detail.endY,
						onwerId: customEvent.detail.endOwnerId,
						ownerFrame: customEvent.detail.endOwnerFrame,
					};

					// Recalculate path points so that the line connects to the connection destination point
					updatePathPoints(
						customEvent.detail.endX,
						customEvent.detail.endY,
						"InProgress",
					);
				}

				if (customEvent.detail.type === "disconnect") {
					// Processing during disconnection
					// Release the connecting point
					connectingPoint.current = undefined;
				}

				if (customEvent.detail.type === "connect") {
					// Processing when connection is completed
					// Generate connection line data and fire event

					const points: PathPointData[] = [...pathPoints];
					points[0].id = id;
					for (let i = 1; i < points.length - 1; i++) {
						points[i].id = newId();
					}
					points[points.length - 1].id = customEvent.detail.endPointId;

					onConnect?.({
						eventId: customEvent.detail.eventId,
						startOwnerId: ownerId,
						points,
						endOwnerId: customEvent.detail.endOwnerId,
					});

					setPathPoints([]);

					// Clear the path data for the new connection line rendering.
					refBus.current.onPreviewConnectLine?.({
						id,
						x,
						y,
						ownerId,
						pathData: undefined,
						eventPhase: "Ended",
					});

					// Reset the connecting point after successful connection
					connectingPoint.current = undefined;
				}
			}
		};

		eventBus.addEventListener(EVENT_NAME_CONNECTION, handleConnection);

		return () => {
			if (handleConnection) {
				eventBus.removeEventListener(EVENT_NAME_CONNECTION, handleConnection);
			}
		};
	}, [eventBus]);

	return (
		<DragPoint
			id={id}
			x={x}
			y={y}
			type="ConnectPoint"
			radius={6}
			stroke="rgba(107, 114, 128, 0.8)"
			fill="rgba(255, 255, 255, 1)"
			cursor={connectType === "end-only" ? "default" : "pointer"}
			outline="none"
			isTransparent={!alwaysVisible && !isHovered}
			onDrag={handleDrag}
			onDragOver={handleDragOver}
			onDragLeave={handleDragLeave}
			onDrop={handleDrop}
			onHoverChange={handleHover}
		/>
	);
};

export const ConnectPoint = memo(ConnectPointComponent);
