import { memo, useRef } from "react";

import { TextFormatMenuContent } from "./TextFormatMenuStyled";
import type { CanvasControllerState } from "../../../../../../controllers/CanvasTypes";
import { useCanvasMessages } from "../../../../../messages/CanvasMessagesContext";
import { useCanvasRegistries } from "../../../../../registries/CanvasRegistriesContext";
import { isBoldFontWeight } from "../../../../../utils/isBoldFontWeight";
import { resolveSelectedTextSlot } from "../../../../../utils/resolveSelectedTextSlot";
import {
	hasTextDecorationToken,
	toggleTextDecorationToken,
} from "../../../../../utils/toggleTextDecorationToken";
import { BoldIcon } from "../../../../icons/BoldIcon";
import { ItalicIcon } from "../../../../icons/ItalicIcon";
import { StrikethroughIcon } from "../../../../icons/StrikethroughIcon";
import { UnderlineIcon } from "../../../../icons/UnderlineIcon";
import { ObjectMenuDropdownPanel } from "../../common/ObjectMenuDropdownPanel";
import { useSubmenuPosition } from "../../hooks/useSubmenuPosition";
import {
	ObjectMenuButton,
	ObjectMenuItemPositioner,
} from "../../ObjectMenuStyled";
import { getSelectedOrFirstTextSlot } from "../../utils/getSelectedOrFirstTextSlot";

const SECTION_ID = "text-format";

type TextFormatMenuProps = {
	canvasState: CanvasControllerState;
};

/**
 * Text format menu.
 * Toggles the fontWeight / fontStyle / textDecoration of the selected text slot.
 * Each button coordinates with the gesture system via data attributes, writing
 * the value the press should land on rather than a toggle command.
 *
 * While the focus is on text — a slot selected below the object, or an inline edit
 * session — the four buttons are laid out flat in the menu itself: formatting is the
 * main thing the menu is there for at that moment, and a dropdown would cost a press
 * per toggle.
 */
const TextFormatMenuComponent: React.FC<TextFormatMenuProps> = ({
	canvasState,
}) => {
	const messages = useCanvasMessages();
	const menuItemRef = useRef<HTMLDivElement>(null);
	const isOpen = canvasState.objectMenuOpenId === SECTION_ID;
	const { submenuRef, placement, offsetX } = useSubmenuPosition(
		menuItemRef,
		isOpen,
	);

	const { objectTextStyleDefaults } = useCanvasRegistries();
	const slot = getSelectedOrFirstTextSlot(canvasState, objectTextStyleDefaults);
	const isBold = isBoldFontWeight(slot?.fontWeight);
	const isItalic = slot?.fontStyle === "italic";
	const isUnderline = hasTextDecorationToken(slot?.textDecoration, "underline");
	const isStrikethrough = hasTextDecorationToken(
		slot?.textDecoration,
		"line-through",
	);

	const formatButtons = [
		{
			id: "bold",
			isActive: isBold,
			part: `set:fontWeight:${isBold ? "normal" : "bold"}`,
			label: messages.menuBold,
			icon: <BoldIcon title={messages.menuBold} />,
		},
		{
			id: "italic",
			isActive: isItalic,
			part: `set:fontStyle:${isItalic ? "normal" : "italic"}`,
			label: messages.menuItalic,
			icon: <ItalicIcon title={messages.menuItalic} />,
		},
		{
			id: "underline",
			isActive: isUnderline,
			part: `set:textDecoration:${toggleTextDecorationToken(
				slot?.textDecoration,
				"underline",
			)}`,
			label: messages.menuUnderline,
			icon: <UnderlineIcon title={messages.menuUnderline} />,
		},
		{
			id: "strikethrough",
			isActive: isStrikethrough,
			part: `set:textDecoration:${toggleTextDecorationToken(
				slot?.textDecoration,
				"line-through",
			)}`,
			label: messages.menuStrikethrough,
			icon: <StrikethroughIcon title={messages.menuStrikethrough} />,
		},
	];

	const renderFormatButton = (button: (typeof formatButtons)[number]) => (
		<ObjectMenuButton
			key={button.id}
			isActive={button.isActive}
			data-kind="menu"
			data-id="object-menu"
			data-part={button.part}
			title={button.label}
		>
			{button.icon}
		</ObjectMenuButton>
	);

	const isTextFocused =
		canvasState.textEditState?.kind === "shape" ||
		resolveSelectedTextSlot(canvasState) !== null;
	if (isTextFocused) {
		return <>{formatButtons.map(renderFormatButton)}</>;
	}

	return (
		<ObjectMenuItemPositioner ref={menuItemRef}>
			<ObjectMenuButton
				isActive={isOpen}
				data-kind="menu"
				data-id="object-menu"
				data-part={`toggle:${SECTION_ID}`}
				title={messages.menuTextFormat}
			>
				<BoldIcon title={messages.menuTextFormat} />
			</ObjectMenuButton>
			{isOpen && (
				<ObjectMenuDropdownPanel
					ref={submenuRef}
					placement={placement}
					offsetX={offsetX}
				>
					<TextFormatMenuContent>
						{formatButtons.map(renderFormatButton)}
					</TextFormatMenuContent>
				</ObjectMenuDropdownPanel>
			)}
		</ObjectMenuItemPositioner>
	);
};

export const TextFormatMenu = memo(TextFormatMenuComponent);
