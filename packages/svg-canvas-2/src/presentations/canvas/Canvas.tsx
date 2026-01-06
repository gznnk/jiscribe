import { memo } from "react";

import {
	ellipseToDoc,
	ellipseToState,
} from "../../operations/objects/primitives/Ellipse/EllipseMapper";
import {
	rectToDoc,
	rectToState,
} from "../../operations/objects/primitives/Rect/RectMapper";
import { objectRegistry } from "../../registry/ObjectRegistry";
import type { CanvasState } from "../../states/canvas/CanvasState";
import { Ellipse } from "../objects/primitives/Ellipse/Ellipse";
import { Rect } from "../objects/primitives/Rect/Rect";

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

type CanvasProps = CanvasState;

const CanvasComponent: React.FC<CanvasProps> = ({ objects, rootIds }) => {
	const renderObjects = () => {
		return rootIds.map((id) => {
			const objState = objects[id];
			if (!objState) return null;
			const ObjectComponent = objectRegistry.getComponent(objState.type);
			if (!ObjectComponent) return null;
			return <ObjectComponent key={id} {...objState} />;
		});
	};

	return (
		<svg width={1000} height={1000} style={{ backgroundColor: "#fff" }}>
			{renderObjects()}
		</svg>
	);
};
export const Canvas = memo(CanvasComponent);
