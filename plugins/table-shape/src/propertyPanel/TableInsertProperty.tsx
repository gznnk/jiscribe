import type { PropertyPanelItemProps } from "@jiscribe/canvas";
import {
	commandAction,
	PropertyCommandButton,
	PropertyCommandGrid,
	resolveCommandLabel,
	useCanvasLocale,
	useCanvasMessages,
} from "@jiscribe/canvas-sdk";
import { memo } from "react";

import {
	TABLE_INSERT_AXES_BY_PICKED_PART_KIND,
	TABLE_INSERT_COMMANDS_BY_AXIS,
} from "../commands/tableInsertCommands";

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
	const axes = TABLE_INSERT_AXES_BY_PICKED_PART_KIND[pickedPart.kind] ?? [];
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
