import { memo } from "react";

import { ResetConnectorRouteCommand } from "../../../../commands/connector/ResetConnectorRouteCommand";
import { commandPart } from "../../../../gestures/handlers/menu/utils/menuParts";
import { getCommandLabel } from "../../../../messages/CanvasMessages";
import { useCanvasMessages } from "../../../../messages/CanvasMessagesContext";
import { hasSelectedConnectorShapedRoute } from "../../../../utils/hasSelectedConnectorShapedRoute";
import { PropertyCommandButton } from "../common/PropertyControlsStyled";
import { PropertyRow } from "../common/PropertyRow";
import type { PropertyPanelItemProps } from "../PropertyPanelTypes";

/**
 * Hands the selected connector's route back to the engine, discarding the
 * vertices a segment drag left in it. The sidebar twin of the context menu's
 * entry, writing through the same command (ResetConnectorRouteCommand).
 *
 * A connector the engine already routes leaves the button disabled rather than
 * gone, so the row keeps its place at the end of the Line section. A custom row
 * is handed no canvas state, so the command's own `canExecute` cannot be
 * evaluated here; the test it is built on is applied to the props instead.
 */
const ConnectorResetRouteItemComponent: React.FC<PropertyPanelItemProps> = ({
	objects,
	selectedConnectorId,
}) => {
	const messages = useCanvasMessages();
	const label = getCommandLabel(messages, ResetConnectorRouteCommand);

	return (
		<PropertyRow>
			<PropertyCommandButton
				type="button"
				disabled={
					!hasSelectedConnectorShapedRoute(selectedConnectorId, objects)
				}
				title={label}
				data-kind="menu"
				data-id="object-menu"
				data-part={commandPart(ResetConnectorRouteCommand.id)}
			>
				{label}
			</PropertyCommandButton>
		</PropertyRow>
	);
};

export const ConnectorResetRouteItem = memo(ConnectorResetRouteItemComponent);
