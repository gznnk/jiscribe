import type { ObjectType } from "../../../../../../schemas/objects/types/ObjectType";
import type { ObjectState } from "../../../../../../states/objects/base/ObjectState";
import type { HoveredElement } from "../../../../recognizer/GestureRecognizerTypes";

/**
 * hover 中の要素から、エンドポイント接続先として有効な最初のオブジェクトを返す。
 * - 固定側エンドポイントのオブジェクト（fixedObjectId）は自己接続になるため除外する
 * - connectable 判定（isConnectable）が真のオブジェクトのみ対象にする
 *
 * registry へ直接依存させず isConnectable を注入することで、純粋関数として単体テストできる。
 */
export function findConnectableHoverTarget(args: {
	hovered: HoveredElement[];
	objects: Record<string, ObjectState>;
	fixedObjectId: string | undefined;
	isConnectable: (type: ObjectType) => boolean;
}): { id: string; object: ObjectState } | null {
	const { hovered, objects, fixedObjectId, isConnectable } = args;

	for (const { id } of hovered) {
		if (id === fixedObjectId) {
			continue;
		}

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
