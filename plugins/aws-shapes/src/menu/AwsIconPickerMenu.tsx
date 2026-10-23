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

import { AwsIconGlyph } from "./AwsIconGlyph";
import { AwsIconPicker } from "./AwsIconPicker";
import { AwsIconPickerFrame } from "./AwsIconPickerStyled";
import { awsShapesMessagesByLocale } from "../messages/awsShapesMessages";
import { useSelectedAwsIcon } from "../state/useSelectedAwsIcon";

/**
 * Kept apart from the toolbar category's id (also "aws"). Both put a
 * `toggle:{id}` into the DOM, so the same string would leave a selector unable
 * to tell them apart.
 */
const SECTION_ID = "aws-icon";

/**
 * The AWS icon picker in the ObjectMenu, for awsIcon alone: a button showing
 * the selected icon, opening the picker (AwsIconPicker) beneath it.
 *
 * The dropdown panel must not carry `data-gesture="none"` either, for the
 * reason the picker's cells give.
 */
const AwsIconPickerMenuComponent: React.FC<ObjectMenuItemProps> = ({
	openSectionId,
}) => {
	const locale = useCanvasLocale();
	const messages = resolveLocaleMessages(awsShapesMessagesByLocale, locale);
	const menuItemRef = useRef<HTMLDivElement>(null);
	const isOpen = openSectionId === SECTION_ID;
	const { icon, isMixed } = useSelectedAwsIcon();
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
				<AwsIconGlyph name={icon} size={18} />
			</ObjectMenuButton>
			{isOpen && (
				<ObjectMenuDropdownPanel
					ref={submenuRef}
					placement={placement}
					offsetX={offsetX}
				>
					<AwsIconPickerFrame>
						<AwsIconPicker currentIcon={isMixed ? undefined : icon} />
					</AwsIconPickerFrame>
				</ObjectMenuDropdownPanel>
			)}
		</ObjectMenuItemPositioner>
	);
};

export const AwsIconPickerMenu = memo(AwsIconPickerMenuComponent);
