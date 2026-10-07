import { memo, useRef } from "react";

import { TextFormatMenuContent } from "./TextFormatMenuStyled";
import type { CanvasControllerState } from "../../../../../../controllers/CanvasTypes";
import { togglePart } from "../../../../../gestures/handlers/menu/utils/menuParts";
import { useCanvasMessages } from "../../../../../messages/CanvasMessagesContext";
import { BoldIcon } from "../../../../icons/BoldIcon";
import { ItalicIcon } from "../../../../icons/ItalicIcon";
import { StrikethroughIcon } from "../../../../icons/StrikethroughIcon";
import { UnderlineIcon } from "../../../../icons/UnderlineIcon";
import { useTextFormatToggles } from "../../../hooks/useTextFormatToggles";
import { isTextAddressed } from "../../../utils/isTextAddressed";
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

	const toggles = useTextFormatToggles();

	const formatButtons = [
		{
			id: "bold",
			isActive: toggles.bold.isActive,
			part: toggles.bold.part,
			label: messages.menuBold,
			icon: <BoldIcon title={messages.menuBold} />,
		},
		{
			id: "italic",
			isActive: toggles.italic.isActive,
			part: toggles.italic.part,
			label: messages.menuItalic,
			icon: <ItalicIcon title={messages.menuItalic} />,
		},
		{
			id: "underline",
			isActive: toggles.underline.isActive,
			part: toggles.underline.part,
			label: messages.menuUnderline,
			icon: <UnderlineIcon title={messages.menuUnderline} />,
		},
		{
			id: "strikethrough",
			isActive: toggles.strikethrough.isActive,
			part: toggles.strikethrough.part,
			label: messages.menuStrikethrough,
			icon: <StrikethroughIcon title={messages.menuStrikethrough} />,
		},
	];

	const renderFormatButton = (button: (typeof formatButtons)[number]) => (
		<ObjectMenuButton
			key={button.id}
			isActive={button.isActive}
			data-part={button.part}
			title={button.label}
		>
			{button.icon}
		</ObjectMenuButton>
	);

	if (isTextAddressed(canvasState)) {
		return <>{formatButtons.map(renderFormatButton)}</>;
	}

	return (
		<ObjectMenuItemPositioner ref={menuItemRef}>
			<ObjectMenuButton
				isActive={isOpen}
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
