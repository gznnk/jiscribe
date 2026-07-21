import { memo, useRef } from "react";

import { getSelectedConnectorLabel } from "./utils/getSelectedConnectorLabel";
import { resolveAutoColor } from "../../../../../../presentations/objects/utils/resolveAutoColor";
import { AUTO_COLOR } from "../../../../../../schemas/objects/utils/autoColor";
import type { CanvasControllerState } from "../../../../../CanvasTypes";
import { useCanvasMessages } from "../../../../../messages/CanvasMessagesContext";
import { BorderColorIcon } from "../../../../icons/BorderColorIcon";
import { ObjectMenuColorPickerGrid } from "../../common/ObjectMenuColorPickerGrid/ObjectMenuColorPickerGrid";
import { ObjectMenuDropdownPanel } from "../../common/ObjectMenuDropdownPanel";
import { useSubmenuPosition } from "../../hooks/useSubmenuPosition";
import {
	ObjectMenuButton,
	ObjectMenuItemPositioner,
} from "../../ObjectMenuStyled";

const SECTION_ID = "label-border-color";

type Props = {
	canvasState: CanvasControllerState;
	onPropertyUpdate: (property: string, value: string, commit: boolean) => void;
};

/**
 * Label border color menu (same layout as the shape's Border Color).
 * The value is the nested `label.stroke`. The border is only visible when `label.strokeWidth > 0`.
 */
const LabelBorderColorMenuComponent: React.FC<Props> = ({
	canvasState,
	onPropertyUpdate,
}) => {
	const messages = useCanvasMessages();
	const menuItemRef = useRef<HTMLDivElement>(null);
	const isOpen = canvasState.objectMenuOpenId === SECTION_ID;
	const { submenuRef, placement, offsetX } = useSubmenuPosition(
		menuItemRef,
		isOpen,
	);

	const stroke = getSelectedConnectorLabel(canvasState)?.stroke ?? AUTO_COLOR;

	return (
		<ObjectMenuItemPositioner ref={menuItemRef}>
			<ObjectMenuButton
				isActive={isOpen}
				data-kind="menu"
				data-id="object-menu"
				data-part={`toggle:${SECTION_ID}`}
				title={messages.menuLabelBorderColor}
			>
				<BorderColorIcon
					color={resolveAutoColor(stroke, "ink")}
					title={messages.menuLabelBorderColor}
				/>
			</ObjectMenuButton>
			{isOpen && (
				<ObjectMenuDropdownPanel
					ref={submenuRef}
					placement={placement}
					offsetX={offsetX}
				>
					<ObjectMenuColorPickerGrid
						currentColor={stroke}
						property="label.stroke"
						onPropertyUpdate={onPropertyUpdate}
					/>
				</ObjectMenuDropdownPanel>
			)}
		</ObjectMenuItemPositioner>
	);
};

export const LabelBorderColorMenu = memo(LabelBorderColorMenuComponent);
