import { memo } from "react";

import { getSelectedConnectorLabel } from "./utils/getSelectedConnectorLabel";
import type { CanvasControllerState } from "../../../../../CanvasTypes";
import { BoldIcon } from "../../../../icons/BoldIcon";
import { ObjectMenuButton, MenuItemPositioner } from "../../ObjectMenuStyled";

type Props = {
	canvasState: CanvasControllerState;
};

/**
 * ラベルの太字メニュー（図形の Bold と同じトグル）。
 * `label.fontWeight` を bold / normal で切り替える。data-id 直叩き（gesture 経路）で更新する。
 */
const LabelBoldMenuComponent: React.FC<Props> = ({ canvasState }) => {
	const isBold = getSelectedConnectorLabel(canvasState)?.fontWeight === "bold";

	return (
		<MenuItemPositioner>
			<ObjectMenuButton
				isActive={isBold}
				data-kind="object-menu"
				data-id={`object-menu:set:label.fontWeight:${isBold ? "normal" : "bold"}`}
				title="Label Bold"
			>
				<BoldIcon />
			</ObjectMenuButton>
		</MenuItemPositioner>
	);
};

export const LabelBoldMenu = memo(LabelBoldMenuComponent);
