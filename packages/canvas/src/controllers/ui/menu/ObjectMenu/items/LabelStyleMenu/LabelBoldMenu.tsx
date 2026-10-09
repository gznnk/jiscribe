import { memo } from "react";

import { setPart } from "../../../../../gestures/handlers/menu/utils/menuParts";
import { useCanvasMessages } from "../../../../../messages/CanvasMessagesContext";
import { isBoldFontWeight } from "../../../../../utils/isBoldFontWeight";
import { BoldIcon } from "../../../../icons/BoldIcon";
import { useConnectorLabelStyle } from "../../../hooks/useConnectorLabelStyle";
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
	selection,
}) => {
	const messages = useCanvasMessages();
	const { value: fontWeight, hasLabelText } = useConnectorLabelStyle(
		"label.fontWeight",
		undefined,
		{ objects, selection },
	);
	const isBold = isBoldFontWeight(fontWeight);

	// No label text: render nothing, and the emptied section collapses via `:empty`.
	if (!hasLabelText) {
		return null;
	}

	return (
		<ObjectMenuItemPositioner>
			<ObjectMenuButton
				isActive={isBold}
				data-part={setPart("label.fontWeight", isBold ? "normal" : "bold")}
				title={messages.menuLabelBold}
			>
				<BoldIcon />
			</ObjectMenuButton>
		</ObjectMenuItemPositioner>
	);
};

export const LabelBoldMenu = memo(LabelBoldMenuComponent);
