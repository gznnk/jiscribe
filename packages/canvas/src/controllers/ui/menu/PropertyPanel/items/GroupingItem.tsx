import { memo } from "react";

import type { BuiltinItemProps } from "./BuiltinItemProps";
import { useCanvasLocale } from "../../../../../foundation/i18n/CanvasLocaleContext";
import { useCanvasMessages } from "../../../../../foundation/i18n/CanvasMessagesContext";
import { resolveCommandLabel } from "../../../../commands/CommandUtils";
import { commandAction } from "../../../../gestures/handlers/menu/utils/menuActions";
import { useCommandState } from "../../../../hooks/useCommandState";
import { resolveGroupingCommandId } from "../../../../utils/resolveGroupingCommandId";
import { PropertyCommandButton } from "../common/PropertyControlsStyled";

/**
 * The sidebar twin of the ObjectMenu's GroupMenu: one named button running
 * `ungroup` for a sole selected group and `group` for anything else
 * (resolveGroupingCommandId). Disabled while the command cannot run on the
 * selection, a selection of connectors alone among them.
 */
const GroupingItemComponent: React.FC<
	Pick<BuiltinItemProps, "canvasState">
> = ({ canvasState }) => {
	const messages = useCanvasMessages();
	const locale = useCanvasLocale();
	const resolveCommand = useCommandState(canvasState);
	const commandId = resolveGroupingCommandId(canvasState);
	const resolved = resolveCommand(commandId);
	if (!resolved) {
		return null;
	}
	const label = resolveCommandLabel(resolved.command, messages, locale);

	return (
		<PropertyCommandButton
			type="button"
			disabled={!resolved.enabled}
			title={label}
			data-action={commandAction(commandId)}
		>
			{label}
		</PropertyCommandButton>
	);
};

export const GroupingItem = memo(GroupingItemComponent);
