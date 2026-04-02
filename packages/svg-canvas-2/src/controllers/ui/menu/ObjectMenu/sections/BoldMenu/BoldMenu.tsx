import { memo } from "react";

import type { CanvasState } from "../../../../../../states/canvas/CanvasState";
import { BoldIcon } from "../../../../icons/BoldIcon";
import { ObjectMenuButton, MenuItemPositioner } from "../../ObjectMenuStyled";

type BoldMenuProps = {
	canvasState: CanvasState;
};

/**
 * 太字メニュー（見た目のみ）。
 * テキスト機能の実装後に fontWeight プロパティと連携予定。
 */
const BoldMenuComponent: React.FC<BoldMenuProps> = ({
	canvasState: _canvasState,
}) => {
	// TODO: テキスト機能実装後に fontWeight を取得してトグル
	void _canvasState;
	const _isBold = false;

	return (
		<MenuItemPositioner>
			<ObjectMenuButton
				isActive={false}
				data-kind="object-menu"
				data-id="object-menu:set-fontWeight:bold"
				title="Bold"
			>
				<BoldIcon fill={_isBold ? "#333333" : "#999999"} />
			</ObjectMenuButton>
		</MenuItemPositioner>
	);
};

export const BoldMenu = memo(BoldMenuComponent);
