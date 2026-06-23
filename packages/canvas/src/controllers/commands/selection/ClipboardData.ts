import { isArray, isObject, isString } from "@workspace/basic-validators";
import type { Point } from "@workspace/geometry";
import { isPoint } from "@workspace/geometry";

import type { ObjectState } from "../../../states/objects/base/ObjectState";
import { objectStateValidatorRegistry } from "../../../states/registry/ObjectStateValidatorRegistry";

export type ClipboardData = {
	__type: "jiscribe-canvas-clipboard";
	version: 1;
	objects: Record<string, ObjectState>;
	/**
	 * コピーしたトップレベル要素（オブジェクト + コネクター）を z-order（背面→前面）で
	 * 並べた ID 配列。コネクターも独立配列ではなくここに混在させる（state の rootIds と同じ表現）。
	 * ペースト時はこの順で前面へ積み、コピー集合の相対的な重なり順を保つ。
	 */
	rootIds: string[];
	center: Point;
};

export const isClipboardData = (value: unknown): value is ClipboardData => {
	if (!isObject(value)) {
		return false;
	}
	const v = value as Record<string, unknown>;

	if (v.__type !== "jiscribe-canvas-clipboard") {
		return false;
	}
	if (v.version !== 1) {
		return false;
	}
	if (!isPoint(v.center)) {
		return false;
	}
	if (!isArray(v.rootIds) || !(v.rootIds as unknown[]).every(isString)) {
		return false;
	}

	if (!isObject(v.objects)) {
		return false;
	}
	const objects = v.objects as Record<string, unknown>;
	for (const [key, obj] of Object.entries(objects)) {
		if (!isObject(obj)) {
			return false;
		}
		const o = obj as Record<string, unknown>;
		if (!isString(o.type)) {
			return false;
		}
		// 型別の厳格検証はレジストリへ委譲する（id / 各種フィールド・CSS 安全性を含む）。
		// 未登録の型は拒否される。レジストリは initializeObjectRegistry() で初期化される。
		if (!objectStateValidatorRegistry.validate(o.type, o)) {
			return false;
		}
		// `objects` は id をキーとするマップ（CopyCommand）。childIds / endpoint owner /
		// rootIds はオブジェクト id で参照を解決するため、キーと id が一致していなければ
		// 自己完結性（後述）が成立しない。改竄でキー≠id にされたデータをここで弾く。
		if (o.id !== key) {
			return false;
		}
	}

	const objectKeys = new Set(Object.keys(objects));
	if (!(v.rootIds as string[]).every((id) => objectKeys.has(id))) {
		return false;
	}

	// 参照整合性（自己完結性）: クリップボードは untrusted 入力（任意アプリが書ける）。
	// rootIds と同様に、group の childIds・connector endpoint の owner.id が `objects` の
	// キー集合に閉じていることを検証する。これを通すと cloneObjects の id リマップ
	// フォールバック（`?? id`）が untrusted 経路で発火し、貼り付け先キャンバスの
	// 既存オブジェクトを新グループの子・接続先として取り込む参照ハイジャックになりうる。
	if (!isSelfContained(objects, objectKeys)) {
		return false;
	}

	// 非循環性: 循環する childIds（自己参照・相互参照）は untrusted クリップボードから
	// 注入されると、再帰消費者（ObjectsRenderer の描画、createMultiSelectGroup の bounds
	// 計算、hasSelectedDescendants の選択判定など）で無限再帰 → スタックオーバーフロー
	// → タブクラッシュ（DoS）を引き起こす。ガードは外部境界でのみ行う方針のため、
	// ここで循環を弾いて以降の消費者が非循環を前提にできるようにする。
	if (!isAcyclicChildIds(objects)) {
		return false;
	}

	return true;
};

/**
 * group の childIds と connector endpoint の owner.id が、すべて `objects` の
 * キー集合（= 自分自身が含むオブジェクト）に閉じているかを検証する。
 * 各オブジェクトの型別妥当性は呼び出し前に検証済みのため、ここでは参照先の存在のみ見る。
 */
function isSelfContained(
	objects: Record<string, unknown>,
	objectKeys: Set<string>,
): boolean {
	for (const obj of Object.values(objects)) {
		const o = obj as Record<string, unknown>;

		if (o.type === "group") {
			const childIds = o.childIds as string[];
			if (!childIds.every((childId) => objectKeys.has(childId))) {
				return false;
			}
		} else if (o.type === "connector") {
			const sourceOwnerId = (o.source as { owner?: { id?: string } }).owner?.id;
			const targetOwnerId = (o.target as { owner?: { id?: string } }).owner?.id;
			if (sourceOwnerId !== undefined && !objectKeys.has(sourceOwnerId)) {
				return false;
			}
			if (targetOwnerId !== undefined && !objectKeys.has(targetOwnerId)) {
				return false;
			}
		}
	}

	return true;
}

/**
 * group の childIds が成すグラフが非循環（DAG）であることを検証する。
 * 参照先の存在は isSelfContained で検証済みのため、ここでは循環の有無のみ見る。
 * DFS で探索中（VISITING）のノードへ再到達したら循環とみなす。各ノードは確定
 * （VISITED）後に再訪しないため、検証関数自体は循環データでも有限回で停止する。
 */
function isAcyclicChildIds(objects: Record<string, unknown>): boolean {
	const VISITING = 1;
	const VISITED = 2;
	const states = new Map<string, number>();

	const visit = (id: string): boolean => {
		const state = states.get(id);
		if (state === VISITED) {
			return true;
		}
		if (state === VISITING) {
			return false; // 探索中のノードへ再到達 = 循環
		}

		const obj = objects[id] as Record<string, unknown> | undefined;
		// group 以外（または未知 id）は子を持たない葉として扱う
		if (!obj || obj.type !== "group") {
			states.set(id, VISITED);
			return true;
		}

		states.set(id, VISITING);
		for (const childId of obj.childIds as string[]) {
			if (!visit(childId)) {
				return false;
			}
		}
		states.set(id, VISITED);
		return true;
	};

	for (const id of Object.keys(objects)) {
		if (!visit(id)) {
			return false;
		}
	}
	return true;
}
