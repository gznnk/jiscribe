import { memo } from "react";

import type { BuiltinItemProps } from "./BuiltinItemProps";
import { useCanvasLocale } from "../../../../../foundation/i18n/CanvasLocaleContext";
import { useCanvasMessages } from "../../../../../foundation/i18n/CanvasMessagesContext";
import type { CanvasMessages } from "../../../../../foundation/i18n/CanvasMessagesTypes";
import { resolveCommandLabel } from "../../../../commands/CommandUtils";
import { commandAction } from "../../../../gestures/handlers/menu/utils/menuActions";
import { useCommandState } from "../../../../hooks/useCommandState";
import {
	PropertyCommandButton,
	PropertyCommandGrid,
} from "../common/PropertyControlsStyled";
import { PropertyRow } from "../common/PropertyRow";

/** Each layout command with the short text its button shows; the command's label is the tooltip. */
const AUTO_LAYOUT_BUTTONS: readonly {
	commandId: string;
	readText: (messages: CanvasMessages) => string;
}[] = [
	{
		commandId: "layoutTopToBottom",
		readText: (messages) => messages.propertyPanelAutoLayoutTopToBottom,
	},
	{
		commandId: "layoutLeftToRight",
		readText: (messages) => messages.propertyPanelAutoLayoutLeftToRight,
	},
];

/**
 * The automatic layout commands as two buttons, one per direction. Each is
 * disabled while there is nothing to arrange rather than hidden, so the row keeps
 * its shape.
 */
const AutoLayoutItemComponent: React.FC<
	Pick<BuiltinItemProps, "canvasState">
> = ({ canvasState }) => {
	const messages = useCanvasMessages();
	const locale = useCanvasLocale();
	const resolveCommand = useCommandState(canvasState);

	return (
		<PropertyRow label={messages.propertyPanelAutoLayout}>
			<PropertyCommandGrid>
				{AUTO_LAYOUT_BUTTONS.map(({ commandId, readText }) => {
					const resolved = resolveCommand(commandId);
					if (!resolved) {
						return null;
					}
					return (
						<PropertyCommandButton
							key={commandId}
							type="button"
							disabled={!resolved.enabled}
							title={resolveCommandLabel(resolved.command, messages, locale)}
							data-action={commandAction(commandId)}
						>
							{readText(messages)}
						</PropertyCommandButton>
					);
				})}
			</PropertyCommandGrid>
		</PropertyRow>
	);
};

export const AutoLayoutItem = memo(AutoLayoutItemComponent);
