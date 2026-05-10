import { memo } from "react";

import type { CanvasControllerState } from "../../../../../../controllers/CanvasTypes";
import { AspectRatioIcon } from "../../../../icons/AspectRatioIcon";
import { ObjectMenuButton, MenuItemPositioner } from "../../ObjectMenuStyled";

type KeepAspectRatioMenuProps = {
	canvasState: CanvasControllerState;
};

/**
 * 選択中オブジェクトの lockAspectRatio 値を取得する。
 * 複数選択時はmultiSelectGroupの値を優先、単一選択時は選択オブジェクトの値を返す。
 */
const getSelectedLockAspectRatio = (state: CanvasControllerState): boolean => {
	// 複数選択時はmultiSelectGroupの値を使用
	if (state.multiSelectGroup) {
		return state.multiSelectGroup.lockAspectRatio ?? false;
	}

	// 単一選択時は選択オブジェクトの値を使用
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
			<ObjectMenuButton
				isActive={isLocked}
				data-kind="object-menu"
				data-id={`object-menu:set:lockAspectRatio:${nextValue}`}
				title={isLocked ? "Unlock Aspect Ratio" : "Lock Aspect Ratio"}
			>
				<AspectRatioIcon
					title={isLocked ? "Unlock Aspect Ratio" : "Lock Aspect Ratio"}
				/>
			</ObjectMenuButton>
		</MenuItemPositioner>
	);
};

export const KeepAspectRatioMenu = memo(KeepAspectRatioMenuComponent);
