import { memo } from "react";

import {
	Menu,
	MenuItem,
	MenuItemLabel,
	MenuItemShortcut,
	MenuSeparator,
} from "./ContextMenuStyled";
import type { CanvasControllerState } from "../../../CanvasTypes";
import { commandRegistry } from "../../../commands/CommandRegistry";
import type { PlatformKeyBindings } from "../../../commands/CommandTypes";
import {
	formatShortcut,
	getPlatformShortcuts,
} from "../../../commands/CommandUtils";

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

const ContextMenuComponent: React.FC<ContextMenuProps> = ({
	position,
	canvasState,
	callbacks,
}) => {
	if (!position) return null;

	const menuItems: CommandMenuItem[] = [
		{
			type: "callback",
			id: "paste",
			label: "Paste",
			shortcuts: {
				mac: [{ key: "v", meta: true }],
				default: [{ key: "v", ctrl: true }],
			},
		},
		{ type: "command", commandId: "copy" },
		{ type: "command", commandId: "cut" },
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
		<Menu left={position.clientX} top={position.clientY}>
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
								data-kind="context-menu-callback"
								data-id={item.id}
								onClick={enabled ? callbacks[item.id] : undefined}
								onPointerDown={(e) => e.stopPropagation()}
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
						const command = commandRegistry.get(item.commandId);
						if (!command) return null;

						const enabled = command.canExecute(canvasState);
						const shortcuts = command.shortcuts
							? getPlatformShortcuts(command.shortcuts)
							: null;
						const firstShortcut = shortcuts?.[0];

						return (
							<MenuItem
								key={command.id}
								disabled={!enabled}
								data-kind="context-menu"
								data-id={`context-menu:${command.id}`}
							>
								<MenuItemLabel>{command.label}</MenuItemLabel>
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

export const ContextMenu = memo(ContextMenuComponent);
