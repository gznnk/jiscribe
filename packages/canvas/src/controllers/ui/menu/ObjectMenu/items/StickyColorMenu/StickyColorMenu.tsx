import { memo, useRef } from "react";

import { STICKY_PRESET_COLORS } from "./StickyColorConstants";
import {
	ColorGrid,
	ColorPickerContainer,
	ColorSwatch,
} from "./StickyColorMenuStyled";
import { useCanvasMessages } from "../../../../../messages/CanvasMessagesContext";
import { ColorPreviewIcon } from "../../../../icons/ColorPreviewIcon";
import { DropdownPanel } from "../../common/DropdownPanel";
import { useSubmenuPosition } from "../../hooks/useSubmenuPosition";
import { MenuItemPositioner, ObjectMenuButton } from "../../ObjectMenuStyled";
import type { MenuItemProps } from "../../ObjectMenuTypes";
import { getFirstSelectedWithProp } from "../../utils/getFirstSelectedWithProp";

const SECTION_ID = "sticky-color";

const getSelectedFillColor = (state: MenuItemProps["canvasState"]): string => {
	const obj = getFirstSelectedWithProp(
		state.selectedIds,
		state.objects,
		"fill",
	);
	const fill = (obj as Record<string, unknown>)?.fill;
	return typeof fill === "string" ? fill : "transparent";
};

const StickyColorMenuComponent: React.FC<MenuItemProps> = ({ canvasState }) => {
	const messages = useCanvasMessages();
	const menuItemRef = useRef<HTMLDivElement>(null);
	const isOpen = canvasState.objectMenuOpenId === SECTION_ID;
	const currentColor = getSelectedFillColor(canvasState);
	const { submenuRef, placement, offsetX } = useSubmenuPosition(
		menuItemRef,
		isOpen,
	);

	return (
		<MenuItemPositioner ref={menuItemRef}>
			<ObjectMenuButton
				isActive={isOpen}
				data-kind="menu"
				data-id="object-menu"
				data-part={`toggle:${SECTION_ID}`}
				title={messages.menuBackgroundColor}
			>
				<ColorPreviewIcon
					color={currentColor}
					title={messages.menuBackgroundColor}
				/>
			</ObjectMenuButton>
			{isOpen && (
				<DropdownPanel ref={submenuRef} placement={placement} offsetX={offsetX}>
					<ColorPickerContainer>
						<ColorGrid>
							{STICKY_PRESET_COLORS.map((preset) => (
								<ColorSwatch
									key={preset.value}
									swatchColor={preset.value}
									selected={
										preset.value.toLowerCase() === currentColor.toLowerCase()
									}
									data-kind="menu"
									data-id="object-menu"
									data-part={`set:fill:${preset.value}`}
									title={messages.colorNames[preset.name] ?? preset.name}
								/>
							))}
						</ColorGrid>
					</ColorPickerContainer>
				</DropdownPanel>
			)}
		</MenuItemPositioner>
	);
};

export const StickyColorMenu = memo(StickyColorMenuComponent);
