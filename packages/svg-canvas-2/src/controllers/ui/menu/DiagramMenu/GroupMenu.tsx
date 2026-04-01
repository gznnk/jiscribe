import { memo } from "react";

import { DiagramMenuButton, MenuItemPositioner } from "./DiagramMenuStyled";
import type { CanvasState } from "../../../../states/canvas/CanvasState";
import { commandRegistry } from "../../../commands/CommandRegistry";
import { GroupIcon } from "../../icons/GroupIcon";

type GroupMenuProps = {
	canvasState: CanvasState;
};

const GroupMenuComponent: React.FC<GroupMenuProps> = ({ canvasState }) => {
	// Determine if the single selected item is a group (→ show ungroup)
	const singleSelected =
		canvasState.selectedIds.length === 1
			? canvasState.objects[canvasState.selectedIds[0]]
			: undefined;
	const isGroup = singleSelected?.type === "group";

	const commandId = isGroup ? "ungroup" : "group";
	const command = commandRegistry.get(commandId);
	if (!command) return null;

	const enabled = command.canExecute(canvasState);

	return (
		<MenuItemPositioner>
			<DiagramMenuButton
				isActive={isGroup}
				disabled={!enabled}
				data-kind="diagram-menu"
				data-id={`diagram-menu:${commandId}`}
			>
				<GroupIcon
					fill={enabled ? "#333333" : "#cccccc"}
					title={command.label}
				/>
			</DiagramMenuButton>
		</MenuItemPositioner>
	);
};

export const GroupMenu = memo(GroupMenuComponent);
