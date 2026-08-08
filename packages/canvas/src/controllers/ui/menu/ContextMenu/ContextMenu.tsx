import { memo, useRef } from "react";

import {
	Menu,
	MenuItem,
	MenuItemLabel,
	MenuItemShortcut,
	MenuSeparator,
} from "./ContextMenuStyled";
import { useContextMenuPosition } from "./useContextMenuPosition";
import type { CanvasControllerState } from "../../../CanvasTypes";
import {
	formatShortcut,
	getPlatformShortcuts,
} from "../../../commands/CommandUtils";
import { useCommandState } from "../../../hooks/useCommandState";
import { getCommandLabel } from "../../../messages/CanvasMessages";
import { useCanvasMessages } from "../../../messages/CanvasMessagesContext";

/**
 * Both kinds resolve label / shortcut / enabled from the command registry;
 * they differ only in execution wiring: "command" dispatches via the gesture
 * system (data-part), "callback" invokes callbacks[commandId] directly
 * (definition-only commands such as paste / export).
 */
type CommandMenuItem =
	| { type: "command"; commandId: string }
	| { type: "callback"; commandId: string }
	| { type: "separator" };

type ContextMenuProps = {
	position: { clientX: number; clientY: number } | null;
	canvasState: CanvasControllerState;
	callbacks: Record<string, () => void>;
};

type ContextMenuBodyProps = {
	position: { clientX: number; clientY: number };
	canvasState: CanvasControllerState;
	callbacks: Record<string, () => void>;
};

const ContextMenuBody: React.FC<ContextMenuBodyProps> = ({
	position,
	canvasState,
	callbacks,
}) => {
	const menuRef = useRef<HTMLDivElement>(null);
	const messages = useCanvasMessages();
	const resolveCommand = useCommandState(canvasState);
	const { left, top } = useContextMenuPosition(position, menuRef);

	const menuItems: CommandMenuItem[] = [
		{ type: "command", commandId: "cut" },
		{ type: "command", commandId: "copy" },
		{ type: "command", commandId: "duplicate" },
		{ type: "callback", commandId: "paste" },
		{ type: "command", commandId: "delete" },
		{ type: "separator" },
		{ type: "command", commandId: "selectAll" },
		{ type: "command", commandId: "deselectAll" },
		{ type: "separator" },
		{ type: "command", commandId: "bringToFront" },
		{ type: "command", commandId: "bringForward" },
		{ type: "command", commandId: "sendBackward" },
		{ type: "command", commandId: "sendToBack" },
		{ type: "separator" },
		{ type: "command", commandId: "group" },
		{ type: "command", commandId: "ungroup" },
		{ type: "separator" },
		{ type: "command", commandId: "resetConnectorRoute" },
		{ type: "separator" },
		{ type: "callback", commandId: "export" },
	];

	return (
		<Menu ref={menuRef} left={left} top={top}>
			{menuItems.map((item, index) => {
				if (item.type === "separator") {
					return <MenuSeparator key={`sep-${index}`} />;
				}

				const resolved = resolveCommand(item.commandId);
				if (!resolved) {
					return null;
				}

				const { command, enabled } = resolved;
				const shortcuts = command.shortcuts
					? getPlatformShortcuts(command.shortcuts)
					: null;
				const firstShortcut = shortcuts?.[0];

				// Execution wiring is the only difference between the two kinds.
				const executionProps =
					item.type === "callback"
						? {
								"data-testid": `context-menu-callback:${command.id}`,
								"data-gesture": "none",
								onClick: enabled ? callbacks[command.id] : undefined,
							}
						: {
								"data-kind": "menu",
								"data-id": "context-menu",
								"data-part": `command:${command.id}`,
							};

				return (
					<MenuItem key={command.id} disabled={!enabled} {...executionProps}>
						<MenuItemLabel>{getCommandLabel(messages, command)}</MenuItemLabel>
						{firstShortcut && (
							<MenuItemShortcut>
								{formatShortcut(firstShortcut)}
							</MenuItemShortcut>
						)}
					</MenuItem>
				);
			})}
		</Menu>
	);
};

const ContextMenuComponent: React.FC<ContextMenuProps> = ({
	position,
	canvasState,
	callbacks,
}) => {
	if (!position) {
		return null;
	}

	return (
		<ContextMenuBody
			position={position}
			canvasState={canvasState}
			callbacks={callbacks}
		/>
	);
};

export const ContextMenu = memo(ContextMenuComponent);
