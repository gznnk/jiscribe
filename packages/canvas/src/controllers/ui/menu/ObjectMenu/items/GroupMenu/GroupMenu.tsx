import { memo } from "react";

import { useCanvasLocale } from "../../../../../../foundation/i18n/CanvasLocaleContext";
import { useCanvasMessages } from "../../../../../../foundation/i18n/CanvasMessagesContext";
import type { CanvasControllerState } from "../../../../../CanvasTypes";
import { resolveCommandLabel } from "../../../../../commands/CommandUtils";
import { commandAction } from "../../../../../gestures/handlers/menu/utils/menuActions";
import { useCommandState } from "../../../../../hooks/useCommandState";
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
