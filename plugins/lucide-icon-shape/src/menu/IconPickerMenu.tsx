import type { ObjectMenuItemProps } from "@jiscribe/canvas";
import {
	ObjectMenuButton,
	ObjectMenuDropdownPanel,
	ObjectMenuItemPositioner,
	resolveLocaleMessages,
	useCanvasLocale,
	useSubmenuPosition,
	toggleAction,
} from "@jiscribe/canvas-sdk";
import { memo, useRef } from "react";

import { IconGlyph } from "./IconGlyph";
import { IconPicker } from "./IconPicker";
import { IconPickerFrame } from "./IconPickerStyled";
import { lucideIconMessagesByLocale } from "../messages/lucideIconMessages";
import { useSelectedIcon } from "../state/useSelectedIcon";

/**
 * Distinct from the toolbar category's id, which is also about icons: both render a
 * `toggle:{id}` action, and sharing the string would make the two indistinguishable to
 * anything selecting on it.
 */
const SECTION_ID = "lucide-icon";

/**
 * The icon picker in the ObjectMenu (lucideIcon only): a button showing the
 * selected icon, opening the picker (IconPicker) beneath it.
 *
 * The dropdown panel must not carry `data-gesture="none"` either, for the reason
 * the picker's cells give.
 */
const IconPickerMenuComponent: React.FC<ObjectMenuItemProps> = ({
	openSectionId,
}) => {
	const locale = useCanvasLocale();
	const messages = resolveLocaleMessages(lucideIconMessagesByLocale, locale);
	const menuItemRef = useRef<HTMLDivElement>(null);
	const isOpen = openSectionId === SECTION_ID;
	const { icon, isMixed } = useSelectedIcon();
	const { submenuRef, placement, offsetX } = useSubmenuPosition(
		menuItemRef,
		isOpen,
	);

	return (
		<ObjectMenuItemPositioner ref={menuItemRef}>
			<ObjectMenuButton
				isActive={isOpen}
				data-action={toggleAction(SECTION_ID)}
				title={messages.menuIcon}
			>
				<IconGlyph name={icon} size={18} />
			</ObjectMenuButton>
			{isOpen && (
				<ObjectMenuDropdownPanel
					ref={submenuRef}
					placement={placement}
					offsetX={offsetX}
				>
					<IconPickerFrame>
						<IconPicker currentIcon={isMixed ? undefined : icon} />
					</IconPickerFrame>
				</ObjectMenuDropdownPanel>
			)}
		</ObjectMenuItemPositioner>
	);
};

export const IconPickerMenu = memo(IconPickerMenuComponent);
