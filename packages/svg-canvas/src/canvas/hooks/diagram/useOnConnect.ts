import { useCallback, useRef } from "react";

import { ConnectLineDefaultState } from "../../../constants/state/shapes/ConnectLineDefaultState";
import type { DiagramConnectEvent } from "../../../types/events/DiagramConnectEvent";
import type { Diagram } from "../../../types/state/core/Diagram";
import type { ConnectLineState } from "../../../types/state/shapes/ConnectLineState";
import type { PathPointState } from "../../../types/state/shapes/PathPointState";
import { newEventId } from "../../../utils/core/newEventId";
import { calcOrientedFrameFromPoints } from "../../../utils/math/geometry/calcOrientedFrameFromPoints";
import { newId } from "../../../utils/shapes/common/newId";
import { isConnectableState } from "../../../utils/validation/isConnectableState";
import type { SvgCanvasSubHooksProps } from "../../types/SvgCanvasSubHooksProps";
import { applyFunctionRecursively } from "../../utils/applyFunctionRecursively";
import { useAddHistory } from "../history/useAddHistory";

/**
 * Custom hook to handle connect events on the canvas.
 */
export const useOnConnect = (props: SvgCanvasSubHooksProps) => {
	// Get the data change handler.
	const addHistory = useAddHistory(props);

	// Create references bypass to avoid function creation in every render.
	const refBusVal = {
		props,
		addHistory,
	};
	const refBus = useRef(refBusVal);
	refBus.current = refBusVal;

	return useCallback((e: DiagramConnectEvent) => {
		// Bypass references to avoid function creation in every render.
		const {
			props: { setCanvasState },
			addHistory,
		} = refBus.current;

		const frame = calcOrientedFrameFromPoints(
			e.points.map((p: PathPointState) => ({ x: p.x, y: p.y })),
		);

		const newConnectLine: ConnectLineState = {
			...ConnectLineDefaultState,
			id: newId(),
			x: frame.x,
			y: frame.y,
			width: frame.width,
			height: frame.height,
			items: e.points.map((p: PathPointState) => ({
				...p,
				type: "PathPoint",
			})) as PathPointState[],
			startOwnerId: e.startOwnerId,
			endOwnerId: e.endOwnerId,
		};

		setCanvasState((prevState) => {
			// Update endOwnerId item to hide connect points
			const items = applyFunctionRecursively(
				prevState.items,
				(item: Diagram) => {
					if (item.id === e.endOwnerId && isConnectableState(item)) {
						return {
							...item,
							showConnectPoints: false,
						};
					}
					return item;
				},
			);

			// Add the new ConnectLine to the items
			const updatedItems = [...items, newConnectLine];

			// Create new state with updated items
			let newState = {
				...prevState,
				items: updatedItems,
			};

			// Generate event ID and add history
			const eventId = newEventId();
			newState = addHistory(eventId, newState);

			return newState;
		});
	}, []);
};
