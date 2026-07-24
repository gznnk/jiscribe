import { memo } from "react";

import { getSelectedConnectorLabel } from "./utils/getSelectedConnectorLabel";
import { useCanvasMessages } from "../../../../../messages/CanvasMessagesContext";
import { BoldIcon } from "../../../../icons/BoldIcon";
import {
	ObjectMenuButton,
	ObjectMenuItemPositioner,
} from "../../ObjectMenuStyled";
import type { ObjectMenuItemProps } from "../../ObjectMenuTypes";

/**
 * Label bold menu (same toggle as the shape's Bold).
 * Toggles `label.fontWeight` between bold / normal. Updates via a direct data-id (gesture path).
 */
const LabelBoldMenuComponent: React.FC<ObjectMenuItemProps> = ({
	objects,
	selectedConnectorId,
}) => {
	const messages = useCanvasMessages();
	const label = getSelectedConnectorLabel(selectedConnectorId, objects);

	// Early-return only after all hooks have been called (to keep hook order stable).
	// No label text: render nothing, and the emptied section collapses via `:empty`.
	if (!label?.text) {
		return null;
	}

	const isBold = label.fontWeight === "bold";

	return (
		<ObjectMenuItemPositioner>
			<ObjectMenuButton
				isActive={isBold}
				data-kind="menu"
				data-id="object-menu"
				data-part={`set:label.fontWeight:${isBold ? "normal" : "bold"}`}
				title={messages.menuLabelBold}
			>
				<BoldIcon />
			</ObjectMenuButton>
		</ObjectMenuItemPositioner>
	);
};

export const LabelBoldMenu = memo(LabelBoldMenuComponent);
