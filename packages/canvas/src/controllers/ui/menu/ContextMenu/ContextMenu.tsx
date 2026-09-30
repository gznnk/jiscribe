import { memo, useRef } from "react";

import {
	Menu,
	MenuItem,
	MenuItemLabel,
	MenuItemShortcut,
	MenuSeparator,
} from "./ContextMenuStyled";
import { useContextMenuPosition } from "./useContextMenuPosition";
import { resolveContextMenuItems } from "./utils/resolveContextMenuItems";
import type { CanvasControllerState } from "../../../CanvasTypes";
import {
	formatShortcut,
	getPlatformShortcuts,
} from "../../../commands/CommandUtils";
import { commandPart } from "../../../gestures/handlers/menu/utils/menuParts";
import { useCommandState } from "../../../hooks/useCommandState";
import { useCanvasLocale } from "../../../messages/CanvasLocaleContext";
import { resolveCommandLabel } from "../../../messages/CanvasMessages";
import { useCanvasMessages } from "../../../messages/CanvasMessagesContext";
import { useCanvasRegistries } from "../../../registries/CanvasRegistriesContext";

/** Where the menu was opened, and over what: the state slice it is driven by. */
type ContextMenuPosition = NonNullable<
	CanvasControllerState["contextMenuPosition"]
>;

type ContextMenuProps = {
	position: ContextMenuPosition | null;
	canvasState: CanvasControllerState;
	callbacks: Record<string, () => void>;
};

type ContextMenuBodyProps = {
	position: ContextMenuPosition;
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
	const locale = useCanvasLocale();
	const registries = useCanvasRegistries();
	const resolveCommand = useCommandState(canvasState);
	const { left, top } = useContextMenuPosition(position, menuRef);

	const menuItems = resolveContextMenuItems(
		position.target,
		canvasState.objects,
		registries.contextMenu,
	);

	return (
		<Menu ref={menuRef} left={left} top={top}>
			{menuItems.map((item, index) => {
				if (item.type === "separator") {
					return <MenuSeparator key={`sep-${index}`} />;
				}

				// An unregistered id draws no row at all, rather than a dead one:
				// a command switched off by `CanvasConfig.commands`, and a
				// contributed item naming a command its plugin never registered,
				// both land here.
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
								"data-part": commandPart(command.id),
							};

				return (
					// Keyed by position as well as id: a contribution may name a
					// command the built-in block already carries.
					<MenuItem
						key={`${index}:${command.id}`}
						disabled={!enabled}
						{...executionProps}
					>
						<MenuItemLabel>
							{resolveCommandLabel(command, messages, locale)}
						</MenuItemLabel>
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
