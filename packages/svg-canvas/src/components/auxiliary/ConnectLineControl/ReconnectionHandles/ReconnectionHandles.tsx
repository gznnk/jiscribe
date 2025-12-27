import { calcRectangleBoundingBoxGeometry } from "@workspace/geometry";
import type { Frame, Point } from "@workspace/geometry";
import type React from "react";
import { memo, useCallback, useEffect, useRef } from "react";

import { EVENT_NAME_CONNECTION } from "../../../../constants/core/EventNames";
import { useEventBus } from "../../../../context/EventBusContext";
import type {
	DiagramChangeData,
	DiagramChangeEvent,
} from "../../../../types/events/DiagramChangeEvent";
import type { DiagramDragEvent } from "../../../../types/events/DiagramDragEvent";
import type { PathPointState } from "../../../../types/state/shapes/PathPointState";
import { newId } from "../../../../utils/shapes/common/newId";
import { generateOptimalFrameToFrameConnection } from "../../../../utils/shapes/connectPoint/generateOptimalFrameToFrameConnection";
import { generatePathFromFrameToPoint } from "../../../../utils/shapes/connectPoint/generatePathFromFrameToPoint";
import { getLineDirection } from "../../../../utils/shapes/connectPoint/getLineDirection";
import { DragPoint } from "../../../core/DragPoint";
import type {
	ConnectingPoint,
	ConnectionEvent,
} from "../../../shapes/ConnectPoint/ConnectPointTypes";

type ReconnectionHandlesProps = {
	id: string;
	items: PathPointState[];
	startOwnerId?: string;
	endOwnerId?: string;
	startOwnerFrame?: Frame;
	endOwnerFrame?: Frame;
	autoRouting: boolean;
	zoom: number;
	onDiagramChange?: (e: DiagramChangeEvent) => void;
};

