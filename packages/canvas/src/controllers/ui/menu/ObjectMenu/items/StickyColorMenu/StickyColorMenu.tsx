import { memo, useRef } from "react";

import { STICKY_PRESET_COLORS } from "./StickyColorConstants";
import {
	ColorGrid,
	ColorPickerContainer,
	ColorSwatch,
} from "./StickyColorMenuStyled";
import { useCanvasMessages } from "../../../../../messages/CanvasMessagesContext";
import { ColorPreviewIcon } from "../../../../icons/ColorPreviewIcon";
import { ObjectMenuDropdownPanel } from "../../common/ObjectMenuDropdownPanel";
import { useSubmenuPosition } from "../../hooks/useSubmenuPosition";
import {
	ObjectMenuItemPositioner,
	ObjectMenuButton,
} from "../../ObjectMenuStyled";
import type { ObjectMenuItemProps } from "../../ObjectMenuTypes";
import { getFirstSelectedWithProp } from "../../utils/getFirstSelectedWithProp";

const SECTION_ID = "sticky-color";

const getSelectedFillColor = (
	state: ObjectMenuItemProps["canvasState"],
): string => {
	const obj = getFirstSelectedWithProp(
		state.selectedIds,
		state.objects,
		"fill",
	);
	const fill = (obj as Record<string, unknown>)?.fill;
	return typeof fill === "string" ? fill : "transparent";
};

const StickyColorMenuComponent: React.FC<ObjectMenuItemProps> = ({
	canvasState,
}) => {
	const messages = useCanvasMessages();
	const menuItemRef = useRef<HTMLDivElement>(null);
	const isOpen = canvasState.objectMenuOpenId === SECTION_ID;
	const currentColor = getSelectedFillColor(canvasState);
	const { submenuRef, placement, offsetX } = useSubmenuPosition(
		menuItemRef,
		isOpen,
	);

	return (
		<ObjectMenuItemPositioner ref={menuItemRef}>
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
				<ObjectMenuDropdownPanel
					ref={submenuRef}
					placement={placement}
					offsetX={offsetX}
				>
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
				</ObjectMenuDropdownPanel>
			)}
		</ObjectMenuItemPositioner>
	);
};

export const StickyColorMenu = memo(StickyColorMenuComponent);
