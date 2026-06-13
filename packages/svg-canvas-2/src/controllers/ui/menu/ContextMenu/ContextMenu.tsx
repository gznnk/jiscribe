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
	const { left, top } = useContextMenuPosition(position, menuRef);

	const menuItems: CommandMenuItem[] = [
		{ type: "command", commandId: "cut" },
		{ type: "command", commandId: "copy" },
		{ type: "command", commandId: "duplicate" },
		{
			type: "callback",
			id: "paste",
			label: "Paste",
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
								data-kind="context-menu-callback"
								data-id={item.id}
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
						const command = commandRegistry.get(item.commandId);
						if (!command) {
							return null;
						}

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