const ReconnectionHandlesComponent: React.FC<ReconnectionHandlesProps> = ({
	id,
	items,
	startOwnerId,
	endOwnerId,
	startOwnerFrame,
	endOwnerFrame,
	autoRouting,
	zoom,
	onDiagramChange,
}) => {
	// Get eventBus from context
	const eventBus = useEventBus();
	// Store the initial items when dragging starts
	const startItems = useRef<PathPointState[] | null>(null);
	// Store the initial autoRouting state when dragging starts
	const startAutoRouting = useRef<boolean>(false);
	// Connecting point
	const connectingPoint = useRef<ConnectingPoint | null>(null);

	const startPoint = items[0];
	const endPoint = items[items.length - 1];

	// To avoid frequent handler generation, hold referenced values in useRef
	const refBusVal = {
		// Properties
		id,
		items,
		startOwnerId,
		endOwnerId,
		autoRouting,
		onDiagramChange,
		// Internal variables and functions
		eventBus,
		startPoint,
		endPoint,
	};
	const refBus = useRef(refBusVal);
	refBus.current = refBusVal;

	const processDrag = useCallback(
		(
			oppositePoint: PathPointState,
			oppositeOwnerFrame: Frame,
			isStartPointDrag: boolean,
			e: DiagramDragEvent,
		) => {
			const {
				id,
				items,
				startOwnerId,
				endOwnerId,
				autoRouting,
				onDiagramChange,
				startPoint,
				endPoint,
			} = refBus.current;

			// Bounding box geometry of the connect point's owner
			const ownerBoundingBoxGeometry =
				calcRectangleBoundingBoxGeometry(oppositeOwnerFrame);

			// Direction of the connect point
			const direction = getLineDirection(
				oppositeOwnerFrame.cx,
				oppositeOwnerFrame.cy,
				oppositePoint.x,
				oppositePoint.y,
			);

			if (e.eventPhase === "Started") {
				startItems.current = items;
				startAutoRouting.current = autoRouting;
			}

			let newPoints: Point[] = [];
			if (autoRouting) {
				if (!connectingPoint.current) {
					// Connection line during dragging
					newPoints = generatePathFromFrameToPoint(
						oppositePoint.x,
						oppositePoint.y,
						direction,
						ownerBoundingBoxGeometry,
						e.endX,
						e.endY,
					);
				} else {
					// Connection line when there is a connecting point
					newPoints = generateOptimalFrameToFrameConnection(
						oppositePoint.x,
						oppositePoint.y,
						oppositeOwnerFrame,
						connectingPoint.current.x, // X coordinate of the connection destination
						connectingPoint.current.y, // Y coordinate of the connection destination
						connectingPoint.current.ownerFrame, // Shape of the connection destination's owner
					);
				}

				if (isStartPointDrag) {
					// If dragging the start point, reverse the connecting points
					newPoints.reverse();
				}

				if (e.eventPhase !== "Ended") {
					onDiagramChange?.({
						id,
						eventId: e.eventId,
						eventPhase: e.eventPhase,
						startDiagram: {
							items: startItems.current || [],
						} as DiagramChangeData,
						endDiagram: {
							items: newPoints.map((point, index) => {
								let id = `point-${index}`;
								if (index === 0) {
									id = startPoint.id;
								} else if (index === newPoints.length - 1) {
									id = endPoint.id;
								}
								return {
									id,
									type: "PathPoint",
									x: point.x,
									y: point.y,
								};
							}),
						} as DiagramChangeData,
					});
				}
			}

			if (e.eventPhase === "Ended") {
				if (connectingPoint.current === null) {
					// Restore to the original position if not connected
					onDiagramChange?.({
						id,
						eventId: e.eventId,
						eventPhase: e.eventPhase,
						startDiagram: {
							items: startItems.current || [],
						} as DiagramChangeData,
						endDiagram: {
							items: startItems.current || [],
							autoRouting: startAutoRouting.current,
						} as DiagramChangeData,
					});
				} else {
					// Connection completed
					// The connection completion handling is done in ConnectPoint
					const connectedPointId = connectingPoint.current.id;
					const connectedOwnerId = connectingPoint.current.onwerId;

					onDiagramChange?.({
						id,
						eventId: e.eventId,
						eventPhase: e.eventPhase,
						startDiagram: {
							items: startItems.current || [],
						} as DiagramChangeData,
						endDiagram: {
							items: newPoints.map((point, index) => {
								const isFirstPoint = index === 0;
								const isLastPoint = index === newPoints.length - 1;

								// Determine point ID based on drag direction and position
								let id = newId();
								if (isFirstPoint) {
									id = isStartPointDrag ? connectedPointId : startPoint.id;
								} else if (isLastPoint) {
									id = isStartPointDrag ? endPoint.id : connectedPointId;
								}

								return {
									id,
									type: "PathPoint",
									x: point.x,
									y: point.y,
								};
							}),
							autoRouting: startAutoRouting.current,
							startOwnerId: isStartPointDrag ? connectedOwnerId : startOwnerId,
							endOwnerId: isStartPointDrag ? endOwnerId : connectedOwnerId,
						} as DiagramChangeData,
					});
				}

				startItems.current = null;
				connectingPoint.current = null;
			}
		},
		[],
	);

	const handleStartPointDrag = useCallback(
		(e: DiagramDragEvent) => {
			if (endOwnerFrame === undefined) return;
			const ownerFrame = endOwnerFrame;
			const oppositePoint = endPoint;

			processDrag(oppositePoint, ownerFrame, true, e);
		},
		[processDrag, endOwnerFrame, endPoint],
	);

	const handleEndPointDrag = useCallback(
		(e: DiagramDragEvent) => {
			if (startOwnerFrame === undefined) return;
			const ownerFrame = startOwnerFrame;
			const oppositePoint = startPoint;

			processDrag(oppositePoint, ownerFrame, false, e);
		},
		[processDrag, startOwnerFrame, startPoint],
	);

	useEffect(() => {
		// Handle connection events from connected points
		const handleConnection = (e: Event) => {
			// Get referenced values via refBus
			const { id } = refBus.current;

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
				}

				if (customEvent.detail.type === "disconnect") {
					// Processing during disconnection
					// Release the connecting point
					connectingPoint.current = null;
				}

				if (customEvent.detail.type === "connect") {
					// Processing when connection is completed
					// Because the completion processing is done in the drag end event, do nothing here
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
		<>
			<DragPoint
				id={id}
				x={startPoint.x}
				y={startPoint.y}
				type="ConnectPoint"
				radius={6}
				stroke="rgba(107, 114, 128, 0.8)"
				fill="rgba(255, 255, 255, 1)"
				outline="none"
				zoom={zoom}
				onDrag={handleStartPointDrag}
			/>
			<DragPoint
				id={id}
				x={endPoint.x}
				y={endPoint.y}
				type="ConnectPoint"
				radius={6}
				stroke="rgba(107, 114, 128, 0.8)"
				fill="rgba(255, 255, 255, 1)"
				outline="none"
				zoom={zoom}
				onDrag={handleEndPointDrag}
			/>
		</>
	);
};

export const ReconnectionHandles = memo(ReconnectionHandlesComponent);
