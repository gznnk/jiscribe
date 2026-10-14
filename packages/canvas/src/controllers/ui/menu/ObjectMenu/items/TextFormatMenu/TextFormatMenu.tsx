import { memo } from "react";

import { useCanvasMessages } from "../../../../../messages/CanvasMessagesContext";
import { BoldIcon } from "../../../../icons/BoldIcon";
import { useTextFormatToggles } from "../../../hooks/useTextFormatToggles";
import { ObjectMenuButton } from "../../ObjectMenuStyled";

/**
 * Text format menu: a single Bold toggle laid out on the menu itself, whether
 * the whole object or a picked part is selected. Italic, underline and
 * strikethrough live in the properties sidebar (TextFormatItem) and the text
 * editor's keystrokes, not here.
 * The button writes the value the press should land on rather than a toggle
 * command (see useTextFormatToggles).
 */
const TextFormatMenuComponent: React.FC = () => {
	const messages = useCanvasMessages();
	const { bold } = useTextFormatToggles();

	return (
		<ObjectMenuButton
			isActive={bold.isActive}
			data-action={bold.action}
			title={messages.menuBold}
		>
			<BoldIcon title={messages.menuBold} />
		</ObjectMenuButton>
	);
};

export const TextFormatMenu = memo(TextFormatMenuComponent);
