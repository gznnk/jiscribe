import { memo, useRef } from "react";

import { TextFormatMenuContent } from "./TextFormatMenuStyled";
import type { CanvasControllerState } from "../../../../../../controllers/CanvasTypes";
import {
	setPart,
	togglePart,
} from "../../../../../gestures/handlers/menu/utils/menuParts";
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
import { readSelectionTextStyle } from "../../../utils/readSelectionTextStyle";
import { selectionValueOr } from "../../../utils/SelectionValue";
import { ObjectMenuDropdownPanel } from "../../common/ObjectMenuDropdownPanel";
import { useSubmenuPosition } from "../../hooks/useSubmenuPosition";
import {
	ObjectMenuButton,
	ObjectMenuItemPositioner,
} from "../../ObjectMenuStyled";

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
	const textStyle = readSelectionTextStyle(
		canvasState,
		objectTextStyleDefaults,
	);
	// Each button is its own toggle, so mixing is read per field. A field the
	// selection disagrees about reads as off, so one press brings all of it on.
	const fontWeight = selectionValueOr(textStyle.fontWeight, undefined);
	const fontStyle = selectionValueOr(textStyle.fontStyle, undefined);
	const textDecoration = selectionValueOr(textStyle.textDecoration, undefined);
	const isBold = isBoldFontWeight(fontWeight);
	const isItalic = fontStyle === "italic";
	const isUnderline = hasTextDecorationToken(textDecoration, "underline");
	const isStrikethrough = hasTextDecorationToken(
		textDecoration,
		"line-through",
	);

	const formatButtons = [
		{
			id: "bold",
			isActive: isBold,
			part: setPart("fontWeight", isBold ? "normal" : "bold"),
			label: messages.menuBold,
			icon: <BoldIcon title={messages.menuBold} />,
		},
		{
			id: "italic",
			isActive: isItalic,
			part: setPart("fontStyle", isItalic ? "normal" : "italic"),
			label: messages.menuItalic,
			icon: <ItalicIcon title={messages.menuItalic} />,
		},
		{
			id: "underline",
			isActive: isUnderline,
			part: setPart(
				"textDecoration",
				toggleTextDecorationToken(textDecoration, "underline"),
			),
			label: messages.menuUnderline,
			icon: <UnderlineIcon title={messages.menuUnderline} />,
		},
		{
			id: "strikethrough",
			isActive: isStrikethrough,
			part: setPart(
				"textDecoration",
				toggleTextDecorationToken(textDecoration, "line-through"),
			),
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
				data-part={togglePart(SECTION_ID)}
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
