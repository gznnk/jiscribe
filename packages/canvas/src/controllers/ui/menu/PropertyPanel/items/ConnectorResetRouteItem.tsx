import { memo } from "react";

import { resolveCommandLabel } from "../../../../commands/CommandUtils";
import { ResetConnectorRouteCommand } from "../../../../commands/connector/ResetConnectorRouteCommand";
import { commandPart } from "../../../../gestures/handlers/menu/utils/menuParts";
import { useCanvasLocale } from "../../../../messages/CanvasLocaleContext";
import { useCanvasMessages } from "../../../../messages/CanvasMessagesContext";
import { hasSelectedConnectorShapedRoute } from "../../../../utils/hasSelectedConnectorShapedRoute";
import { PropertyCommandButton } from "../common/PropertyControlsStyled";
import { PropertyRow } from "../common/PropertyRow";
import type { PropertyPanelItemProps } from "../PropertyPanelTypes";

/**
 * Hands the selected connector's route back to the engine, discarding the
 * vertices a segment drag left in it. The only place the reset is offered from;
 * it writes through ResetConnectorRouteCommand.
 *
 * A connector the engine already routes leaves the button disabled rather than
 * gone, so the row keeps its place at the end of the Line section. A custom row
 * is handed no canvas state, so the command's own `canExecute` cannot be
 * evaluated here; the test it is built on is applied to the props instead.
 */
const ConnectorResetRouteItemComponent: React.FC<PropertyPanelItemProps> = ({
	objects,
	selectedIds,
}) => {
	const messages = useCanvasMessages();
	const locale = useCanvasLocale();
	const label = resolveCommandLabel(
		ResetConnectorRouteCommand,
		messages,
		locale,
	);

	return (
		<PropertyRow>
			<PropertyCommandButton
				type="button"
				disabled={!hasSelectedConnectorShapedRoute({ objects, selectedIds })}
				title={label}
				data-part={commandPart(ResetConnectorRouteCommand.id)}
			>
				{label}
			</PropertyCommandButton>
		</PropertyRow>
	);
};

export const ConnectorResetRouteItem = memo(ConnectorResetRouteItemComponent);
