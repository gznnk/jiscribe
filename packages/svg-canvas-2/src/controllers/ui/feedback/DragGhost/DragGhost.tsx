import type { Point } from "@workspace/geometry";
import React, { memo } from "react";

import { objectRegistry } from "../../../../registry/ObjectRegistry";
import type { ObjectType } from "../../../../schemas/objects/types/ObjectType";
import { createObjectDoc } from "../../../../schemas/objects/utils/createObjectDoc";

type DragGhostProps = {
	pendingShapeType: ObjectType | null;
	ghostPosition: Point | null;
};

const GHOST_ID = "drag-ghost";

/**
 * ゴースト要素を生成する。
 * レンダル中にコンポーネント変数を生成しないよう、React.createElement を使用する。
 */
const createGhostElement = (
	type: ObjectType,
	position: Point,
): React.ReactNode => {
	const component = objectRegistry.getComponent(type);
	if (!component) return null;

	const doc = createObjectDoc(type, position);
	const ghostState = objectRegistry.toState(doc);
	ghostState.id = GHOST_ID;

	return React.createElement(component, ghostState);
};

const DragGhostComponent: React.FC<DragGhostProps> = ({
	pendingShapeType,
	ghostPosition,
}) => {
	if (!pendingShapeType || !ghostPosition) {
		return null;
	}

	return (
		<g opacity={0.5} pointerEvents="none">
			{createGhostElement(pendingShapeType, ghostPosition)}
		</g>
	);
};

export const DragGhost = memo(DragGhostComponent);
