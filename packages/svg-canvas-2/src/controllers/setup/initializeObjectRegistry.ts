import {
	connectorToDoc,
	connectorToState,
} from "../../operations/objects/connections/Connector/ConnectorMapper";
import { connectorMoveByDelta } from "../../operations/objects/connections/Connector/ConnectorMoveByDelta";
import { EllipseEventHandler } from "../../operations/objects/primitives/Ellipse/EllipseEventHandler";
import {
	ellipseToDoc,
	ellipseToState,
} from "../../operations/objects/primitives/Ellipse/EllipseMapper";
import { ellipseMoveByDelta } from "../../operations/objects/primitives/Ellipse/EllipseMoveByDelta";
import { GroupEventHandler } from "../../operations/objects/primitives/Group/GroupEventHandler";
import {
	groupToDoc,
	groupToState,
} from "../../operations/objects/primitives/Group/GroupMapper";
import { groupMoveByDelta } from "../../operations/objects/primitives/Group/GroupMoveByDelta";
import { PolylineEventHandler } from "../../operations/objects/primitives/Polyline/PolylineEventHandler";
import {
	polylineToDoc,
	polylineToState,
} from "../../operations/objects/primitives/Polyline/PolylineMapper";
import { polylineMoveByDelta } from "../../operations/objects/primitives/Polyline/PolylineMoveByDelta";
import { RectEventHandler } from "../../operations/objects/primitives/Rect/RectEventHandler";
import {
	rectToDoc,
	rectToState,
} from "../../operations/objects/primitives/Rect/RectMapper";
import { rectMoveByDelta } from "../../operations/objects/primitives/Rect/RectMoveByDelta";
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
	});
};
