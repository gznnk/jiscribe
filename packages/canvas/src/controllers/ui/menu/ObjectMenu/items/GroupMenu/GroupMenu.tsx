import { memo } from "react";

import type { CanvasControllerState } from "../../../../../CanvasTypes";
import { useCommandState } from "../../../../../hooks/useCommandState";
import { getCommandLabel } from "../../../../../messages/CanvasMessages";
import { useCanvasMessages } from "../../../../../messages/CanvasMessagesContext";
import { GroupIcon } from "../../../../icons/GroupIcon";
import {
	ObjectMenuButton,
	ObjectMenuItemPositioner,
} from "../../ObjectMenuStyled";

type GroupMenuProps = {
	canvasState: CanvasControllerState;
};

const GroupMenuComponent: React.FC<GroupMenuProps> = ({ canvasState }) => {
	const messages = useCanvasMessages();
	const resolveCommand = useCommandState(canvasState);
	// Determine if the single selected item is a group (→ show ungroup)
	const singleSelected =
		canvasState.selectedIds.length === 1
			? canvasState.objects[canvasState.selectedIds[0]]
			: undefined;
	const isGroup = singleSelected?.type === "group";

	const commandId = isGroup ? "ungroup" : "group";
	const resolved = resolveCommand(commandId);
	if (!resolved) {
		return null;
	}

	const { command, enabled } = resolved;

	return (
		<ObjectMenuItemPositioner>
			<ObjectMenuButton
				isActive={isGroup}
				disabled={!enabled}
				data-kind="menu"
				data-id="object-menu"
				data-part={`command:${commandId}`}
			>
				<GroupIcon title={getCommandLabel(messages, command)} />
			</ObjectMenuButton>
		</ObjectMenuItemPositioner>
	);
};

export const GroupMenu = memo(GroupMenuComponent);
