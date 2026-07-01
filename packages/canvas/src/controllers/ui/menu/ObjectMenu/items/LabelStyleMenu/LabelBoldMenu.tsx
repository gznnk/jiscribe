import { memo } from "react";

import { getSelectedConnectorLabel } from "./utils/getSelectedConnectorLabel";
import type { CanvasControllerState } from "../../../../../CanvasTypes";
import { BoldIcon } from "../../../../icons/BoldIcon";
import { ObjectMenuButton, MenuItemPositioner } from "../../ObjectMenuStyled";

type Props = {
	canvasState: CanvasControllerState;
};

/**
 * Label bold menu (same toggle as the shape's Bold).
 * Toggles `label.fontWeight` between bold / normal. Updates via a direct data-id (gesture path).
 */
const LabelBoldMenuComponent: React.FC<Props> = ({ canvasState }) => {
	const isBold = getSelectedConnectorLabel(canvasState)?.fontWeight === "bold";

	return (
		<MenuItemPositioner>
			<ObjectMenuButton
				isActive={isBold}
				data-kind="object-menu"
				data-id={`object-menu:set:label.fontWeight:${isBold ? "normal" : "bold"}`}
				title="Label Bold"
			>
				<BoldIcon />
			</ObjectMenuButton>
		</MenuItemPositioner>
	);
};

export const LabelBoldMenu = memo(LabelBoldMenuComponent);
