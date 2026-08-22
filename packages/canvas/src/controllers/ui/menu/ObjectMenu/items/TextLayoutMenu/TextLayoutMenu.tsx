import { memo } from "react";

import type { CanvasControllerState } from "../../../../../CanvasTypes";
import { isSelectionTextBlock } from "../../../../../commands/shape/ToggleTextLayoutCommand";
import { useCanvasMessages } from "../../../../../messages/CanvasMessagesContext";
import { TextWrapIcon } from "../../../../icons/TextWrapIcon";
import {
	ObjectMenuButton,
	ObjectMenuItemPositioner,
} from "../../ObjectMenuStyled";

type TextLayoutMenuProps = {
	canvasState: CanvasControllerState;
};

/**
 * Switches the selected texts between a width measured from the text and one the
 * text wraps in. No dropdown — the press toggles it, the way the auto-height
 * switch does.
 *
 * Offered by the `text` type alone, through the section it declares: a selection
 * mixing a text with any other shape drops the section entirely, the menu
 * keeping only the sections every selected type registers (useMenuSections).
 *
 * Lit when every text in the selection already wraps in a width of its own, so a
 * selection with one measured text in it reads as off and one press brings the
 * whole selection to the block layout (see `isSelectionTextBlock`).
 */
const TextLayoutMenuComponent: React.FC<TextLayoutMenuProps> = ({
	canvasState,
}) => {
	const messages = useCanvasMessages();
	const isBlock = isSelectionTextBlock(canvasState);
	const title = isBlock
		? messages.menuFitWidthToText
		: messages.menuWrapTextInWidth;

	return (
		<ObjectMenuItemPositioner>
			<ObjectMenuButton
				isActive={isBlock}
				data-kind="menu"
				data-id="object-menu"
				data-part="command:toggleTextLayout"
				title={title}
			>
				<TextWrapIcon title={title} />
			</ObjectMenuButton>
		</ObjectMenuItemPositioner>
	);
};

export const TextLayoutMenu = memo(TextLayoutMenuComponent);
