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
	for (const obj of Object.values(objects)) {
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
	}

	const objectKeys = new Set(Object.keys(objects));
	if (!(v.rootIds as string[]).every((id) => objectKeys.has(id))) {
		return false;
	}

	return true;
};
