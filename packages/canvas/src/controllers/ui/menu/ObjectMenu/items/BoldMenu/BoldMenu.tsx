import { memo } from "react";

import type { CanvasControllerState } from "../../../../../../controllers/CanvasTypes";
import type { TextStyleState } from "../../../../../../states/objects/base/TextStyleState";
import { BoldIcon } from "../../../../icons/BoldIcon";
import { ObjectMenuButton, MenuItemPositioner } from "../../ObjectMenuStyled";
import { getFirstSelectedWithProp } from "../../utils/getFirstSelectedWithProp";

type BoldMenuProps = {
	canvasState: CanvasControllerState;
};

/**
 * Bold menu.
 * Toggles the fontWeight of the selected text object.
 */
const BoldMenuComponent: React.FC<BoldMenuProps> = ({ canvasState }) => {
	const { selectedIds, objects } = canvasState;
	const obj = getFirstSelectedWithProp(selectedIds, objects, "fontWeight");
	const isBold = (obj as TextStyleState | undefined)?.fontWeight === "bold";

	return (
		<MenuItemPositioner>
			<ObjectMenuButton
				isActive={isBold}
				data-kind="object-menu"
				data-id={`object-menu:set:fontWeight:${isBold ? "normal" : "bold"}`}
				title="Bold"
			>
				<BoldIcon />
			</ObjectMenuButton>
		</MenuItemPositioner>
	);
};

export const BoldMenu = memo(BoldMenuComponent);
