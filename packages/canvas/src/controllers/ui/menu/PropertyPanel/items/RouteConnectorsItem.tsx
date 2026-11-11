import styled from "@emotion/styled";
import { memo } from "react";

import type { BuiltinItemProps } from "./BuiltinItemProps";
import { useCanvasMessages } from "../../../../../foundation/i18n/CanvasMessagesContext";
import { ROUTE_CONNECTORS_COMMAND_ID } from "../../../../commands/arrange/layout/RouteConnectorsCommand";
import { commandAction } from "../../../../gestures/handlers/menu/utils/menuActions";
import { useCommandState } from "../../../../hooks/useCommandState";
import { PropertyCommandButton } from "../common/PropertyControlsStyled";
import { PropertyRow } from "../common/PropertyRow";

/** Takes the whole control column, not one column of PropertyCommandGrid. */
const RouteConnectorsButton = styled(PropertyCommandButton)`
	flex: 1;
`;

/**
 * The command redrawing the lines without moving a shape, as a row of its own beside
 * automatic layout's. Disabled while there is nothing to redraw rather than hidden, so
 * the row keeps its shape; a canvas whose `commands` leave it out gets no row at all.
 */
const RouteConnectorsItemComponent: React.FC<
	Pick<BuiltinItemProps, "canvasState">
> = ({ canvasState }) => {
	const messages = useCanvasMessages();
	const resolveCommand = useCommandState(canvasState);
	const resolved = resolveCommand(ROUTE_CONNECTORS_COMMAND_ID);
	if (!resolved) {
		return null;
	}

	return (
		<PropertyRow label={messages.propertyPanelRouteConnectors}>
			<RouteConnectorsButton
				type="button"
				disabled={!resolved.enabled}
				title={messages.propertyPanelRouteConnectorsButtonTitle}
				data-action={commandAction(ROUTE_CONNECTORS_COMMAND_ID)}
			>
				{messages.propertyPanelRouteConnectorsButton}
			</RouteConnectorsButton>
		</PropertyRow>
	);
};

export const RouteConnectorsItem = memo(RouteConnectorsItemComponent);
