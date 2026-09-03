import { memo } from "react";

import type { CanvasControllerState } from "../../../../../CanvasTypes";
import { isSelectionAutoHeight } from "../../../../../commands/shape/ToggleAutoHeightCommand";
import { useCanvasMessages } from "../../../../../messages/CanvasMessagesContext";
import { useCanvasRegistries } from "../../../../../registries/CanvasRegistriesContext";
import { AutoHeightIcon } from "../../../../icons/AutoHeightIcon";
import {
	ObjectMenuButton,
	ObjectMenuItemPositioner,
} from "../../ObjectMenuStyled";

type AutoHeightMenuProps = {
	canvasState: CanvasControllerState;
};

/**
 * Switches the selected shapes between a height they state and one that follows
 * their text. No dropdown — the press toggles it, the way the aspect-ratio lock
 * does.
 *
 * Offered only for the types whose document may leave `height` out
 * (`ObjectAutoHeightRegistry`), which is what registers the section this item
 * sits in: a selection mixing such a shape with one that cannot take the switch
 * drops the section entirely, the menu keeping only the sections every selected
 * type registers (useMenuSections).
 *
 * Lit when every switchable object in the selection is already following its
 * text, so a selection with one fixed shape in it reads as off and one press
 * brings the whole selection to auto (see `isSelectionAutoHeight`).
 */
const AutoHeightMenuComponent: React.FC<AutoHeightMenuProps> = ({
	canvasState,
}) => {
	const messages = useCanvasMessages();
	const { objectAutoHeight } = useCanvasRegistries();
	const isAuto = isSelectionAutoHeight(canvasState, objectAutoHeight);
	const title = isAuto ? messages.menuFixedHeight : messages.menuAutoHeight;

	return (
		<ObjectMenuItemPositioner>
			<ObjectMenuButton
				isActive={isAuto}
				data-kind="menu"
				data-id="object-menu"
				data-part="command:toggleAutoHeight"
				title={title}
			>
				<AutoHeightIcon title={title} />
			</ObjectMenuButton>
		</ObjectMenuItemPositioner>
	);
};

export const AutoHeightMenu = memo(AutoHeightMenuComponent);
