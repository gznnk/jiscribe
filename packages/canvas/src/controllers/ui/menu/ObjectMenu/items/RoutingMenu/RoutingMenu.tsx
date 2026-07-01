import { memo, useRef } from "react";

import { RoutingMenuRow } from "./RoutingMenuStyled";
import { getSelectedRouting } from "./utils/getSelectedRouting";
import { isSelectedConnectorSelfLoop } from "./utils/isSelectedConnectorSelfLoop";
import type { ConnectorRouting } from "../../../../../../schemas/objects/types/ConnectorRouting";
import { OrthogonalConnectorIcon } from "../../../../icons/OrthogonalConnectorIcon";
import { StraightConnectorIcon } from "../../../../icons/StraightConnectorIcon";
import { DropdownPanel } from "../../common/DropdownPanel";
import { useSubmenuPosition } from "../../hooks/useSubmenuPosition";
import { MenuItemPositioner, ObjectMenuButton } from "../../ObjectMenuStyled";
import type { MenuItemProps } from "../../ObjectMenuTypes";

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
	label: string;
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
		label: "Orthogonal",
		Icon: OrthogonalConnectorIcon,
	},
	{
		routing: "straight",
		commandId: "setRoutingStraight",
		label: "Straight",
		Icon: StraightConnectorIcon,
	},
];

/**
 * Menu item for switching a connector's routing (straight / orthogonal).
 * The button on the bar shows the current routing icon, and clicking it expands the
 * options in a horizontal row. Each option fires `object-menu:command:setRouting*`,
 * delegating to SetConnectorRoutingCommand.
 *
 * Self-loops are fixed to orthogonal, so this returns null. An emptied section is
 * collapsed along with its divider via ObjectMenuSection's `:empty`.
 */
const RoutingMenuComponent: React.FC<MenuItemProps> = ({ canvasState }) => {
	const menuItemRef = useRef<HTMLDivElement>(null);
	const isOpen = canvasState.objectMenuOpenId === SECTION_ID;
	const currentRouting = getSelectedRouting(canvasState);
	const { submenuRef, placement, offsetX } = useSubmenuPosition(
		menuItemRef,
		isOpen,
	);

	// Early-return only after all hooks have been called (to keep hook order stable).
	if (isSelectedConnectorSelfLoop(canvasState)) {
		return null;
	}

	const CurrentIcon =
		currentRouting === "orthogonal"
			? OrthogonalConnectorIcon
			: StraightConnectorIcon;

	return (
		<MenuItemPositioner ref={menuItemRef}>
			<ObjectMenuButton
				isActive={isOpen}
				data-kind="object-menu"
				data-id={`object-menu:toggle:${SECTION_ID}`}
				title="Connector Routing"
			>
				<CurrentIcon title="Connector Routing" />
			</ObjectMenuButton>
			{isOpen && (
				<DropdownPanel ref={submenuRef} placement={placement} offsetX={offsetX}>
					<RoutingMenuRow>
						{ROUTING_OPTIONS.map(({ routing, commandId, label, Icon }) => (
							<ObjectMenuButton
								key={routing}
								isActive={routing === currentRouting}
								data-kind="object-menu"
								data-id={`object-menu:command:${commandId}`}
								title={label}
							>
								<Icon title={label} />
							</ObjectMenuButton>
						))}
					</RoutingMenuRow>
				</DropdownPanel>
			)}
		</MenuItemPositioner>
	);
};

export const RoutingMenu = memo(RoutingMenuComponent);
