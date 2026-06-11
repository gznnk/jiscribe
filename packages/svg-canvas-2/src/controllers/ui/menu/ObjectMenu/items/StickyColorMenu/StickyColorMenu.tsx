import { memo, useRef } from "react";

import { STICKY_PRESET_COLORS } from "./StickyColorConstants";
import {
	ColorGrid,
	ColorPickerContainer,
	ColorSwatch,
} from "./StickyColorMenuStyled";
import { getFirstSelectedWithProp } from "../../../../../../controllers/utils/getFirstSelectedWithProp";
import { ColorPreviewIcon } from "../../../../icons/ColorPreviewIcon";
import { useSubmenuPosition } from "../../hooks/useSubmenuPosition";
import {
	DropdownPanel,
	MenuItemPositioner,
	ObjectMenuButton,
} from "../../ObjectMenuStyled";
import type { MenuItemProps } from "../../ObjectMenuTypes";

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
				data-kind="object-menu"
				data-id={`object-menu:toggle:${SECTION_ID}`}
				title="Background Color"
			>
				<ColorPreviewIcon color={currentColor} title="Background Color" />
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
									data-kind="object-menu"
									data-id={`object-menu:set:fill:${preset.value}`}
									title={preset.name}
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
