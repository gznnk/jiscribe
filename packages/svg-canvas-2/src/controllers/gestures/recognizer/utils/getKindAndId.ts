/**
 * 要素から最も近い [data-kind] を持つ要素の id と kind を取得
 * id が存在しない場合は null を返す
 */
export const getKindAndId = (
	el: Element,
): { id: string; kind: string } | null => {
	const kindEl = el.closest("[data-kind]");
	if (!kindEl) {
		return null;
	}

	const kind = kindEl.getAttribute("data-kind");
	if (!kind) {
		return null;
	}

	const id = kindEl.getAttribute("data-id");
	if (!id) {
		return null;
	}

	return { id, kind };
};
