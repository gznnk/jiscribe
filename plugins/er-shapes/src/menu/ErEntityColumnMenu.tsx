import type { ObjectMenuItemProps } from "@jiscribe/canvas";
import {
	commandAction,
	formatShortcut,
	getPlatformShortcuts,
	ObjectMenuButton,
	ObjectMenuItemPositioner,
	resolveLocaleMessages,
	useCanvasLocale,
} from "@jiscribe/canvas-sdk";
import { memo } from "react";

import { ErEntityColumnMenuGroup } from "./ErEntityColumnMenuStyled";
import { ErEntityInsertAboveIcon } from "./ErEntityInsertAboveIcon";
import { ErEntityInsertBelowIcon } from "./ErEntityInsertBelowIcon";
import {
	ER_ENTITY_INSERT_BUTTON_LABELS,
	readOfferedErEntityInsertCommands,
} from "./readOfferedErEntityInsertCommands";
import type {
	ErEntityInsertCommand,
	ErEntityInsertCommandId,
} from "../commands/erEntityColumnCommands";

/**
 * The icon each insertion's button wears: the entity drawn with a `+` where the
 * column appears. Appending shares the below icon: the two are never offered
 * together (readOfferedErEntityInsertCommands), and drawn apart they differ by a
 * row no eye picks out at 24px.
 */
const ER_ENTITY_INSERT_ICONS: Readonly<
	Record<ErEntityInsertCommandId, React.ComponentType<{ title: string }>>
> = {
	"erEntity.insertColumnAbove": ErEntityInsertAboveIcon,
	"erEntity.insertColumnBelow": ErEntityInsertBelowIcon,
	"erEntity.appendColumn": ErEntityInsertBelowIcon,
};

/** The label, followed by the key the command answers to on this platform when it has one. */
const formatInsertTooltip = (
	command: ErEntityInsertCommand,
	label: string,
): string => {
	const binding = command.shortcuts
		? getPlatformShortcuts(command.shortcuts)[0]
		: undefined;
	return binding === undefined
		? label
		: `${label} (${formatShortcut(binding)})`;
};

/**
 * The menu's column section: "Add Above" / "Add Below" with a column or a column
 * slot picked, "Add at Bottom" with the entity selected as a whole
 * (readOfferedErEntityInsertCommands), each run through its `command:` action.
 * There is no delete button: a column is removed by Delete over its grip. With
 * nothing to offer it draws nothing, so the section collapses with its divider.
 */
const ErEntityColumnMenuComponent: React.FC<ObjectMenuItemProps> = ({
	selection,
}) => {
	const locale = useCanvasLocale();
	const commands = readOfferedErEntityInsertCommands(selection);
	if (commands.length === 0) {
		return null;
	}

	return (
		<ErEntityColumnMenuGroup>
			{commands.map((command) => {
				const label = resolveLocaleMessages(
					ER_ENTITY_INSERT_BUTTON_LABELS[command.id],
					locale,
				);
				const tooltip = formatInsertTooltip(command, label);
				const Icon = ER_ENTITY_INSERT_ICONS[command.id];
				return (
					<ObjectMenuItemPositioner key={command.id}>
						<ObjectMenuButton
							type="button"
							aria-label={label}
							title={tooltip}
							data-action={commandAction(command.id)}
						>
							<Icon title={tooltip} />
						</ObjectMenuButton>
					</ObjectMenuItemPositioner>
				);
			})}
		</ErEntityColumnMenuGroup>
	);
};

export const ErEntityColumnMenu = memo(ErEntityColumnMenuComponent);
