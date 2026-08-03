import type { ObjectMenuItemProps } from "@workspace/canvas";
import {
	ColorPreviewIcon,
	ObjectMenuButton,
	ObjectMenuDropdownPanel,
	ObjectMenuItemPositioner,
	getFirstSelectedWithProp,
	useCanvasMessages,
	useSubmenuPosition,
} from "@workspace/canvas/unstable";
import { memo, useRef } from "react";

import { STICKY_PRESET_COLORS } from "./StickyColorConstants";
import {
	ColorGrid,
	ColorPickerContainer,
	ColorSwatch,
} from "./StickyColorMenuStyled";

const SECTION_ID = "sticky-color";

const getSelectedFillColor = (
	selectedIds: string[],
	objects: ObjectMenuItemProps["objects"],
): string => {
	const obj = getFirstSelectedWithProp(selectedIds, objects, "fill");
	const fill = (obj as Record<string, unknown>)?.fill;
	return typeof fill === "string" ? fill : "transparent";
};

/**
 * Paper-color menu (sticky only). Replaces the generic fill picker with the
 * pastel palette, so the swatches on offer are the ones a note can plausibly be.
 *
 * The labels come from the canvas `colorNames` dictionary rather than a
 * plugin-owned one: every preset name is a key it already carries.
 */
const StickyColorMenuComponent: React.FC<ObjectMenuItemProps> = ({
	objects,
	selectedIds,
	openSectionId,
}) => {
	const messages = useCanvasMessages();
	const menuItemRef = useRef<HTMLDivElement>(null);
	const isOpen = openSectionId === SECTION_ID;
	const currentColor = getSelectedFillColor(selectedIds, objects);
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
