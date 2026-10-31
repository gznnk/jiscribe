import type { ObjectMenuItemProps } from "@jiscribe/canvas";
import {
	ColorPreviewIcon,
	ObjectMenuButton,
	ObjectMenuDropdownPanel,
	ObjectMenuItemPositioner,
	useCanvasMessages,
	useSubmenuPosition,
	toggleAction,
} from "@jiscribe/canvas-sdk";
import { memo, useRef } from "react";

import { ColorPickerContainer } from "./StickyColorMenuStyled";
import { StickyColorPalette } from "./StickyColorPalette";
import { useSelectedStickyColor } from "../state/useSelectedStickyColor";

const SECTION_ID = "sticky-color";

/**
 * Paper-color menu (sticky only). Replaces the generic fill picker with the
 * pastel palette, so the swatches on offer are the ones a note can plausibly be.
 *
 * The labels come from the canvas `colorNames` dictionary rather than a
 * plugin-owned one: every preset name is a key it already carries.
 */
const StickyColorMenuComponent: React.FC<ObjectMenuItemProps> = ({
	openSectionId,
}) => {
	const messages = useCanvasMessages();
	const menuItemRef = useRef<HTMLDivElement>(null);
	const isOpen = openSectionId === SECTION_ID;
	const currentColor = useSelectedStickyColor();
	const { submenuRef, placement, offsetX } = useSubmenuPosition(
		menuItemRef,
		isOpen,
	);

	return (
		<ObjectMenuItemPositioner ref={menuItemRef}>
			<ObjectMenuButton
				isActive={isOpen}
				data-action={toggleAction(SECTION_ID)}
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
						<StickyColorPalette />
					</ColorPickerContainer>
				</ObjectMenuDropdownPanel>
			)}
		</ObjectMenuItemPositioner>
	);
};

export const StickyColorMenu = memo(StickyColorMenuComponent);
