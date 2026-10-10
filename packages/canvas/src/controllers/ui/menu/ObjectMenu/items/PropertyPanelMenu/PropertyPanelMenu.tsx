import { memo } from "react";

import { commandAction } from "../../../../../gestures/handlers/menu/utils/menuActions";
import { useCanvasMessages } from "../../../../../messages/CanvasMessagesContext";
import { EllipsisIcon } from "../../../../icons/EllipsisIcon";
import {
	ObjectMenuButton,
	ObjectMenuItemPositioner,
} from "../../ObjectMenuStyled";

/**
 * Opens the properties sidebar, which states everything the menu does and
 * more. Always the last thing on the bar, outside the per-type sections: the
 * menu is withdrawn while the sidebar is open (useObjectMenuPosition), so the
 * press never has to read as a toggle.
 */
const PropertyPanelMenuComponent: React.FC = () => {
	const messages = useCanvasMessages();
	const title = messages.menuPropertyPanel;

	return (
		<ObjectMenuItemPositioner>
			<ObjectMenuButton
				data-action={commandAction("togglePropertyPanel")}
				aria-label={title}
				title={title}
			>
				<EllipsisIcon />
			</ObjectMenuButton>
		</ObjectMenuItemPositioner>
	);
};

export const PropertyPanelMenu = memo(PropertyPanelMenuComponent);
