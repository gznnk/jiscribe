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
import {
	connectorToDoc,
	connectorToState,
} from "../../states/objects/connections/connector/ConnectorMapper";
import {
	ellipseToDoc,
	ellipseToState,
} from "../../states/objects/primitives/ellipse/EllipseMapper";
import {
	groupToDoc,
	groupToState,
} from "../../states/objects/primitives/group/GroupMapper";
import {
	polylineToDoc,
	polylineToState,
} from "../../states/objects/primitives/polyline/PolylineMapper";
import {
	rectToDoc,
	rectToState,
} from "../../states/objects/primitives/rect/RectMapper";
import {
	moveByDelta as connectorMoveByDelta,
	rotateByGroup as connectorRotateByGroup,
	transformByGroup as connectorTransformByGroup,
} from "../gestures/handlers/objects/connections/ConnectorController";
import {
	moveByDelta as ellipseMoveByDelta,
	rotateByGroup as ellipseRotateByGroup,
	transformByGroup as ellipseTransformByGroup,
} from "../gestures/handlers/objects/primitives/EllipseController";
import {
	moveByDelta as groupMoveByDelta,
	rotateByGroup as groupRotateByGroup,
	transformByGroup as groupTransformByGroup,
} from "../gestures/handlers/objects/primitives/GroupController";
import {
	moveByDelta as polylineMoveByDelta,
	rotateByGroup as polylineRotateByGroup,
	transformByGroup as polylineTransformByGroup,
} from "../gestures/handlers/objects/primitives/PolylineController";
import {
	moveByDelta as rectMoveByDelta,
	rotateByGroup as rectRotateByGroup,
	transformByGroup as rectTransformByGroup,
} from "../gestures/handlers/objects/primitives/RectController";

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
		component: Rect,
		moveByDelta: rectMoveByDelta,
		transformByGroup: rectTransformByGroup,
		rotateByGroup: rectRotateByGroup,
	});

	objectRegistry.register("ellipse", {
		features: EllipseFeatures,
		mapper: {
			toDoc: ellipseToDoc,
			toState: ellipseToState,
		},
		component: Ellipse,
		moveByDelta: ellipseMoveByDelta,
		transformByGroup: ellipseTransformByGroup,
		rotateByGroup: ellipseRotateByGroup,
	});

	objectRegistry.register("group", {
		features: GroupFeatures,
		mapper: {
			toDoc: groupToDoc,
			toState: groupToState,
		},
		component: () => null, // Groupはコンポーネントを持たない（再帰的に描画される）
		moveByDelta: groupMoveByDelta,
		transformByGroup: groupTransformByGroup,
		rotateByGroup: groupRotateByGroup,
	});

	objectRegistry.register("polyline", {
		features: PolylineFeatures,
		mapper: {
			toDoc: polylineToDoc,
			toState: polylineToState,
		},
		component: Polyline,
		moveByDelta: polylineMoveByDelta,
		transformByGroup: polylineTransformByGroup,
		rotateByGroup: polylineRotateByGroup,
	});

	objectRegistry.register("connector", {
		features: ConnectorFeatures,
		mapper: {
			toDoc: connectorToDoc,
			toState: connectorToState,
		},
		component: Connector,
		moveByDelta: connectorMoveByDelta,
		transformByGroup: connectorTransformByGroup,
		rotateByGroup: connectorRotateByGroup,
	});
};
