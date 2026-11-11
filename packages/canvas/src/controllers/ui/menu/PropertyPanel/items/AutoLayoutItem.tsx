import { memo } from "react";

import type { BuiltinItemProps } from "./BuiltinItemProps";
import { useCanvasLocale } from "../../../../../foundation/i18n/CanvasLocaleContext";
import { useCanvasMessages } from "../../../../../foundation/i18n/CanvasMessagesContext";
import type { CanvasMessages } from "../../../../../foundation/i18n/CanvasMessagesTypes";
import { resolveCommandLabel } from "../../../../commands/CommandUtils";
import { commandAction } from "../../../../gestures/handlers/menu/utils/menuActions";
import { useCommandState } from "../../../../hooks/useCommandState";
import { ArrowDownIcon } from "../../../icons/ArrowDownIcon";
import { ArrowRightIcon } from "../../../icons/ArrowRightIcon";
import {
	PropertyCommandButton,
	PropertyCommandButtonContent,
	PropertyCommandGrid,
} from "../common/PropertyControlsStyled";
import { PropertyRow } from "../common/PropertyRow";

/** Edge in px of the arrow drawn before each button's text; both arrows share it. */
const ARROW_ICON_SIZE = 12;

/**
 * Each layout command with the arrow and the short text its button shows; the
 * tooltip is the command's label, then what the run moves.
 */
const AUTO_LAYOUT_BUTTONS: readonly {
	commandId: string;
	Icon: React.ComponentType<{ width?: number; height?: number }>;
	readText: (messages: CanvasMessages) => string;
}[] = [
	{
		commandId: "layoutTopToBottom",
		Icon: ArrowDownIcon,
		readText: (messages) => messages.propertyPanelAutoLayoutTopToBottom,
	},
	{
		commandId: "layoutLeftToRight",
		Icon: ArrowRightIcon,
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
				{AUTO_LAYOUT_BUTTONS.map(({ commandId, Icon, readText }) => {
					const resolved = resolveCommand(commandId);
					if (!resolved) {
						return null;
					}
					return (
						<PropertyCommandButton
							key={commandId}
							type="button"
							disabled={!resolved.enabled}
							title={`${resolveCommandLabel(resolved.command, messages, locale)}\n${messages.propertyPanelAutoLayoutTitle}`}
							data-action={commandAction(commandId)}
						>
							<PropertyCommandButtonContent>
								<Icon width={ARROW_ICON_SIZE} height={ARROW_ICON_SIZE} />
								<span>{readText(messages)}</span>
							</PropertyCommandButtonContent>
						</PropertyCommandButton>
					);
				})}
			</PropertyCommandGrid>
		</PropertyRow>
	);
};

export const AutoLayoutItem = memo(AutoLayoutItemComponent);
