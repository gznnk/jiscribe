import { EVENT_NAME_FLASH_CONNECT_LINE } from "../../../constants/core/EventNames";
import type { ConnectLineState } from "../../../types/state/shapes/ConnectLineState";
import { newEventId } from "../../../utils/core/newEventId";

export const triggerFlashConnectLine = (connectLine: ConnectLineState) => {
	document.dispatchEvent(
		new CustomEvent(EVENT_NAME_FLASH_CONNECT_LINE, {
			detail: {
				eventId: newEventId(),
				data: connectLine,
			},
		}),
	);
};
