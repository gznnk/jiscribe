import { useMemo } from "react";

import { objectRegistry } from "../../../../registry/ObjectRegistry";
import type { CanvasState } from "../../../../states/canvas/CanvasState";

/**
 * 選択中オブジェクトの features に基づいて、表示すべきメニュー項目を決定する。
 */
export type MenuConfig = {
	/** fill プロパティを持つオブジェクトが選択されている */
	hasFill: boolean;
	/** stroke プロパティを持つオブジェクトが選択されている */
	hasStroke: boolean;
	/** transform プロパティを持つオブジェクトが選択されている */
	hasTransform: boolean;
	/** text プロパティを持つオブジェクトが選択されている */
	hasText: boolean;
	/** arrow プロパティを持つオブジェクトが選択されている (polyline, connector) */
	hasArrow: boolean;
};

/**
 * 選択中オブジェクトの features を集約してメニュー表示設定を算出する。
 */
const calcMenuConfig = (state: CanvasState): MenuConfig => {
	const { selectedIds, objects } = state;

	let hasFill = false;
	let hasStroke = false;
	let hasTransform = false;
	let hasText = false;
	let hasArrow = false;

	for (const id of selectedIds) {
		const obj = objects[id];
		if (!obj) continue;

		const features = objectRegistry.getFeatures(obj.type);
		if (!features) continue;

		if (features.fill) hasFill = true;
		if (features.stroke) hasStroke = true;
		if (features.transform) hasTransform = true;
		if (features.text) hasText = true;
		if (obj.type === "polyline" || obj.type === "connector") hasArrow = true;
	}

	return { hasFill, hasStroke, hasTransform, hasText, hasArrow };
};

/**
 * メニュー表示設定を算出する Hook。
 * selectedIds と objects が変化した場合のみ再計算する。
 */
export const useMenuConfig = (state: CanvasState): MenuConfig => {
	return useMemo(() => calcMenuConfig(state), [state]);
};
