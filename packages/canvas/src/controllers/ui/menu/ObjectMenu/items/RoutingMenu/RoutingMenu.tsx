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
 * コネクターの routing（直線 / 直角）を切り替えるメニュー項目。
 * バー上のボタンは現在の routing アイコンを表示し、クリックで選択肢を横並びに展開する。
 * 各選択肢は `object-menu:command:setRouting*` を発火して SetConnectorRoutingCommand に委譲する。
 *
 * 自己ループは orthogonal 固定なので null を返す。空になったセクションは
 * ObjectMenuSection の `:empty` で区切り線ごと畳まれる。
 */
const RoutingMenuComponent: React.FC<MenuItemProps> = ({ canvasState }) => {
	const menuItemRef = useRef<HTMLDivElement>(null);
	const isOpen = canvasState.objectMenuOpenId === SECTION_ID;
	const currentRouting = getSelectedRouting(canvasState);
	const { submenuRef, placement, offsetX } = useSubmenuPosition(
		menuItemRef,
		isOpen,
	);

	// フックを呼び切った後に早期 return する（フック順序を一定に保つ）。
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
