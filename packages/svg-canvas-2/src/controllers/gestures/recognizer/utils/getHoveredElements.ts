import { getKindAndId } from "./getKindAndId";
import type { HoveredElement } from "../GestureRecognizerTypes";

/**
 * 座標上のホバー要素を取得（重複除外、指定IDの除外）
 */
export const getHoveredElements = (
	x: number,
	y: number,
	excludeId?: string,
): HoveredElement[] => {
	const elements = document.elementsFromPoint(x, y);
	const hovered: HoveredElement[] = [];
	const seenIds = new Set<string>();
	for (const el of elements) {
		const item = getKindAndId(el);
		if (!item) {
			continue;
		}

		if (item.kind === "canvas") {
			continue;
		}

		// 重複チェック: 既に同じ id が存在する場合はスキップ
		if (seenIds.has(item.id)) {
			continue;
		}
		seenIds.add(item.id);

		// excludeId と同じ場合は hovered に追加しない
		if (excludeId && item.id === excludeId) {
			continue;
		}
		hovered.push(item);
	}
	return hovered;
};
