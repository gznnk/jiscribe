import { memo } from "react";

import { commandPart } from "../../../../gestures/handlers/menu/utils/menuParts";
import { useCanvasMessages } from "../../../../messages/CanvasMessagesContext";
import { getSelectedRouting } from "../../../../utils/getSelectedRouting";
import { isSelectedConnectorSelfLoop } from "../../../../utils/isSelectedConnectorSelfLoop";
import { OrthogonalConnectorIcon } from "../../../icons/OrthogonalConnectorIcon";
import { StraightConnectorIcon } from "../../../icons/StraightConnectorIcon";
import { PropertyRow } from "../common/PropertyRow";
import { PropertySegmentedControl } from "../common/PropertySegmentedControl";
import type { PropertyPanelItemProps } from "../PropertyPanelTypes";

/**
 * The shape of the selected connector's line: right-angled or direct. The
 * sidebar twin of the ObjectMenu's RoutingMenu, writing through the same two
 * commands (SetConnectorRoutingCommand) rather than a property, since the
 * command is what redraws the route.
 *
 * Self-loops are fixed to orthogonal, so this returns null for one — switching
 * them to straight would collapse the loop.
 */
const ConnectorRoutingItemComponent: React.FC<PropertyPanelItemProps> = ({
	objects,
	selectedConnectorId,
}) => {
	const messages = useCanvasMessages();

	if (isSelectedConnectorSelfLoop(selectedConnectorId, objects)) {
		return null;
	}

	// An omitted routing draws orthogonal, so that is the segment to light.
	const routing = getSelectedRouting(selectedConnectorId, objects);

	return (
		<PropertyRow label={messages.propertyPanelRowRouting}>
			<PropertySegmentedControl
				options={[
					{
						id: "orthogonal",
						part: commandPart("setRoutingOrthogonal"),
						title: messages.menuRoutingOrthogonal,
						content: (
							<OrthogonalConnectorIcon title={messages.menuRoutingOrthogonal} />
						),
						isActive: routing === "orthogonal",
					},
					{
						id: "straight",
						part: commandPart("setRoutingStraight"),
						title: messages.menuRoutingStraight,
						content: (
							<StraightConnectorIcon title={messages.menuRoutingStraight} />
						),
						isActive: routing === "straight",
					},
				]}
			/>
		</PropertyRow>
	);
};

export const ConnectorRoutingItem = memo(ConnectorRoutingItemComponent);
