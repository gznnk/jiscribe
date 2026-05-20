import type { FC } from "react";

import { Sticky } from "../../presentations/objects/annotations/Sticky";
import { Connector } from "../../presentations/objects/connections/Connector";
import { objectComponentRegistry } from "../../presentations/objects/ObjectComponentRegistry";
import { Ellipse } from "../../presentations/objects/primitives/Ellipse";
import { Polygon } from "../../presentations/objects/primitives/Polygon";
import { Polyline } from "../../presentations/objects/primitives/Polyline";
import { Rect } from "../../presentations/objects/primitives/Rect";
import { objectDocValidatorRegistry } from "../../schemas/canvas/validators/ObjectDocValidatorRegistry";
import type { ObjectDocValidateFn } from "../../schemas/canvas/validators/ObjectDocValidatorRegistry";
import {
	validateConnectorDoc,
	validateEllipseDoc,
	validateGroupDoc,
	validatePolygonDoc,
	validatePolylineDoc,
	validateRectDoc,
	validateStickyDoc,
} from "../../schemas/canvas/validators/objectDocValidators";
import { StickyFeatures } from "../../schemas/objects/annotations/StickyDoc";
import type { ObjectDoc } from "../../schemas/objects/base/ObjectDoc";
import { ConnectorFeatures } from "../../schemas/objects/connections/ConnectorDoc";
import { EllipseFeatures } from "../../schemas/objects/primitives/EllipseDoc";
import { GroupFeatures } from "../../schemas/objects/primitives/GroupDoc";
import { PolygonFeatures } from "../../schemas/objects/primitives/PolygonDoc";
import { PolylineFeatures } from "../../schemas/objects/primitives/PolylineDoc";
import { RectFeatures } from "../../schemas/objects/primitives/RectDoc";
import type { ObjectFeatures } from "../../schemas/objects/types/ObjectFeatures";
import type { ObjectType } from "../../schemas/objects/types/ObjectType";
import {
	stickyToDoc,
	stickyToState,
} from "../../states/objects/annotations/sticky/StickyMapper";
import type { StickyState } from "../../states/objects/annotations/sticky/StickyState";
import type { ObjectMapperType } from "../../states/objects/base/MapperTypes";
import type { ObjectState } from "../../states/objects/base/ObjectState";
import {
	connectorToDoc,
	connectorToState,
} from "../../states/objects/connections/connector/ConnectorMapper";
import { objectMapperRegistry } from "../../states/objects/ObjectMapperRegistry";
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
import { objectBehaviorRegistry } from "../gestures/registry/ObjectBehaviorRegistry";
import type { ObjectBehaviorEntry } from "../gestures/registry/ObjectBehaviorTypes";
import { objectMenuRegistry } from "../ui/menu/ObjectMenu/ObjectMenuRegistry";
import type { MenuSectionFactory } from "../ui/menu/ObjectMenu/ObjectMenuTypes";

/**
 * Initialize all object registries with definitions for every object type.
 */
export const initializeObjectRegistry = (): void => {
	objectMapperRegistry.clear();
	objectComponentRegistry.clear();
	objectBehaviorRegistry.clear();
	objectDocValidatorRegistry.clear();
	objectMenuRegistry.clear();

	registerObject(
		"rect",
		{ toDoc: rectToDoc, toState: rectToState },
		RectFeatures,
		Rect,
		{
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
		validateRectDoc,
	);

	registerObject(
		"ellipse",
		{ toDoc: ellipseToDoc, toState: ellipseToState },
		EllipseFeatures,
		Ellipse,
		{
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
		validateEllipseDoc,
	);

	registerObject(
		"group",
		{ toDoc: groupToDoc, toState: groupToState },
		GroupFeatures,
		() => null,
		{
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
		validateGroupDoc,
	);

	registerObject(
		"polygon",
		{ toDoc: polygonToDoc, toState: polygonToState },
		PolygonFeatures,
		Polygon,
		{
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
		validatePolygonDoc,
	);

	registerObject(
		"polyline",
		{ toDoc: polylineToDoc, toState: polylineToState },
		PolylineFeatures,
		Polyline,
		{
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
		validatePolylineDoc,
	);

	registerObject(
		"connector",
		{ toDoc: connectorToDoc, toState: connectorToState },
		ConnectorFeatures,
		Connector,
		{
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
		validateConnectorDoc,
	);

	registerObject(
		"sticky",
		{ toDoc: stickyToDoc, toState: stickyToState },
		StickyFeatures,
		Sticky,
		{
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
		validateStickyDoc,
	);
};

export const registerObject = <
	TDoc extends ObjectDoc,
	TState extends ObjectState,
>(
	type: ObjectType,
	mapper: ObjectMapperType<TDoc, TState>,
	features: ObjectFeatures,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	component: FC<any>,
	behavior: ObjectBehaviorEntry<TState>,
	menuFactory: MenuSectionFactory<TState>,
	validate: ObjectDocValidateFn,
): void => {
	objectMapperRegistry.register(type, mapper, features);
	objectComponentRegistry.register(type, component);
	objectBehaviorRegistry.register(type, behavior);
	objectDocValidatorRegistry.register(type, validate);
	objectMenuRegistry.register(type, menuFactory);
};
