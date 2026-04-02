import { memo } from "react";

import type { CanvasState } from "../../../../../../states/canvas/CanvasState";
import { AspectRatioIcon } from "../../../../icons/AspectRatioIcon";
import { DiagramMenuButton, MenuItemPositioner } from "../../DiagramMenuStyled";

type KeepAspectRatioMenuProps = {
	canvasState: CanvasState;
};

/**
 * 選択中オブジェクトの lockAspectRatio 値を取得する。
 * 最初に見つかった lockAspectRatio 値を返す。
 */
const getSelectedLockAspectRatio = (state: CanvasState): boolean => {
	for (const id of state.selectedIds) {
		const obj = state.objects[id];
		if (
			obj &&
			"lockAspectRatio" in obj &&
			typeof obj.lockAspectRatio === "boolean"
		) {
			return obj.lockAspectRatio;
		}
	}
	return false;
};

/**
 * アスペクト比ロックメニュー。
 * 選択中オブジェクトの lockAspectRatio プロパティをトグルする。
 * ドロップダウンなし — ボタンクリックで直接トグル。
 */
const KeepAspectRatioMenuComponent: React.FC<KeepAspectRatioMenuProps> = ({
	canvasState,
}) => {
	const isLocked = getSelectedLockAspectRatio(canvasState);
	const nextValue = isLocked ? "false" : "true";

	return (
		<MenuItemPositioner>
			<DiagramMenuButton
				isActive={isLocked}
				data-kind="diagram-menu"
				data-id={`diagram-menu:set-lockAspectRatio:${nextValue}`}
				title={isLocked ? "Unlock Aspect Ratio" : "Lock Aspect Ratio"}
			>
				<AspectRatioIcon
					title={isLocked ? "Unlock Aspect Ratio" : "Lock Aspect Ratio"}
				/>
			</DiagramMenuButton>
		</MenuItemPositioner>
	);
};

export const KeepAspectRatioMenu = memo(KeepAspectRatioMenuComponent);
