import { memo } from "react";

import {
	DiagramMenuButton,
	DropdownPanel,
	MenuItemPositioner,
} from "./DiagramMenuStyled";
import type { CanvasState } from "../../../../states/canvas/CanvasState";
import { commandRegistry } from "../../../commands/CommandRegistry";
import { BringForwardIcon } from "../../icons/BringForwardIcon";
import { BringToFrontIcon } from "../../icons/BringToFrontIcon";
import { SendBackwardIcon } from "../../icons/SendBackwardIcon";
import { SendToBackIcon } from "../../icons/SendToBackIcon";
import { StackOrderIcon } from "../../icons/StackOrderIcon";

const SECTION_ID = "stack-order";

type StackOrderMenuProps = {
	canvasState: CanvasState;
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
	const isOpen = canvasState.diagramMenuOpenId === SECTION_ID;

	return (
		<MenuItemPositioner>
			<DiagramMenuButton
				isActive={isOpen}
				data-kind="diagram-menu"
				data-id={`diagram-menu:toggle-${SECTION_ID}`}
			>
				<StackOrderIcon />
			</DiagramMenuButton>
			{isOpen && (
				<DropdownPanel>
					{arrangeCommands.map(({ commandId, Icon }) => {
						const command = commandRegistry.get(commandId);
						if (!command) return null;
						const enabled = command.canExecute(canvasState);
						return (
							<DiagramMenuButton
								key={commandId}
								disabled={!enabled}
								data-kind="diagram-menu"
								data-id={`diagram-menu:${commandId}`}
							>
								<Icon
									fill={enabled ? "#333333" : "#cccccc"}
									title={command.label}
								/>
							</DiagramMenuButton>
						);
					})}
				</DropdownPanel>
			)}
		</MenuItemPositioner>
	);
};

export const StackOrderMenu = memo(StackOrderMenuComponent);
