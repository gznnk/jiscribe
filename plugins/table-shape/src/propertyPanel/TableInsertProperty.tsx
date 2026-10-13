import type { PropertyPanelItemProps } from "@jiscribe/canvas";
import {
	commandAction,
	PropertyCommandButton,
	PropertyCommandGrid,
	resolveCommandLabel,
	TEXT_SLOT_PART_KIND,
	useCanvasLocale,
	useCanvasMessages,
} from "@jiscribe/canvas-sdk";
import { memo } from "react";

import { TABLE_INSERT_COMMANDS_BY_AXIS } from "../commands/tableInsertCommands";
import {
	TABLE_COLUMN_PART_KIND,
	TABLE_ROW_PART_KIND,
} from "../grid/tableTrack";
import type { TableAxis } from "../grid/tableTrack";

/**
 * The axes offered per picked part kind: a row names no column to insert beside
 * and a column no row (readTableTrackTarget), where a cell names both. Its keys
 * are the kinds the row is kept under while the sidebar narrows to a pick.
 */
const INSERT_AXES_BY_PICKED_PART_KIND: Readonly<
	Record<string, readonly TableAxis[]>
> = {
	[TABLE_ROW_PART_KIND]: ["row"],
	[TABLE_COLUMN_PART_KIND]: ["column"],
	[TEXT_SLOT_PART_KIND]: ["row", "column"],
};

/** The `pickedPartKinds` the Insert row declares, read off the table above. */
export const TABLE_INSERT_PICKED_PART_KINDS: readonly string[] = Object.keys(
	INSERT_AXES_BY_PICKED_PART_KIND,
);

/**
 * The Insert section's buttons, one per insertion the picked part names, labelled
 * with the command's own label and run through its `command:` action. Nothing is
 * drawn with no part picked: inserting is "next to this row / this cell", so the
 * table selected as a whole names nowhere to insert.
 */
const TableInsertPropertyComponent: React.FC<PropertyPanelItemProps> = ({
	selection,
}) => {
	const messages = useCanvasMessages();
	const locale = useCanvasLocale();
	const pickedPart = selection.part;
	if (pickedPart === null) {
		return null;
	}
	const axes = INSERT_AXES_BY_PICKED_PART_KIND[pickedPart.kind] ?? [];
	if (axes.length === 0) {
		return null;
	}

	return (
		<PropertyCommandGrid>
			{axes
				.flatMap((axis) => TABLE_INSERT_COMMANDS_BY_AXIS[axis])
				.map((command) => {
					const label = resolveCommandLabel(command, messages, locale);
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

export const TableInsertProperty = memo(TableInsertPropertyComponent);
