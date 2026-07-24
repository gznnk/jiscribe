import { memo } from "react";

import { getSelectedLockAspectRatio } from "./utils/getSelectedLockAspectRatio";
import type { CanvasControllerState } from "../../../../../../controllers/CanvasTypes";
import { useCanvasMessages } from "../../../../../messages/CanvasMessagesContext";
import { AspectRatioIcon } from "../../../../icons/AspectRatioIcon";
import {
	ObjectMenuButton,
	ObjectMenuItemPositioner,
} from "../../ObjectMenuStyled";

type KeepAspectRatioMenuProps = {
	canvasState: CanvasControllerState;
};

/**
 * Aspect ratio lock menu.
 * Toggles the lockAspectRatio property of the selected object.
 * No dropdown — the button click toggles it directly.
 */
const KeepAspectRatioMenuComponent: React.FC<KeepAspectRatioMenuProps> = ({
	canvasState,
}) => {
	const messages = useCanvasMessages();
	const isLocked = getSelectedLockAspectRatio(canvasState);
	const nextValue = isLocked ? "false" : "true";
	const title = isLocked
		? messages.menuUnlockAspectRatio
		: messages.menuLockAspectRatio;

	return (
		<ObjectMenuItemPositioner>
			<ObjectMenuButton
				isActive={isLocked}
				data-kind="menu"
				data-id="object-menu"
				data-part={`set:lockAspectRatio:${nextValue}`}
				title={title}
			>
				<AspectRatioIcon title={title} />
			</ObjectMenuButton>
		</ObjectMenuItemPositioner>
	);
};

export const KeepAspectRatioMenu = memo(KeepAspectRatioMenuComponent);
