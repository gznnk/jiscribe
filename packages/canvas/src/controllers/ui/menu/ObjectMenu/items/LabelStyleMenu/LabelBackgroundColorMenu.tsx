import { memo, useRef } from "react";

import { getSelectedConnectorLabel } from "./utils/getSelectedConnectorLabel";
import { resolveLabelFill } from "../../../../../../presentations/objects/connections/ConnectorLabel";
import { AUTO_COLOR } from "../../../../../../schemas/objects/utils/autoColor";
import type { CanvasControllerState } from "../../../../../CanvasTypes";
import { useCanvasMessages } from "../../../../../messages/CanvasMessagesContext";
import { ColorPreviewIcon } from "../../../../icons/ColorPreviewIcon";
import { ObjectMenuColorPickerGrid } from "../../common/ObjectMenuColorPickerGrid/ObjectMenuColorPickerGrid";
import { ObjectMenuDropdownPanel } from "../../common/ObjectMenuDropdownPanel";
import { useSubmenuPosition } from "../../hooks/useSubmenuPosition";
import {
	ObjectMenuButton,
	ObjectMenuItemPositioner,
} from "../../ObjectMenuStyled";

const SECTION_ID = "label-bg-color";

type Props = {
	canvasState: CanvasControllerState;
	onPropertyUpdate: (property: string, value: string, commit: boolean) => void;
};

/**
 * Label background color menu (same layout as the shape's Background Color).
 * The value is the nested `label.fill`. Omitted/auto resolves to the canvas background color (knockout).
 */
const LabelBackgroundColorMenuComponent: React.FC<Props> = ({
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

	const label = getSelectedConnectorLabel(canvasState);

	// Early-return only after all hooks have been called (to keep hook order stable).
	// No label text: render nothing, and the emptied section collapses via `:empty`.
	if (!label?.text) {
		return null;
	}

	const fill = label.fill ?? AUTO_COLOR;

	return (
		<ObjectMenuItemPositioner ref={menuItemRef}>
			<ObjectMenuButton
				isActive={isOpen}
				data-kind="menu"
				data-id="object-menu"
				data-part={`toggle:${SECTION_ID}`}
				title={messages.menuLabelBackgroundColor}
			>
				<ColorPreviewIcon
					color={resolveLabelFill(fill === AUTO_COLOR ? undefined : fill)}
					title={messages.menuLabelBackgroundColor}
				/>
			</ObjectMenuButton>
			{isOpen && (
				<ObjectMenuDropdownPanel
					ref={submenuRef}
					placement={placement}
					offsetX={offsetX}
				>
					<ObjectMenuColorPickerGrid
						currentColor={fill}
						property="label.fill"
						onPropertyUpdate={onPropertyUpdate}
					/>
				</ObjectMenuDropdownPanel>
			)}
		</ObjectMenuItemPositioner>
	);
};

export const LabelBackgroundColorMenu = memo(LabelBackgroundColorMenuComponent);
