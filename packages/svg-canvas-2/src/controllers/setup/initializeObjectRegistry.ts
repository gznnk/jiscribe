import {
	connectorToDoc,
	connectorToState,
} from "../../states/objects/connections/connector/ConnectorMapper";
import {
	moveByDelta as connectorMoveByDelta,
	transformByGroup as connectorTransformByGroup,
} from "../gestures/handlers/objects/connections/ConnectorController";
import { EllipseEventHandler } from "../../operations/objects/primitives/Ellipse/EllipseEventHandler";
import {
	ellipseToDoc,
	ellipseToState,
} from "../../states/objects/primitives/ellipse/EllipseMapper";
import {
	moveByDelta as ellipseMoveByDelta,
	transformByGroup as ellipseTransformByGroup,
} from "../gestures/handlers/objects/primitives/EllipseController";
import { GroupEventHandler } from "../../operations/objects/primitives/Group/GroupEventHandler";
import {
	groupToDoc,
	groupToState,
} from "../../states/objects/primitives/group/GroupMapper";
import {
	moveByDelta as groupMoveByDelta,
	transformByGroup as groupTransformByGroup,
} from "../gestures/handlers/objects/primitives/GroupController";
import { PolylineEventHandler } from "../../operations/objects/primitives/Polyline/PolylineEventHandler";
import {
	polylineToDoc,
	polylineToState,
} from "../../states/objects/primitives/polyline/PolylineMapper";
import {
	moveByDelta as polylineMoveByDelta,
	transformByGroup as polylineTransformByGroup,
} from "../gestures/handlers/objects/primitives/PolylineController";
import { RectEventHandler } from "../../operations/objects/primitives/Rect/RectEventHandler";
import {
	rectToDoc,
	rectToState,
} from "../../states/objects/primitives/rect/RectMapper";
import {
	moveByDelta as rectMoveByDelta,
	transformByGroup as rectTransformByGroup,
} from "../gestures/handlers/objects/primitives/RectController";
import { Connector } from "../../presentations/objects/connections/Connector";
import { Ellipse } from "../../presentations/objects/primitives/Ellipse";
import { Polyline } from "../../presentations/objects/primitives/Polyline";
import { Rect } from "../../presentations/objects/primitives/Rect";
import { objectRegistry } from "../../registry/ObjectRegistry";
import { ConnectorFeatures } from "../../schemas/objects/connections/ConnectorDoc";
import { EllipseFeatures } from "../../schemas/objects/primitives/EllipseDoc";
import { GroupFeatures } from "../../schemas/objects/primitives/GroupDoc";
import { PolylineFeatures } from "../../schemas/objects/primitives/PolylineDoc";
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
		moveByDelta: rectMoveByDelta,
		transformByGroup: rectTransformByGroup,
	});

	objectRegistry.register("ellipse", {
		features: EllipseFeatures,
		mapper: {
			toDoc: ellipseToDoc,
			toState: ellipseToState,
		},
		eventHandler: EllipseEventHandler,
		component: Ellipse,
		moveByDelta: ellipseMoveByDelta,
		transformByGroup: ellipseTransformByGroup,
	});

	objectRegistry.register("group", {
		features: GroupFeatures,
		mapper: {
			toDoc: groupToDoc,
			toState: groupToState,
		},
		eventHandler: GroupEventHandler,
		component: () => null, // Groupはコンポーネントを持たない（再帰的に描画される）
		moveByDelta: groupMoveByDelta,
		transformByGroup: groupTransformByGroup,
	});

	objectRegistry.register("polyline", {
		features: PolylineFeatures,
		mapper: {
			toDoc: polylineToDoc,
			toState: polylineToState,
		},
		eventHandler: PolylineEventHandler,
		component: Polyline,
		moveByDelta: polylineMoveByDelta,
		transformByGroup: polylineTransformByGroup,
	});

	objectRegistry.register("connector", {
		features: ConnectorFeatures,
		mapper: {
			toDoc: connectorToDoc,
			toState: connectorToState,
		},
		eventHandler: {}, // Event handling not yet implemented
		component: Connector,
		moveByDelta: connectorMoveByDelta,
		transformByGroup: connectorTransformByGroup,
	});
};
