import { memo } from "react";

import type { CanvasControllerState } from "../../../../../CanvasTypes";
import { useCanvasMessages } from "../../../../../messages/CanvasMessagesContext";
import { OpenReferenceIcon } from "../../../../icons/OpenReferenceIcon";
import {
	ObjectMenuButton,
	ObjectMenuItemPositioner,
} from "../../ObjectMenuStyled";
import type { OpenReferenceHandler } from "../../ObjectMenuTypes";
import { resolveOpenReference } from "../../utils/resolveOpenReference";

type OpenReferenceMenuProps = {
	canvasState: CanvasControllerState;
	onOpenReference: OpenReferenceHandler;
};

/**
 * Hands the selected object's `meta.reference` to the host.
 *
 * Wired through React `onClick` (opted out of the gesture system) rather than a
 * `data-part`: the gesture path ends in a pure state transition, which has
 * nowhere to put a host callback.
 */
const OpenReferenceMenuComponent: React.FC<OpenReferenceMenuProps> = ({
	canvasState,
	onOpenReference,
}) => {
	const messages = useCanvasMessages();
	const payload = resolveOpenReference(canvasState);
	if (payload === null) {
		return null;
	}

	return (
		<ObjectMenuItemPositioner>
			<ObjectMenuButton
				data-gesture="none"
				aria-label={messages.menuOpenReference}
				title={messages.menuOpenReference}
				onClick={() => onOpenReference(payload)}
			>
				<OpenReferenceIcon title={messages.menuOpenReference} />
			</ObjectMenuButton>
		</ObjectMenuItemPositioner>
	);
};

export const OpenReferenceMenu = memo(OpenReferenceMenuComponent);
