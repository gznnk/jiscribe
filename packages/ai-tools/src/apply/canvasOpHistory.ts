// AI の編集を 1 手ずつ巻き戻すための履歴。キャンバス自身の undo（Ctrl+Z）とは
// 別物で、AI が自分の直前の手だけを取り消すために使う。
//
// 取り消して良いのは「AI が置いた doc のまま」のときだけなので、適用後の doc も
// 一緒に覚えておき、現在の doc と一致しない＝ユーザーが触った場合は巻き戻さない。

import type { CanvasDoc } from "@jiscribe/doc";

/** 保持する手数。これを超えた古い手から捨てる */
const MAX_HISTORY_DEPTH = 20;

export type CanvasOpHistory = {
	/**
	 * 1 手分を覚える。
	 *
	 * @param before - 操作前の doc。undo で復元する実体
	 * @param after - 操作後の doc。undo 時にユーザーの編集が挟まっていないかの照合に使う
	 */
	push: (before: CanvasDoc, after: CanvasDoc) => void;
	/**
	 * 直前の 1 手を取り出す。
	 *
	 * @param currentDoc - 現在編集中の doc
	 * @returns 復元すべき doc。履歴が無い場合と、現在の doc が最後に AI が置いたもの
	 *   から変わっている（ユーザーが編集した）場合は null
	 */
	pop: (currentDoc: CanvasDoc) => CanvasDoc | null;
	/** 残っている手数 */
	depth: () => number;
};

/** AI 操作の履歴を作る。編集対象（チャットパネルの doc・編集中のファイル）ごとに 1 つ持つ */
export const createCanvasOpHistory = (): CanvasOpHistory => {
	const entries: { before: CanvasDoc; afterJson: string }[] = [];

	return {
		push: (before, after) => {
			entries.push({ before, afterJson: JSON.stringify(after) });
			if (entries.length > MAX_HISTORY_DEPTH) {
				entries.shift();
			}
		},
		pop: (currentDoc) => {
			const latest = entries[entries.length - 1];
			if (latest === undefined) {
				return null;
			}
			if (JSON.stringify(currentDoc) !== latest.afterJson) {
				return null;
			}
			entries.pop();
			return latest.before;
		},
		depth: () => entries.length,
	};
};
