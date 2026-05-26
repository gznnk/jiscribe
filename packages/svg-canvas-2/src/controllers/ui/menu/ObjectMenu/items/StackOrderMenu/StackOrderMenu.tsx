import { memo, useRef } from "react";

import { StackOrderMenuRow } from "./StackOrderMenuStyled";
import type { CanvasControllerState } from "../../../../../CanvasTypes";
import { commandRegistry } from "../../../../../commands/CommandRegistry";
import { BringForwardIcon } from "../../../../icons/BringForwardIcon";
import { BringToFrontIcon } from "../../../../icons/BringToFrontIcon";
import { SendBackwardIcon } from "../../../../icons/SendBackwardIcon";
import { SendToBackIcon } from "../../../../icons/SendToBackIcon";
import { StackOrderIcon } from "../../../../icons/StackOrderIcon";
import { useSubmenuPosition } from "../../hooks/useSubmenuPosition";
import {
	ObjectMenuButton,
	DropdownPanel,
	MenuItemPositioner,
} from "../../ObjectMenuStyled";

const SECTION_ID = "stack-order";
const SUBMENU_SIZE = { width: 180, height: 40 } as const;

type StackOrderMenuProps = {
	canvasState: CanvasControllerState;
};

const arrangeCommands = [
	{ commandId: "bringToFront", Icon: BringToFrontIcon },
	{ commandId: "bringForward", Icon: BringForwardIcon },
	{ commandId: "sendBackward", Icon: SendBackwardIcon },
	{ commandId: "sendToBack", Icon: SendToBackIcon },
] as const;

const StackOrderMenuComponent: React.FC<StackOrderMenuProps> = ({
	canvasState,
}) => {
	const menuItemRef = useRef<HTMLDivElement>(null);
	const isOpen = canvasState.objectMenuOpenId === SECTION_ID;
	const { placement } = useSubmenuPosition(menuItemRef, SUBMENU_SIZE, isOpen);

	return (
		<MenuItemPositioner ref={menuItemRef}>
			<ObjectMenuButton
				isActive={isOpen}
				data-kind="object-menu"
				data-id={`object-menu:toggle:${SECTION_ID}`}
			>
				<StackOrderIcon />
			</ObjectMenuButton>
			{isOpen && (
				<DropdownPanel placement={placement}>
					<StackOrderMenuRow>
						{arrangeCommands.map(({ commandId, Icon }) => {
							const command = commandRegistry.get(commandId);
							if (!command) {
								return null;
							}
							const enabled = command.canExecute(canvasState);
							return (
								<ObjectMenuButton
									key={commandId}
									disabled={!enabled}
									data-kind="object-menu"
									data-id={`object-menu:command:${commandId}`}
								>
									<Icon
										fill={enabled ? "#333333" : "#cccccc"}
										title={command.label}
									/>
								</ObjectMenuButton>
							);
						})}
					</StackOrderMenuRow>
				</DropdownPanel>
			)}
		</MenuItemPositioner>
	);
};

export const StackOrderMenu = memo(StackOrderMenuComponent);
