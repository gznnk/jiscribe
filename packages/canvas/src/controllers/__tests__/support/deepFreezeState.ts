import type { CanvasControllerState } from "../../CanvasTypes";

const freezeRecursively = (value: unknown, seen: WeakSet<object>): void => {
	if (value === null || typeof value !== "object") {
		return;
	}
	if (seen.has(value)) {
		return;
	}
	seen.add(value);
	// Object.freeze は Map / Set の set / add を防げないため対象外にする
	// （キャッシュ用途の意図的なミュータブル構造は自然にここで除外される）
	if (value instanceof Map || value instanceof Set) {
		return;
	}
	Object.freeze(value);
	for (const child of Object.values(value)) {
		freezeRecursively(child, seen);
	}
};

/**
 * テスト用: state を再帰的に Object.freeze して返す。
 *
 * ハンドラー / コマンドは state を immutable に更新する規約であり、handleGesture の
 * 変更検知（commitVersion のインクリメント条件）はこの規約を前提とした参照比較で行う。
 * 規約に反して in-place ミューテートすると変更が検知されず phantom history の原因に
 * なるため（issue #19）、テストに渡す state を凍結し、違反を strict mode の
 * TypeError で即座に検知する。
 *
 * history 配下だけは凍結しない: DocSnapshot は resolveDocSnapshot が write-once
 * メモ化として意図的に in-place 更新するため（DocSnapshot.ts の invariant を参照）。
 */
export const deepFreezeState = (
	state: CanvasControllerState,
): CanvasControllerState => {
	const seen = new WeakSet<object>();
	Object.freeze(state);
	for (const [key, child] of Object.entries(state)) {
		if (key === "history") {
			continue;
		}
		freezeRecursively(child, seen);
	}
	return state;
};
