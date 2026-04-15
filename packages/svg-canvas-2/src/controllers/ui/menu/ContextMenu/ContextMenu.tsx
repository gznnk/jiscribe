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
import type { CommandMenuItem } from "../../../commands/CommandTypes";
import {
	formatShortcut,
	getPlatformShortcuts,
} from "../../../commands/CommandUtils";

type ContextMenuProps = {
	position: { clientX: number; clientY: number } | null;
	canvasState: CanvasControllerState;
};

const ContextMenuComponent: React.FC<ContextMenuProps> = ({
	position,
	canvasState,
}) => {
	// position が null なら何も表示しない
	if (!position) return null;

	// メニュー構成を定義
	const menuItems: CommandMenuItem[] = [
		{ commandId: "delete" },
		{ separator: true },
		{ commandId: "selectAll" },
		{ commandId: "deselectAll" },
		{ separator: true },
		{ commandId: "bringToFront" },
		{ commandId: "bringForward" },
		{ commandId: "sendBackward" },
		{ commandId: "sendToBack" },
		{ separator: true },
		{ commandId: "group" },
		{ commandId: "ungroup" },
	];

	return (
		<Menu left={position.clientX} top={position.clientY}>
			{menuItems.map((item, index) => {
				if (item.separator) {
					return <MenuSeparator key={`sep-${index}`} />;
				}

				if (!item.commandId) return null;

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
			})}
		</Menu>
	);
};

export const ContextMenu = memo(ContextMenuComponent);
