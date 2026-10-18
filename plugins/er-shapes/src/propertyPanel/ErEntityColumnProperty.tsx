import type { PropertyPanelItemProps } from "@jiscribe/canvas";
import {
	commandAction,
	PropertyCommandButton,
	PropertyCommandGrid,
	resolveLocaleMessages,
	useCanvasLocale,
} from "@jiscribe/canvas-sdk";
import { memo } from "react";

import {
	ER_ENTITY_INSERT_BUTTON_LABELS,
	readOfferedErEntityInsertCommands,
} from "../menu/readOfferedErEntityInsertCommands";

/**
 * The sidebar's column section: the same insertions the menu offers
 * (readOfferedErEntityInsertCommands), as labelled buttons run through their
 * `command:` action. No delete button, as in the menu.
 */
const ErEntityColumnPropertyComponent: React.FC<PropertyPanelItemProps> = ({
	selection,
}) => {
	const locale = useCanvasLocale();
	const commands = readOfferedErEntityInsertCommands(selection);
	if (commands.length === 0) {
		return null;
	}

	return (
		<PropertyCommandGrid>
			{commands.map((command) => {
				const label = resolveLocaleMessages(
					ER_ENTITY_INSERT_BUTTON_LABELS[command.id],
					locale,
				);
				return (
					<PropertyCommandButton
						key={command.id}
						type="button"
						title={label}
						data-action={commandAction(command.id)}
					>
						{label}
					</PropertyCommandButton>
				);
			})}
		</PropertyCommandGrid>
	);
};

export const ErEntityColumnProperty = memo(ErEntityColumnPropertyComponent);
