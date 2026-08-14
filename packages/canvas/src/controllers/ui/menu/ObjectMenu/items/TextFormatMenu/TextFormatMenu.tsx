import { memo, useRef } from "react";

import { TextFormatMenuContent } from "./TextFormatMenuStyled";
import type { CanvasControllerState } from "../../../../../../controllers/CanvasTypes";
import { useCanvasMessages } from "../../../../../messages/CanvasMessagesContext";
import { useCanvasRegistries } from "../../../../../registries/CanvasRegistriesContext";
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
	const isBold = slot?.fontWeight === "bold";
	const isItalic = slot?.fontStyle === "italic";
	const isUnderline = hasTextDecorationToken(slot?.textDecoration, "underline");
	const isStrikethrough = hasTextDecorationToken(
		slot?.textDecoration,
		"line-through",
	);

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
						<ObjectMenuButton
							isActive={isBold}
							data-kind="menu"
							data-id="object-menu"
							data-part={`set:fontWeight:${isBold ? "normal" : "bold"}`}
							title={messages.menuBold}
						>
							<BoldIcon title={messages.menuBold} />
						</ObjectMenuButton>
						<ObjectMenuButton
							isActive={isItalic}
							data-kind="menu"
							data-id="object-menu"
							data-part={`set:fontStyle:${isItalic ? "normal" : "italic"}`}
							title={messages.menuItalic}
						>
							<ItalicIcon title={messages.menuItalic} />
						</ObjectMenuButton>
						<ObjectMenuButton
							isActive={isUnderline}
							data-kind="menu"
							data-id="object-menu"
							data-part={`set:textDecoration:${toggleTextDecorationToken(
								slot?.textDecoration,
								"underline",
							)}`}
							title={messages.menuUnderline}
						>
							<UnderlineIcon title={messages.menuUnderline} />
						</ObjectMenuButton>
						<ObjectMenuButton
							isActive={isStrikethrough}
							data-kind="menu"
							data-id="object-menu"
							data-part={`set:textDecoration:${toggleTextDecorationToken(
								slot?.textDecoration,
								"line-through",
							)}`}
							title={messages.menuStrikethrough}
						>
							<StrikethroughIcon title={messages.menuStrikethrough} />
						</ObjectMenuButton>
					</TextFormatMenuContent>
				</ObjectMenuDropdownPanel>
			)}
		</ObjectMenuItemPositioner>
	);
};

export const TextFormatMenu = memo(TextFormatMenuComponent);
