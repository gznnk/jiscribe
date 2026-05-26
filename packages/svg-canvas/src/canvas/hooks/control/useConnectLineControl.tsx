import type { JSX } from "@emotion/react/jsx-runtime";
import type { TransformedFrame } from "@workspace/geometry";
import { useCallback, useMemo, useRef } from "react";

import { ConnectLineControl } from "../../../components/auxiliary/ConnectLineControl";
import type { DiagramChangeEvent } from "../../../types/events/DiagramChangeEvent";
import type { ConnectLineState } from "../../../types/state/shapes/ConnectLineState";
import { convertDiagramToFrame } from "../../../utils/core/convertDiagramToFrame";
import { getDiagramById } from "../../../utils/core/getDiagramById";
import { isConnectLineState } from "../../../utils/validation/isConnectLineState";
import { InteractionState } from "../../types/InteractionState";
import type { SvgCanvasProps } from "../../types/SvgCanvasProps";
import { getDiagramByPath } from "../../utils/getDiagramByPath";

/**
 * Custom hook to render ConnectLineControl for selected ConnectLine items.
 * Only renders ConnectLineControl when a single ConnectLine is selected and not dragging.
 */
export const useConnectLineControl = (
	props: SvgCanvasProps,
): JSX.Element | null => {
	const {
		interactionState,
		selectedDiagramPathIndex,
		items,
		zoom,
		onDiagramChange,
	} = props;

	// Create references bypass to avoid function creation in every render.
	const refBusVal = {
		items,
	};
	const refBus = useRef(refBusVal);
	refBus.current = refBusVal;

	// Wrap onDiagramChange to disable autoRouting on edit for ConnectLine
	const handleConnectLineDiagramChange = useCallback(
		(e: DiagramChangeEvent) => {
			// Disable autoRouting on edit completion for ConnectLine
			if (e.eventPhase === "Ended") {
				const autoRouting =
					"autoRouting" in e.endDiagram && e.endDiagram.autoRouting;
				e = {
					...e,
					endDiagram: {
						...e.endDiagram,
						autoRouting,
					} as typeof e.endDiagram,
				};
			}

			onDiagramChange?.(e);
		},
		[onDiagramChange],
	);

	// Get selected path item
	const paths = Array.from(selectedDiagramPathIndex.values());
	const selectedItem =
		paths.length === 1 ? getDiagramByPath(items, paths[0]) : null;

	// Cast to ConnectLineState if valid
	const connectLineItem = isConnectLineState(selectedItem)
		? (selectedItem as ConnectLineState)
		: null;

	// Get owner frames (must be called unconditionally for hooks rules)
	const startOwnerFrame: TransformedFrame | undefined = useMemo(() => {
		if (!connectLineItem?.startOwnerId) {
			return undefined;
		}
		const startOwner = getDiagramById(
			refBus.current.items,
			connectLineItem.startOwnerId,
		);
		return startOwner ? convertDiagramToFrame(startOwner) : undefined;
	}, [connectLineItem?.startOwnerId]);

	const endOwnerFrame = useMemo(() => {
		if (!connectLineItem?.endOwnerId) {
			return undefined;
		}
		const endOwner = getDiagramById(
			refBus.current.items,
			connectLineItem.endOwnerId,
		);
		return endOwner ? convertDiagramToFrame(endOwner) : undefined;
	}, [connectLineItem?.endOwnerId]);

	// Don't render ConnectLineControl during dragging or when no ConnectLine is selected
	if (interactionState === InteractionState.Dragging) {
		return null;
	}

	// If no selected item or not a ConnectLine, return null
	if (!connectLineItem) {
		return null;
	}

	return (
		<ConnectLineControl
			key={`connect-line-control-${connectLineItem.id}`}
			id={connectLineItem.id}
			points={connectLineItem.points}
			pathType={connectLineItem.pathType}
			autoRouting={connectLineItem.autoRouting}
			startOwnerId={connectLineItem.startOwnerId}
			endOwnerId={connectLineItem.endOwnerId}
			startOwnerFrame={startOwnerFrame}
			endOwnerFrame={endOwnerFrame}
			zoom={zoom}
			onDiagramChange={handleConnectLineDiagramChange}
		/>
	);
};
