import { EllipseEventHandler } from "../../operations/objects/primitives/Ellipse/EllipseEventHandler";
import {
	ellipseToDoc,
	ellipseToState,
} from "../../operations/objects/primitives/Ellipse/EllipseMapper";
import { GroupEventHandler } from "../../operations/objects/primitives/Group/GroupEventHandler";
import {
	groupToDoc,
	groupToState,
} from "../../operations/objects/primitives/Group/GroupMapper";
import { RectEventHandler } from "../../operations/objects/primitives/Rect/RectEventHandler";
import {
	rectToDoc,
	rectToState,
} from "../../operations/objects/primitives/Rect/RectMapper";
import { Ellipse } from "../../presentations/objects/primitives/Ellipse";
import { Rect } from "../../presentations/objects/primitives/Rect";
import { objectRegistry } from "../../registry/ObjectRegistry";
import { EllipseFeatures } from "../../schemas/objects/primitives/EllipseDoc";
import { GroupFeatures } from "../../schemas/objects/primitives/GroupDoc";
import { RectFeatures } from "../../schemas/objects/primitives/RectDoc";

/**
 * Initialize the ObjectRegistry with all object type definitions.
 * Registers mappers, event handlers, features, and components for each object type.
 */
export const initializeObjectRegistry = (): void => {
	objectRegistry.clear();

	objectRegistry.register("rect", {
		features: RectFeatures,
		mapper: {
			toDoc: rectToDoc,
			toState: rectToState,
		},
		eventHandler: RectEventHandler,
		component: Rect,
	});

	objectRegistry.register("ellipse", {
		features: EllipseFeatures,
		mapper: {
			toDoc: ellipseToDoc,
			toState: ellipseToState,
		},
		eventHandler: EllipseEventHandler,
		component: Ellipse,
	});

	objectRegistry.register("group", {
		features: GroupFeatures,
		mapper: {
			toDoc: groupToDoc,
			toState: groupToState,
		},
		eventHandler: GroupEventHandler,
		component: () => null, // Groupはコンポーネントを持たない（再帰的に描画される）
	});
};
