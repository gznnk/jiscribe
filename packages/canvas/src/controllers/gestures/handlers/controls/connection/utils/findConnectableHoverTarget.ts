import type { ObjectType } from "../../../../../../schemas/objects/types/ObjectType";
import type { ObjectState } from "../../../../../../states/objects/base/ObjectState";
import type { HoveredElement } from "../../../../recognizer/GestureRecognizerTypes";

/**
 * hover 中の要素から、エンドポイント接続先として有効な最初のオブジェクトを返す。
 * - connectable 判定（isConnectable）が真のオブジェクトのみ対象にする
 *
 * 固定側エンドポイントと同一のオブジェクトも対象に含める（自己ループを許可するため）。
 * 同一オブジェクトでの「固定側と同じアンカー」回避は computeEditedEndpoint が担う。
 *
 * registry へ直接依存させず isConnectable を注入することで、純粋関数として単体テストできる。
 */
export function findConnectableHoverTarget(args: {
	hovered: HoveredElement[];
	objects: Record<string, ObjectState>;
	isConnectable: (type: ObjectType) => boolean;
}): { id: string; object: ObjectState } | null {
	const { hovered, objects, isConnectable } = args;

	for (const { id } of hovered) {
		const object = objects[id];
		if (!object) {
			continue;
		}

		if (isConnectable(object.type)) {
			return { id, object };
		}
	}

	return null;
}
