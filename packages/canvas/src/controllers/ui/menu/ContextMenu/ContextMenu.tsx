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
import type { PlatformKeyBindings } from "../../../commands/CommandTypes";
import {
	formatShortcut,
	getPlatformShortcuts,
} from "../../../commands/CommandUtils";
import { useCommandState } from "../../../hooks/useCommandState";
import { getCommandLabel } from "../../../messages/CanvasMessages";
import { useCanvasMessages } from "../../../messages/CanvasMessagesContext";

type CommandMenuItem =
	| { type: "command"; commandId: string }
	| {
			type: "callback";
			id: string;
			label: string;
			shortcuts?: PlatformKeyBindings;
			enabled?: boolean;
	  }
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
		{
			type: "callback",
			id: "paste",
			label: messages.contextMenuPaste,
			shortcuts: {
				mac: [{ code: "KeyV", meta: true }],
				default: [{ code: "KeyV", ctrl: true }],
			},
		},
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
	];

	return (
		<Menu ref={menuRef} left={left} top={top}>
			{menuItems.map((item, index) => {
				switch (item.type) {
					case "separator": {
						return <MenuSeparator key={`sep-${index}`} />;
					}

					case "callback": {
						const shortcuts = item.shortcuts
							? getPlatformShortcuts(item.shortcuts)
							: null;
						const firstShortcut = shortcuts?.[0];
						const enabled = item.enabled !== false;

						return (
							<MenuItem
								key={item.id}
								disabled={!enabled}
								data-testid={`context-menu-callback:${item.id}`}
								data-gesture="none"
								onClick={enabled ? callbacks[item.id] : undefined}
							>
								<MenuItemLabel>{item.label}</MenuItemLabel>
								{firstShortcut && (
									<MenuItemShortcut>
										{formatShortcut(firstShortcut)}
									</MenuItemShortcut>
								)}
							</MenuItem>
						);
					}

					case "command": {
						const resolved = resolveCommand(item.commandId);
						if (!resolved) {
							return null;
						}

						const { command, enabled } = resolved;
						const shortcuts = command.shortcuts
							? getPlatformShortcuts(command.shortcuts)
							: null;
						const firstShortcut = shortcuts?.[0];

						return (
							<MenuItem
								key={command.id}
								disabled={!enabled}
								data-kind="menu"
								data-id="context-menu"
								data-part={`command:${command.id}`}
							>
								<MenuItemLabel>
									{getCommandLabel(messages, command)}
								</MenuItemLabel>
								{firstShortcut && (
									<MenuItemShortcut>
										{formatShortcut(firstShortcut)}
									</MenuItemShortcut>
								)}
							</MenuItem>
						);
					}
				}
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
