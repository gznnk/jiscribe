import { Sticky } from "../../presentations/objects/annotations/Sticky";
import { Connector } from "../../presentations/objects/connections/Connector";
import { Ellipse } from "../../presentations/objects/primitives/Ellipse";
import { Polygon } from "../../presentations/objects/primitives/Polygon";
import { Polyline } from "../../presentations/objects/primitives/Polyline";
import { Rect } from "../../presentations/objects/primitives/Rect";
import { objectRegistry } from "../../registry/ObjectRegistry";
import type { ObjectDefinition } from "../../registry/ObjectRegistryTypes";
import { StickyFeatures } from "../../schemas/objects/annotations/StickyDoc";
import type { ObjectDoc } from "../../schemas/objects/base/ObjectDoc";
import { ConnectorFeatures } from "../../schemas/objects/connections/ConnectorDoc";
import { EllipseFeatures } from "../../schemas/objects/primitives/EllipseDoc";
import { GroupFeatures } from "../../schemas/objects/primitives/GroupDoc";
import { PolygonFeatures } from "../../schemas/objects/primitives/PolygonDoc";
import { PolylineFeatures } from "../../schemas/objects/primitives/PolylineDoc";
import { RectFeatures } from "../../schemas/objects/primitives/RectDoc";
import type { ObjectType } from "../../schemas/objects/types/ObjectType";
import {
	stickyToDoc,
	stickyToState,
} from "../../states/objects/annotations/sticky/StickyMapper";
import type { StickyState } from "../../states/objects/annotations/sticky/StickyState";
import type { ObjectState } from "../../states/objects/base/ObjectState";
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
	polygonToDoc,
	polygonToState,
} from "../../states/objects/primitives/polygon/PolygonMapper";
import {
	polylineToDoc,
	polylineToState,
} from "../../states/objects/primitives/polyline/PolylineMapper";
import {
	rectToDoc,
	rectToState,
} from "../../states/objects/primitives/rect/RectMapper";
import {
	moveByDelta as stickyMoveByDelta,
	rotateByGroup as stickyRotateByGroup,
	transformByGroup as stickyTransformByGroup,
} from "../gestures/handlers/objects/annotations/StickyController";
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
	moveByDelta as polygonMoveByDelta,
	rotateByGroup as polygonRotateByGroup,
	transformByGroup as polygonTransformByGroup,
} from "../gestures/handlers/objects/primitives/PolygonController";
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
import { objectMenuRegistry } from "../ui/menu/ObjectMenu/ObjectMenuRegistry";
import type { MenuSectionFactory } from "../ui/menu/ObjectMenu/ObjectMenuTypes";

/**
 * Initialize the ObjectRegistry and MenuRegistry with all object type definitions.
 */
export const initializeObjectRegistry = (): void => {
	objectRegistry.clear();
	objectMenuRegistry.clear();

	registerObject(
		"rect",
		{
			features: RectFeatures,
			mapper: { toDoc: rectToDoc, toState: rectToState },
			component: Rect,
			moveByDelta: rectMoveByDelta,
			transformByGroup: rectTransformByGroup,
			rotateByGroup: rectRotateByGroup,
		},
		(_state) => [
			{
				id: "style",
				items: [
					{ type: "backgroundColor" },
					{ type: "borderColor" },
					{ type: "borderStyle", radius: true },
				],
			},
			{
				id: "text",
				items: [{ type: "fontStyle" }, { type: "textAlignment" }],
			},
			{
				id: "transform",
				items: [{ type: "aspectRatio" }],
			},
		],
	);

	registerObject(
		"ellipse",
		{
			features: EllipseFeatures,
			mapper: { toDoc: ellipseToDoc, toState: ellipseToState },
			component: Ellipse,
			moveByDelta: ellipseMoveByDelta,
			transformByGroup: ellipseTransformByGroup,
			rotateByGroup: ellipseRotateByGroup,
		},
		(_state) => [
			{
				id: "style",
				items: [
					{ type: "backgroundColor" },
					{ type: "borderColor" },
					{ type: "borderStyle", radius: false },
				],
			},
			{
				id: "text",
				items: [{ type: "fontStyle" }, { type: "textAlignment" }],
			},
			{
				id: "transform",
				items: [{ type: "aspectRatio" }],
			},
		],
	);

	registerObject(
		"group",
		{
			features: GroupFeatures,
			mapper: { toDoc: groupToDoc, toState: groupToState },
			component: () => null,
			moveByDelta: groupMoveByDelta,
			transformByGroup: groupTransformByGroup,
			rotateByGroup: groupRotateByGroup,
		},
		(_state) => [
			{
				id: "transform",
				items: [{ type: "aspectRatio" }],
			},
		],
	);

	registerObject(
		"polygon",
		{
			features: PolygonFeatures,
			mapper: { toDoc: polygonToDoc, toState: polygonToState },
			component: Polygon,
			moveByDelta: polygonMoveByDelta,
			transformByGroup: polygonTransformByGroup,
			rotateByGroup: polygonRotateByGroup,
		},
		(_state) => [
			{
				id: "style",
				items: [
					{ type: "backgroundColor" },
					{ type: "borderColor" },
					{ type: "borderStyle", radius: false },
				],
			},
		],
	);

	registerObject(
		"polyline",
		{
			features: PolylineFeatures,
			mapper: { toDoc: polylineToDoc, toState: polylineToState },
			component: Polyline,
			moveByDelta: polylineMoveByDelta,
			transformByGroup: polylineTransformByGroup,
			rotateByGroup: polylineRotateByGroup,
		},
		(_state) => [
			{
				id: "arrowHead",
				items: [{ type: "arrowHead" }],
			},
			{
				id: "line",
				items: [{ type: "lineColor" }, { type: "lineStyle" }],
			},
		],
	);

	registerObject(
		"connector",
		{
			features: ConnectorFeatures,
			mapper: { toDoc: connectorToDoc, toState: connectorToState },
			component: Connector,
			moveByDelta: connectorMoveByDelta,
			transformByGroup: connectorTransformByGroup,
			rotateByGroup: connectorRotateByGroup,
		},
		(_state) => [
			{
				id: "arrowHead",
				items: [{ type: "arrowHead" }],
			},
			{
				id: "line",
				items: [{ type: "lineColor" }, { type: "lineStyle" }],
			},
		],
	);

	registerObject(
		"sticky",
		{
			features: StickyFeatures,
			mapper: { toDoc: stickyToDoc, toState: stickyToState },
			component: Sticky,
			moveByDelta: stickyMoveByDelta,
			transformByGroup: stickyTransformByGroup,
			rotateByGroup: stickyRotateByGroup,
		},
		(_state: StickyState) => [
			{
				id: "style",
				items: [{ type: "backgroundColor" }],
			},
			{
				id: "text",
				items: [{ type: "fontStyle" }, { type: "textAlignment" }],
			},
			{
				id: "transform",
				items: [{ type: "aspectRatio" }],
			},
		],
	);
};

export const registerObject = <
	TDoc extends ObjectDoc,
	TState extends ObjectState,
>(
	type: ObjectType,
	definition: ObjectDefinition<TDoc, TState>,
	menuFactory: MenuSectionFactory<TState>,
): void => {
	objectRegistry.register(type, definition);
	objectMenuRegistry.register(type, menuFactory);
};
