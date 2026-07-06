import { memo } from "react";

import type { CanvasControllerState } from "../../../../../CanvasTypes";
import { commandRegistry } from "../../../../../commands/CommandRegistry";
import { GroupIcon } from "../../../../icons/GroupIcon";
import { ObjectMenuButton, MenuItemPositioner } from "../../ObjectMenuStyled";

type GroupMenuProps = {
	canvasState: CanvasControllerState;
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
	if (!command) {
		return null;
	}

	const enabled = command.canExecute(canvasState);

	return (
		<MenuItemPositioner>
			<ObjectMenuButton
				isActive={isGroup}
				disabled={!enabled}
				data-kind="menu"
				data-id="object-menu"
				data-part={`command:${commandId}`}
			>
				<GroupIcon title={command.label} />
			</ObjectMenuButton>
		</MenuItemPositioner>
	);
};

export const GroupMenu = memo(GroupMenuComponent);
