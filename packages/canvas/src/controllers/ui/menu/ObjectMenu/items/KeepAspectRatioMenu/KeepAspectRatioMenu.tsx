import { memo } from "react";

import { getSelectedLockAspectRatio } from "./utils/getSelectedLockAspectRatio";
import type { CanvasControllerState } from "../../../../../../controllers/CanvasTypes";
import { AspectRatioIcon } from "../../../../icons/AspectRatioIcon";
import { ObjectMenuButton, MenuItemPositioner } from "../../ObjectMenuStyled";

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
	const isLocked = getSelectedLockAspectRatio(canvasState);
	const nextValue = isLocked ? "false" : "true";

	return (
		<MenuItemPositioner>
			<ObjectMenuButton
				isActive={isLocked}
				data-kind="object-menu"
				data-id={`object-menu:set:lockAspectRatio:${nextValue}`}
				title={isLocked ? "Unlock Aspect Ratio" : "Lock Aspect Ratio"}
			>
				<AspectRatioIcon
					title={isLocked ? "Unlock Aspect Ratio" : "Lock Aspect Ratio"}
				/>
			</ObjectMenuButton>
		</MenuItemPositioner>
	);
};

export const KeepAspectRatioMenu = memo(KeepAspectRatioMenuComponent);
