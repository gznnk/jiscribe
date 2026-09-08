import { memo } from "react";

import type { BuiltinItemProps } from "./BuiltinItemProps";
import { commandPart } from "../../../../gestures/handlers/menu/utils/menuParts";
import { useCommandState } from "../../../../hooks/useCommandState";
import { getCommandLabel } from "../../../../messages/CanvasMessages";
import { useCanvasMessages } from "../../../../messages/CanvasMessagesContext";
import {
	PropertyCommandButton,
	PropertyCommandGrid,
} from "../common/PropertyControlsStyled";

/** Front to back, so the grid reads top-left to bottom-right the way the stack does. */
const STACK_ORDER_COMMAND_IDS = [
	"bringToFront",
	"bringForward",
	"sendBackward",
	"sendToBack",
] as const;

/**
 * The stacking-order commands as named buttons, one per command, in the order
 * the ObjectMenu's own stack-order flyout lists them. Each is disabled while its
 * command cannot run on the selection (objects under different parents) rather
 * than hidden, so the grid keeps its shape.
 */
const StackOrderItemComponent: React.FC<
	Pick<BuiltinItemProps, "canvasState">
> = ({ canvasState }) => {
	const messages = useCanvasMessages();
	const resolveCommand = useCommandState(canvasState);

	return (
		<PropertyCommandGrid>
			{STACK_ORDER_COMMAND_IDS.map((commandId) => {
				const resolved = resolveCommand(commandId);
				if (!resolved) {
					return null;
				}
				const label = getCommandLabel(messages, resolved.command);
				return (
					<PropertyCommandButton
						key={commandId}
						type="button"
						disabled={!resolved.enabled}
						title={label}
						data-kind="menu"
						data-id="object-menu"
						data-part={commandPart(commandId)}
					>
						{label}
					</PropertyCommandButton>
				);
			})}
		</PropertyCommandGrid>
	);
};

export const StackOrderItem = memo(StackOrderItemComponent);
