import { memo, useRef } from "react";

import { StackOrderMenuRow } from "./StackOrderMenuStyled";
import type { CanvasControllerState } from "../../../../../CanvasTypes";
import { useCommandState } from "../../../../../hooks/useCommandState";
import { getCommandLabel } from "../../../../../messages/CanvasMessages";
import { useCanvasMessages } from "../../../../../messages/CanvasMessagesContext";
import { BringForwardIcon } from "../../../../icons/BringForwardIcon";
import { BringToFrontIcon } from "../../../../icons/BringToFrontIcon";
import { SendBackwardIcon } from "../../../../icons/SendBackwardIcon";
import { SendToBackIcon } from "../../../../icons/SendToBackIcon";
import { StackOrderIcon } from "../../../../icons/StackOrderIcon";
import { ObjectMenuDropdownPanel } from "../../common/ObjectMenuDropdownPanel";
import { useSubmenuPosition } from "../../hooks/useSubmenuPosition";
import {
	ObjectMenuButton,
	ObjectMenuItemPositioner,
} from "../../ObjectMenuStyled";

const SECTION_ID = "stack-order";

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
	const messages = useCanvasMessages();
	const resolveCommand = useCommandState(canvasState);
	const menuItemRef = useRef<HTMLDivElement>(null);
	const isOpen = canvasState.objectMenuOpenId === SECTION_ID;
	const { submenuRef, placement, offsetX } = useSubmenuPosition(
		menuItemRef,
		isOpen,
	);

	return (
		<ObjectMenuItemPositioner ref={menuItemRef}>
			<ObjectMenuButton
				isActive={isOpen}
				data-kind="menu"
				data-id="object-menu"
				data-part={`toggle:${SECTION_ID}`}
			>
				<StackOrderIcon />
			</ObjectMenuButton>
			{isOpen && (
				<ObjectMenuDropdownPanel
					ref={submenuRef}
					placement={placement}
					offsetX={offsetX}
				>
					<StackOrderMenuRow>
						{arrangeCommands.map(({ commandId, Icon }) => {
							const resolved = resolveCommand(commandId);
							if (!resolved) {
								return null;
							}
							const { command, enabled } = resolved;
							return (
								<ObjectMenuButton
									key={commandId}
									disabled={!enabled}
									data-kind="menu"
									data-id="object-menu"
									data-part={`command:${commandId}`}
								>
									<Icon title={getCommandLabel(messages, command)} />
								</ObjectMenuButton>
							);
						})}
					</StackOrderMenuRow>
				</ObjectMenuDropdownPanel>
			)}
		</ObjectMenuItemPositioner>
	);
};

export const StackOrderMenu = memo(StackOrderMenuComponent);
