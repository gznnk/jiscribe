import { memo } from "react";

import {
	Menu,
	MenuItem,
	MenuItemLabel,
	MenuItemShortcut,
	MenuSeparator,
} from "./ContextMenuStyled";
import type { CanvasState } from "../../../../states/canvas/CanvasState";
import { commandRegistry } from "../../../commands/CommandRegistry";
import type {
	CommandMenuItem,
	KeyBinding,
} from "../../../commands/CommandTypes";

type ContextMenuProps = {
	position: { clientX: number; clientY: number } | null;
	canvasState: CanvasState;
};

/**
 * キーバインディングを表示用文字列に変換
 */
const formatKeyBinding = (binding: KeyBinding): string => {
	const parts: string[] = [];

	if (binding.ctrl) parts.push("Ctrl");
	if (binding.meta) parts.push("Cmd");
	if (binding.shift) parts.push("Shift");
	if (binding.alt) parts.push("Alt");

	// キー名を大文字に
	const key =
		binding.key.length === 1 ? binding.key.toUpperCase() : binding.key;
	parts.push(key);

	return parts.join("+");
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
				const shortcut = command.shortcuts?.[0];

				return (
					<MenuItem
						key={command.id}
						disabled={!enabled}
						data-kind="context-menu"
						data-id={`context-menu:${command.id}`}
					>
						<MenuItemLabel>{command.label}</MenuItemLabel>
						{shortcut && (
							<MenuItemShortcut>{formatKeyBinding(shortcut)}</MenuItemShortcut>
						)}
					</MenuItem>
				);
			})}
		</Menu>
	);
};

export const ContextMenu = memo(ContextMenuComponent);
