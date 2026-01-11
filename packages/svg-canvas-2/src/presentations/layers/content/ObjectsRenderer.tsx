import { memo } from "react";

import {
	ellipseToDoc,
	ellipseToState,
} from "../../../operations/objects/primitives/Ellipse/EllipseMapper";
import {
	groupToDoc,
	groupToState,
} from "../../../operations/objects/primitives/Group/GroupMapper";
import {
	rectToDoc,
	rectToState,
} from "../../../operations/objects/primitives/Rect/RectMapper";
import { objectRegistry } from "../../../registry/ObjectRegistry";
import type { CanvasState } from "../../../states/canvas/CanvasState";
import type { GroupState } from "../../../states/objects/primitives/GroupState";
import { Ellipse } from "../../objects/primitives/Ellipse";
import { Rect } from "../../objects/primitives/Rect";

objectRegistry.register("rect", {
	mapper: {
		toDoc: rectToDoc,
		toState: rectToState,
	},
	component: Rect,
});

objectRegistry.register("ellipse", {
	mapper: {
		toDoc: ellipseToDoc,
		toState: ellipseToState,
	},
	component: Ellipse,
});

objectRegistry.register("group", {
	mapper: {
		toDoc: groupToDoc,
		toState: groupToState,
	},
	component: () => null, // Groupはコンポーネントを持たない（再帰的に描画される）
});

type ObjectsRendererProps = Pick<CanvasState, "objects" | "rootIds">;

const ObjectsRendererComponent: React.FC<ObjectsRendererProps> = ({
	objects,
	rootIds,
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
		const ObjectComponent = objectRegistry.getComponent(objState.type);
		if (!ObjectComponent) return;
		result.push(<ObjectComponent key={id} {...objState} />);
	};

	const renderObjects: React.ReactNode[] = [];
	rootIds.forEach((id) => renderObject(id, renderObjects));

	return <>{renderObjects}</>;
};
export const ObjectsRenderer = memo(ObjectsRendererComponent);
