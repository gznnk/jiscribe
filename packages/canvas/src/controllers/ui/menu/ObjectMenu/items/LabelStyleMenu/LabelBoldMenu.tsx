import { isString } from "@jiscribe/basic-validators";
import { memo } from "react";

import { setPart } from "../../../../../gestures/handlers/menu/utils/menuParts";
import { useCanvasMessages } from "../../../../../messages/CanvasMessagesContext";
import { useSelectionStyle } from "../../../../../style/SelectionStyleReaderContext";
import { selectionValueAs } from "../../../../../style/SelectionValue";
import { hasSelectedConnectorLabelText } from "../../../../../utils/hasSelectedConnectorLabelText";
import { isBoldFontWeight } from "../../../../../utils/isBoldFontWeight";
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
	selection,
}) => {
	const messages = useCanvasMessages();
	const isBold = isBoldFontWeight(
		selectionValueAs(
			useSelectionStyle("label.fontWeight"),
			isString,
			undefined,
		),
	);

	// Early-return only after all hooks have been called (to keep hook order stable).
	// No label text: render nothing, and the emptied section collapses via `:empty`.
	if (!hasSelectedConnectorLabelText({ objects, selection })) {
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
