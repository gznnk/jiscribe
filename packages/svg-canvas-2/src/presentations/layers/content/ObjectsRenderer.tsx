import { memo } from "react";

import type { CanvasState } from "../../../states/canvas/CanvasState";
import type { GroupState } from "../../../states/objects/primitives/group/GroupState";
import { objectComponentRegistry } from "../../objects/ObjectComponentRegistry";

type ObjectsRendererProps = Pick<CanvasState, "objects" | "rootIds"> & {
	textEditObjectId?: string | null;
};

const ObjectsRendererComponent: React.FC<ObjectsRendererProps> = ({
	objects,
	rootIds,
	textEditObjectId,
}) => {
	const renderObject = (id: string, result: React.ReactNode[]): void => {
		const objState = objects[id];
		if (!objState) return;

		// Groupの場合は子要素を再帰的に配列に追加
		if (objState.type === "group") {
			const groupState = objState as GroupState;
			groupState.childIds.forEach((childId) => renderObject(childId, result));
			return;
		}

		// 通常のオブジェクトはレジストリからコンポーネントを取得して配列に追加
		const ObjectComponent = objectComponentRegistry.get(objState.type);
		if (!ObjectComponent) return;

		// テキスト編集中の場合は isEditing prop を追加
		const isEditing = id === textEditObjectId;
		result.push(
			<ObjectComponent key={id} {...objState} isEditing={isEditing} />,
		);
	};

	const renderObjects: React.ReactNode[] = [];
	rootIds.forEach((id) => renderObject(id, renderObjects));

	return <>{renderObjects}</>;
};
export const ObjectsRenderer = memo(ObjectsRendererComponent);
