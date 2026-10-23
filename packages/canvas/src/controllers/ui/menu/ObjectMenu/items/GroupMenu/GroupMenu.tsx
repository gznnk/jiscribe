import { memo } from "react";

import type { CanvasControllerState } from "../../../../../CanvasTypes";
import { resolveCommandLabel } from "../../../../../commands/CommandUtils";
import { commandAction } from "../../../../../gestures/handlers/menu/utils/menuActions";
import { useCommandState } from "../../../../../hooks/useCommandState";
import { useCanvasLocale } from "../../../../../messages/CanvasLocaleContext";
import { useCanvasMessages } from "../../../../../messages/CanvasMessagesContext";
import { resolveGroupingCommandId } from "../../../../../utils/resolveGroupingCommandId";
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
	const locale = useCanvasLocale();
	const resolveCommand = useCommandState(canvasState);
	const commandId = resolveGroupingCommandId(canvasState);
	const resolved = resolveCommand(commandId);
	if (!resolved) {
		return null;
	}

	const { command, enabled } = resolved;

	return (
		<ObjectMenuItemPositioner>
			<ObjectMenuButton
				isActive={commandId === "ungroup"}
				disabled={!enabled}
				data-action={commandAction(commandId)}
			>
				<GroupIcon title={resolveCommandLabel(command, messages, locale)} />
			</ObjectMenuButton>
		</ObjectMenuItemPositioner>
	);
};

export const GroupMenu = memo(GroupMenuComponent);
