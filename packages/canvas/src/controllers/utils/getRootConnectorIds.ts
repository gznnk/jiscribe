import type { ObjectState } from "../../states/objects/base/ObjectState";

/**
 * rootIds のうち connector 型の ID を z-order 順（背面→前面）で返す。
 *
 * コネクターは独立した配列ではなく rootIds に混在して管理されるため、
 * 「コネクター一覧」が必要な箇所はこのヘルパーで型フィルタして導出する。
 */
export const getRootConnectorIds = (
	objects: Record<string, ObjectState>,
	rootIds: readonly string[],
): string[] => rootIds.filter((id) => objects[id]?.type === "connector");
