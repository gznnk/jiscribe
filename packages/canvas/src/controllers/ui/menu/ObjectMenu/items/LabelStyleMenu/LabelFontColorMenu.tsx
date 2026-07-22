import { memo, useRef } from "react";

import { getSelectedConnectorLabel } from "./utils/getSelectedConnectorLabel";
import { resolveAutoColor } from "../../../../../../presentations/objects/utils/resolveAutoColor";
import { AUTO_COLOR } from "../../../../../../schemas/objects/utils/autoColor";
import type { CanvasControllerState } from "../../../../../CanvasTypes";
import { useCanvasMessages } from "../../../../../messages/CanvasMessagesContext";
import { FontColorIcon } from "../../../../icons/FontColorIcon";
import { ObjectMenuColorPickerGrid } from "../../common/ObjectMenuColorPickerGrid/ObjectMenuColorPickerGrid";
import { ObjectMenuDropdownPanel } from "../../common/ObjectMenuDropdownPanel";
import { useSubmenuPosition } from "../../hooks/useSubmenuPosition";
import {
	ObjectMenuButton,
	ObjectMenuItemPositioner,
} from "../../ObjectMenuStyled";

const SECTION_ID = "label-font-color";

type Props = {
	canvasState: CanvasControllerState;
	onPropertyUpdate: (property: string, value: string, commit: boolean) => void;
};

/**
 * Font color menu for the label (same layout as the shape's Font Color). The value is the nested `label.fontColor`.
 */
const LabelFontColorMenuComponent: React.FC<Props> = ({
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

	const fontColor = label.fontColor ?? AUTO_COLOR;

	return (
		<ObjectMenuItemPositioner ref={menuItemRef}>
			<ObjectMenuButton
				isActive={isOpen}
				data-kind="menu"
				data-id="object-menu"
				data-part={`toggle:${SECTION_ID}`}
				title={messages.menuLabelFontColor}
			>
				<FontColorIcon underlineColor={resolveAutoColor(fontColor, "ink")} />
			</ObjectMenuButton>
			{isOpen && (
				<ObjectMenuDropdownPanel
					ref={submenuRef}
					placement={placement}
					offsetX={offsetX}
				>
					<ObjectMenuColorPickerGrid
						currentColor={fontColor}
						property="label.fontColor"
						onPropertyUpdate={onPropertyUpdate}
					/>
				</ObjectMenuDropdownPanel>
			)}
		</ObjectMenuItemPositioner>
	);
};

export const LabelFontColorMenu = memo(LabelFontColorMenuComponent);
