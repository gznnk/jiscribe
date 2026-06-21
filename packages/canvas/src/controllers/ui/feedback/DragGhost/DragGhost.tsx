import type { Point } from "@workspace/geometry";
import React, { memo } from "react";

import { objectComponentRegistry } from "../../../../presentations/objects/registry/ObjectComponentRegistry";
import type { ShapePreset } from "../../../../schemas/objects/types/ShapePreset";
import { createObjectDoc } from "../../../../schemas/objects/utils/createObjectDoc";
import { objectMapperRegistry } from "../../../../states/registry/ObjectMapperRegistry";
import type { CanvasControllerState } from "../../../CanvasTypes";

type DragGhostProps = {
	shapeLibraryDrag: CanvasControllerState["shapeLibraryDrag"];
};

const GHOST_ID = "drag-ghost";

/**
 * ゴースト要素を生成する。
 * レンダル中にコンポーネント変数を生成しないよう、React.createElement を使用する。
 */
const createGhostElement = (
	preset: ShapePreset,
	position: Point,
): React.ReactNode => {
	const component = objectComponentRegistry.get(preset.objectType);
	if (!component) {
		return null;
	}

	const doc = createObjectDoc(
		preset.objectType,
		position,
		preset.defaultOverrides,
	);
	const ghostState = objectMapperRegistry.toState(doc);
	ghostState.id = GHOST_ID;

	return React.createElement(component, ghostState);
};

const DragGhostComponent: React.FC<DragGhostProps> = ({ shapeLibraryDrag }) => {
	if (!shapeLibraryDrag) {
		return null;
	}

	return (
		<g opacity={0.5} pointerEvents="none">
			{createGhostElement(
				shapeLibraryDrag.preset,
				shapeLibraryDrag.ghostPosition,
			)}
		</g>
	);
};

export const DragGhost = memo(DragGhostComponent);
