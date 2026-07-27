import { memo, useRef } from "react";

import { RoutingMenuRow } from "./RoutingMenuStyled";
import { getSelectedRouting } from "./utils/getSelectedRouting";
import { isSelectedConnectorSelfLoop } from "./utils/isSelectedConnectorSelfLoop";
import type { ConnectorRouting } from "../../../../../../schemas/objects/types/ConnectorRouting";
import { useCanvasMessages } from "../../../../../messages/CanvasMessagesContext";
import type { CanvasMessageStrings } from "../../../../../messages/CanvasMessagesTypes";
import { OrthogonalConnectorIcon } from "../../../../icons/OrthogonalConnectorIcon";
import { StraightConnectorIcon } from "../../../../icons/StraightConnectorIcon";
import { ObjectMenuDropdownPanel } from "../../common/ObjectMenuDropdownPanel";
import { useSubmenuPosition } from "../../hooks/useSubmenuPosition";
import {
	ObjectMenuItemPositioner,
	ObjectMenuButton,
} from "../../ObjectMenuStyled";
import type { ObjectMenuItemProps } from "../../ObjectMenuTypes";

const SECTION_ID = "connector-routing";

type IconComponent = React.FC<{
	width?: number;
	height?: number;
	fill?: string;
	title?: string;
}>;

type RoutingOption = {
	routing: ConnectorRouting;
	commandId: string;
	messageKey: keyof CanvasMessageStrings;
	Icon: IconComponent;
};

/**
 * Place orthogonal first (the default when routing is omitted = orthogonal).
 * commandId must match the registered id of SetConnectorRoutingCommand.
 */
const ROUTING_OPTIONS: RoutingOption[] = [
	{
		routing: "orthogonal",
		commandId: "setRoutingOrthogonal",
		messageKey: "menuRoutingOrthogonal",
		Icon: OrthogonalConnectorIcon,
	},
	{
		routing: "straight",
		commandId: "setRoutingStraight",
		messageKey: "menuRoutingStraight",
		Icon: StraightConnectorIcon,
	},
];

/**
 * Menu item for switching a connector's routing (straight / orthogonal).
 * The button on the bar shows the current routing icon, and clicking it expands the
 * options in a horizontal row. Each option fires `command:setRouting*`,
 * delegating to SetConnectorRoutingCommand.
 *
 * Self-loops are fixed to orthogonal, so this returns null. An emptied section is
 * collapsed along with its divider via ObjectMenuSection's `:empty`.
 */
const RoutingMenuComponent: React.FC<ObjectMenuItemProps> = ({
	objects,
	selectedConnectorId,
	openSectionId,
}) => {
	const messages = useCanvasMessages();
	const menuItemRef = useRef<HTMLDivElement>(null);
	const isOpen = openSectionId === SECTION_ID;
	const currentRouting = getSelectedRouting(selectedConnectorId, objects);
	const { submenuRef, placement, offsetX } = useSubmenuPosition(
		menuItemRef,
		isOpen,
	);

	// Early-return only after all hooks have been called (to keep hook order stable).
	if (isSelectedConnectorSelfLoop(selectedConnectorId, objects)) {
		return null;
	}

	const CurrentIcon =
		currentRouting === "orthogonal"
			? OrthogonalConnectorIcon
			: StraightConnectorIcon;

	return (
		<ObjectMenuItemPositioner ref={menuItemRef}>
			<ObjectMenuButton
				isActive={isOpen}
				data-kind="menu"
				data-id="object-menu"
				data-part={`toggle:${SECTION_ID}`}
				title={messages.menuConnectorRouting}
			>
				<CurrentIcon title={messages.menuConnectorRouting} />
			</ObjectMenuButton>
			{isOpen && (
				<ObjectMenuDropdownPanel
					ref={submenuRef}
					placement={placement}
					offsetX={offsetX}
				>
					<RoutingMenuRow>
						{ROUTING_OPTIONS.map(({ routing, commandId, messageKey, Icon }) => (
							<ObjectMenuButton
								key={routing}
								isActive={routing === currentRouting}
								data-kind="menu"
								data-id="object-menu"
								data-part={`command:${commandId}`}
								title={messages[messageKey]}
							>
								<Icon title={messages[messageKey]} />
							</ObjectMenuButton>
						))}
					</RoutingMenuRow>
				</ObjectMenuDropdownPanel>
			)}
		</ObjectMenuItemPositioner>
	);
};

export const RoutingMenu = memo(RoutingMenuComponent);
