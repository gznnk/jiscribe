import { memo, useEffect, useState } from "react";

import { FlashGroup } from "./FlashConnectLineStyled";
import { EVENT_NAME_FLASH_CONNECT_LINE } from "../../../constants/core/EventNames";
import type { FlashConnectLineEvent } from "../../../types/events/FlashConnectLineEvent";
import { createPathDValue } from "../../../utils/shapes/path/createPathDValue";
import {
	createEndPointArrowHead,
	createStartPointArrowHead,
} from "../../shapes/Path/PathUtils";

export const FlashConnectLineComponent = () => {
	const [connectLineList, setConnectLineList] = useState<
		FlashConnectLineEvent[]
	>([]);

	useEffect(() => {
		const handleFlashConnectLine = (e: Event) => {
			const customEvent = e as CustomEvent<FlashConnectLineEvent>;
			const event = customEvent.detail;
			if (event) {
				setConnectLineList((prev) => [...prev, event]);
				setTimeout(() => {
					setConnectLineList((prev) =>
						prev.filter(
							(line) =>
								line.data.id !== event.data.id &&
								line.eventId !== event.eventId,
						),
					);
				}, 500); // Reset after animation
			}
		};

		document.addEventListener(
			EVENT_NAME_FLASH_CONNECT_LINE,
			handleFlashConnectLine,
		);
		return () => {
			document.removeEventListener(
				EVENT_NAME_FLASH_CONNECT_LINE,
				handleFlashConnectLine,
			);
		};
	}, []);

	return connectLineList.map((connectLine) => {
		const pathData = {
			points: connectLine.data.points,
			stroke: connectLine.data.stroke,
			strokeWidth: connectLine.data.strokeWidth,
			pathType: connectLine.data.pathType,
			startArrowHead: connectLine.data.startArrowHead,
			endArrowHead: connectLine.data.endArrowHead,
		};

		// Create arrow head elements
		const startArrowHeadElement = createStartPointArrowHead(pathData);
		const endArrowHeadElement = createEndPointArrowHead(pathData);

		return (
			<FlashGroup
				$flash={true}
				key={`${connectLine.data.id}-${connectLine.eventId}`}
			>
				<path
					d={createPathDValue(
						connectLine.data.points,
						connectLine.data.pathType,
					)}
					strokeWidth={connectLine.data.strokeWidth}
					stroke={connectLine.data.stroke}
					fill="none"
					pointerEvents="none"
				/>
				{/* Arrow heads */}
				{startArrowHeadElement}
				{endArrowHeadElement}
			</FlashGroup>
		);
	});
};

export const FlashConnectLine = memo(FlashConnectLineComponent);
