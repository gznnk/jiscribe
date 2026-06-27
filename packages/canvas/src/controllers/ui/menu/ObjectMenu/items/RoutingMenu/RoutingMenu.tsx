import { memo, useRef } from "react";

import { RoutingMenuRow } from "./RoutingMenuStyled";
import type { CanvasControllerState } from "../../../../../../controllers/CanvasTypes";
import { isOrthogonalRouting } from "../../../../../../schemas/objects/types/ConnectorRouting";
import type { ConnectorRouting } from "../../../../../../schemas/objects/types/ConnectorRouting";
import type { ConnectorState } from "../../../../../../states/objects/connections/connector/ConnectorState";
import { isSelfLoopConnector } from "../../../../../../states/objects/connections/connector/isSelfLoopConnector";
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
 * orthogonal を先頭に置く（routing 省略時の既定 = orthogonal）。
 * commandId は SetConnectorRoutingCommand の登録 id と一致させる。
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
 * 選択中コネクターの現在の routing を返す。
 * routing 省略時の既定は orthogonal。
 */
const getSelectedRouting = (state: CanvasControllerState): ConnectorRouting => {
	const id = state.selectedConnectorId;
	const connector = id !== null ? state.objects[id] : undefined;
	const routing = (connector as Record<string, unknown> | undefined)
		?.routing as ConnectorRouting | undefined;
	return isOrthogonalRouting(routing) ? "orthogonal" : "straight";
};

/**
 * 選択中コネクターが自己ループかどうか。自己ループは orthogonal 専用のため
 * routing トグル自体を出さない（straight に切り替えると破綻するため）。
 */
const isSelectedConnectorSelfLoop = (state: CanvasControllerState): boolean => {
	const id = state.selectedConnectorId;
	const connector = id !== null ? state.objects[id] : undefined;
	if (!connector || connector.type !== "connector") {
		return false;
	}
	return isSelfLoopConnector(connector as ConnectorState);
};

/**
 * コネクターの routing（直線 / 直角）を切り替えるメニュー項目。
 * バー上のボタンは現在の routing アイコンを表示し、クリックで選択肢を横並びに展開する。
 * 各選択肢は `object-menu:command:setRouting*` を発火して SetConnectorRoutingCommand に委譲する。
 */
const RoutingMenuComponent: React.FC<MenuItemProps> = ({ canvasState }) => {
	const menuItemRef = useRef<HTMLDivElement>(null);
	const isOpen = canvasState.objectMenuOpenId === SECTION_ID;
	const currentRouting = getSelectedRouting(canvasState);
	const { submenuRef, placement, offsetX } = useSubmenuPosition(
		menuItemRef,
		isOpen,
	);

	// 自己ループは orthogonal 固定のため routing トグルを表示しない。
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
