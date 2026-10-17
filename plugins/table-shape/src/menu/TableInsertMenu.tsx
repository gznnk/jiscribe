import type { ObjectMenuItemProps } from "@jiscribe/canvas";
import {
	commandAction,
	formatShortcut,
	getPlatformShortcuts,
	ObjectMenuButton,
	ObjectMenuItemPositioner,
	resolveCommandLabel,
	useCanvasLocale,
	useCanvasMessages,
} from "@jiscribe/canvas-sdk";
import { memo } from "react";

import { TableInsertColumnLeftIcon } from "./TableInsertColumnLeftIcon";
import { TableInsertColumnRightIcon } from "./TableInsertColumnRightIcon";
import {
	TableInsertMenuAxisGroup,
	TableInsertMenuAxisGroups,
} from "./TableInsertMenuStyled";
import { TableInsertRowAboveIcon } from "./TableInsertRowAboveIcon";
import { TableInsertRowBelowIcon } from "./TableInsertRowBelowIcon";
import {
	TABLE_INSERT_AXES_BY_PICKED_PART_KIND,
	TABLE_INSERT_COMMANDS_BY_AXIS,
} from "../commands/tableInsertCommands";
import type {
	TableInsertCommand,
	TableInsertCommandId,
} from "../commands/tableInsertCommands";

/** The icon each insertion's button wears: the band the new track forms, with a `+` on the side it appears. */
const TABLE_INSERT_ICONS: Readonly<
	Record<TableInsertCommandId, React.ComponentType<{ title: string }>>
> = {
	"table.insertRowAbove": TableInsertRowAboveIcon,
	"table.insertRowBelow": TableInsertRowBelowIcon,
	"table.insertColumnLeft": TableInsertColumnLeftIcon,
	"table.insertColumnRight": TableInsertColumnRightIcon,
};

/** The label, followed by the key it answers to on this platform when it has one. */
const formatTableInsertTooltip = (
	command: TableInsertCommand,
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
 * The menu's Insert buttons, one group per axis the picked part names — a row's
 * pair, a column's, or both for a cell — each run through its `command:` action.
 * Nothing is drawn with no part picked, so the section collapses with its
 * divider: the table selected as a whole names nowhere to insert next to.
 */
const TableInsertMenuComponent: React.FC<ObjectMenuItemProps> = ({
	selection,
}) => {
	const messages = useCanvasMessages();
	const locale = useCanvasLocale();
	const pickedPart = selection.part;
	if (pickedPart === null) {
		return null;
	}
	const axes = TABLE_INSERT_AXES_BY_PICKED_PART_KIND[pickedPart.kind] ?? [];
	if (axes.length === 0) {
		return null;
	}

	return (
		<TableInsertMenuAxisGroups>
			{axes.map((axis) => (
				<TableInsertMenuAxisGroup key={axis}>
					{TABLE_INSERT_COMMANDS_BY_AXIS[axis].map((command) => {
						const label = resolveCommandLabel(command, messages, locale);
						const tooltip = formatTableInsertTooltip(command, label);
						const Icon = TABLE_INSERT_ICONS[command.id];
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
				</TableInsertMenuAxisGroup>
			))}
		</TableInsertMenuAxisGroups>
	);
};

export const TableInsertMenu = memo(TableInsertMenuComponent);
