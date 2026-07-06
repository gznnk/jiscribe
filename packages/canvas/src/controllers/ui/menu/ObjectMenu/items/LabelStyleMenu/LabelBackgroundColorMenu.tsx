import { memo, useRef } from "react";

import { getSelectedConnectorLabel } from "./utils/getSelectedConnectorLabel";
import { resolveLabelFill } from "../../../../../../presentations/objects/connections/ConnectorLabel";
import { AUTO_COLOR } from "../../../../../../schemas/objects/utils/autoColor";
import type { CanvasControllerState } from "../../../../../CanvasTypes";
import { ColorPreviewIcon } from "../../../../icons/ColorPreviewIcon";
import { ColorPickerGrid } from "../../common/ColorPickerGrid/ColorPickerGrid";
import { DropdownPanel } from "../../common/DropdownPanel";
import { useSubmenuPosition } from "../../hooks/useSubmenuPosition";
import { ObjectMenuButton, MenuItemPositioner } from "../../ObjectMenuStyled";

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
	const menuItemRef = useRef<HTMLDivElement>(null);
	const isOpen = canvasState.objectMenuOpenId === SECTION_ID;
	const { submenuRef, placement, offsetX } = useSubmenuPosition(
		menuItemRef,
		isOpen,
	);

	const fill = getSelectedConnectorLabel(canvasState)?.fill ?? AUTO_COLOR;

	return (
		<MenuItemPositioner ref={menuItemRef}>
			<ObjectMenuButton
				isActive={isOpen}
				data-kind="menu"
				data-id="object-menu"
				data-part={`toggle:${SECTION_ID}`}
				title="Label Background Color"
			>
				<ColorPreviewIcon
					color={resolveLabelFill(fill === AUTO_COLOR ? undefined : fill)}
					title="Label Background Color"
				/>
			</ObjectMenuButton>
			{isOpen && (
				<DropdownPanel ref={submenuRef} placement={placement} offsetX={offsetX}>
					<ColorPickerGrid
						currentColor={fill}
						property="label.fill"
						onPropertyUpdate={onPropertyUpdate}
					/>
				</DropdownPanel>
			)}
		</MenuItemPositioner>
	);
};

export const LabelBackgroundColorMenu = memo(LabelBackgroundColorMenuComponent);
