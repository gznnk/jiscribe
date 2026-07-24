import { memo } from "react";

import type { CanvasControllerState } from "../../../../../../controllers/CanvasTypes";
import type { TextStyleState } from "../../../../../../states/objects/base/TextStyleState";
import { useCanvasMessages } from "../../../../../messages/CanvasMessagesContext";
import { BoldIcon } from "../../../../icons/BoldIcon";
import {
	ObjectMenuButton,
	ObjectMenuItemPositioner,
} from "../../ObjectMenuStyled";
import { getFirstSelectedWithProp } from "../../utils/getFirstSelectedWithProp";

type BoldMenuProps = {
	canvasState: CanvasControllerState;
};

/**
 * Bold menu.
 * Toggles the fontWeight of the selected text object.
 */
const BoldMenuComponent: React.FC<BoldMenuProps> = ({ canvasState }) => {
	const messages = useCanvasMessages();
	const { selectedIds, objects } = canvasState;
	const obj = getFirstSelectedWithProp(selectedIds, objects, "fontWeight");
	const isBold = (obj as TextStyleState | undefined)?.fontWeight === "bold";

	return (
		<ObjectMenuItemPositioner>
			<ObjectMenuButton
				isActive={isBold}
				data-kind="menu"
				data-id="object-menu"
				data-part={`set:fontWeight:${isBold ? "normal" : "bold"}`}
				title={messages.menuBold}
			>
				<BoldIcon />
			</ObjectMenuButton>
		</ObjectMenuItemPositioner>
	);
};

export const BoldMenu = memo(BoldMenuComponent);
