import type { CanvasRegistries } from "./CanvasRegistries";
import { defineObject } from "../../plugin/ObjectTypeDefinition";
import type {
	AnyObjectTypeDefinition,
	ObjectTypeDefinition,
} from "../../plugin/ObjectTypeDefinition";
import { Connector } from "../../presentations/objects/connections/Connector";
import {
	Ellipse,
	calcEllipseTextRegion,
} from "../../presentations/objects/primitives/Ellipse";
import { Polygon } from "../../presentations/objects/primitives/Polygon";
import { Polyline } from "../../presentations/objects/primitives/Polyline";
import { Rect } from "../../presentations/objects/primitives/Rect";
import { Svg } from "../../presentations/objects/primitives/Svg";
import { ConnectorExtraStyleProperties } from "../../schemas/objects/connections/connector/ConnectorDoc";
import type { ObjectType } from "../../schemas/objects/types/ObjectType";
import { builtinObjectDocDefinitions } from "../../schemas/registry/builtinObjectDocDefinitions";
import {
	connectorToDoc,
	connectorToState,
} from "../../states/objects/connections/connector/ConnectorMapper";
import { isValidConnectorState } from "../../states/objects/connections/connector/validateConnectorState";
import {
	ellipseToDoc,
	ellipseToState,
} from "../../states/objects/primitives/ellipse/EllipseMapper";
import type { EllipseState } from "../../states/objects/primitives/ellipse/EllipseState";
import { isValidEllipseState } from "../../states/objects/primitives/ellipse/validateEllipseState";
import {
	groupToDoc,
	groupToState,
} from "../../states/objects/primitives/group/GroupMapper";
import { isValidGroupState } from "../../states/objects/primitives/group/validateGroupState";
import {
	polygonToDoc,
	polygonToState,
} from "../../states/objects/primitives/polygon/PolygonMapper";
import { isValidPolygonState } from "../../states/objects/primitives/polygon/validatePolygonState";
import {
	polylineToDoc,
	polylineToState,
} from "../../states/objects/primitives/polyline/PolylineMapper";
import { isValidPolylineState } from "../../states/objects/primitives/polyline/validatePolylineState";
import {
	rectToDoc,
	rectToState,
} from "../../states/objects/primitives/rect/RectMapper";
import type { RectState } from "../../states/objects/primitives/rect/RectState";
import { isValidRectState } from "../../states/objects/primitives/rect/validateRectState";
import {
	svgToDoc,
	svgToState,
} from "../../states/objects/primitives/svg/SvgMapper";
import type { SvgState } from "../../states/objects/primitives/svg/SvgState";
import { isValidSvgState } from "../../states/objects/primitives/svg/validateSvgState";
import { createFrameBehavior } from "../behaviors/base/FrameController";
import {
	moveByDelta as connectorMoveByDelta,
	rotateByGroup as connectorRotateByGroup,
	transformByGroup as connectorTransformByGroup,
} from "../behaviors/connections/ConnectorController";
import {
	moveByDelta as groupMoveByDelta,
	rotateByGroup as groupRotateByGroup,
	transformByGroup as groupTransformByGroup,
} from "../behaviors/primitives/GroupController";
import {
	moveByDelta as polygonMoveByDelta,
	rotateByGroup as polygonRotateByGroup,
	transformByGroup as polygonTransformByGroup,
} from "../behaviors/primitives/PolygonController";
import {
	moveByDelta as polylineMoveByDelta,
	rotateByGroup as polylineRotateByGroup,
	transformByGroup as polylineTransformByGroup,
} from "../behaviors/primitives/PolylineController";
import {
	LabelBackgroundColorMenu,
	LabelBoldMenu,
	LabelBorderColorMenu,
	LabelBorderStyleMenu,
	LabelFontColorMenu,
	LabelFontSizeMenu,
} from "../ui/menu/ObjectMenu/items/LabelStyleMenu";
import { RoutingMenu } from "../ui/menu/ObjectMenu/items/RoutingMenu";
import { createDefaultMenu } from "../ui/menu/ObjectMenu/utils/createDefaultMenu";
import { EllipseStencils } from "../ui/objects/primitives/EllipseStencils";
import { PolygonStencils } from "../ui/objects/primitives/PolygonStencils";
import { PolylineStencils } from "../ui/objects/primitives/PolylineStencils";
import { RectStencils } from "../ui/objects/primitives/RectStencils";

/**
 * Data-only description of every object type. `createCanvasRegistries` applies a
 * chosen subset of these to a fresh bundle; `initializeObjectRegistry` applies
 * all of them to its target bundle.
 */
export const ALL_OBJECT_DEFINITIONS: Record<ObjectType, ObjectTypeDefinition> =
	{
		rect: defineObject({
			...builtinObjectDocDefinitions.rect,
			mapper: { toDoc: rectToDoc, toState: rectToState },
			stateValidator: isValidRectState,
			component: Rect,
			behavior: createFrameBehavior<RectState>(),
			stencils: RectStencils,
		}),

		ellipse: defineObject({
			...builtinObjectDocDefinitions.ellipse,
			mapper: { toDoc: ellipseToDoc, toState: ellipseToState },
			stateValidator: isValidEllipseState,
			component: Ellipse,
			textRegion: calcEllipseTextRegion,
			behavior: createFrameBehavior<EllipseState>(),
			stencils: EllipseStencils,
		}),

		group: defineObject({
			...builtinObjectDocDefinitions.group,
			mapper: { toDoc: groupToDoc, toState: groupToState },
			stateValidator: isValidGroupState,
			component: () => null,
			behavior: {
				moveByDelta: groupMoveByDelta,
				transformByGroup: groupTransformByGroup,
				rotateByGroup: groupRotateByGroup,
			},
		}),

		polygon: defineObject({
			...builtinObjectDocDefinitions.polygon,
			mapper: { toDoc: polygonToDoc, toState: polygonToState },
			stateValidator: isValidPolygonState,
			component: Polygon,
			behavior: {
				moveByDelta: polygonMoveByDelta,
				transformByGroup: polygonTransformByGroup,
				rotateByGroup: polygonRotateByGroup,
			},
			stencils: PolygonStencils,
		}),

		polyline: defineObject({
			...builtinObjectDocDefinitions.polyline,
			mapper: { toDoc: polylineToDoc, toState: polylineToState },
			stateValidator: isValidPolylineState,
			component: Polyline,
			behavior: {
				moveByDelta: polylineMoveByDelta,
				transformByGroup: polylineTransformByGroup,
				rotateByGroup: polylineRotateByGroup,
			},
			stencils: PolylineStencils,
		}),

		connector: defineObject({
			...builtinObjectDocDefinitions.connector,
			mapper: { toDoc: connectorToDoc, toState: connectorToState },
			stateValidator: isValidConnectorState,
			component: Connector,
			behavior: {
				moveByDelta: connectorMoveByDelta,
				transformByGroup: connectorTransformByGroup,
				rotateByGroup: connectorRotateByGroup,
			},
			extraStyleProperties: ConnectorExtraStyleProperties,
			menu: [
				{
					id: "arrowHead",
					items: [{ type: "arrowHead" }],
				},
				// Self-loops are orthogonal-only, so RoutingMenu renders null.
				// The resulting empty section is collapsed via ObjectMenuSection's `:empty`.
				{
					id: "routing",
					items: [
						{ type: "custom", id: "connector-routing", component: RoutingMenu },
					],
				},
				{
					id: "line",
					items: [{ type: "lineColor" }, { type: "lineStyle" }],
				},
				// Label styles. Each item renders null while the connector has no label text,
				// so both sections collapse via ObjectMenuSection's `:empty`.
				// Following the shapes, split into background/border (style) and text (text) sections.
				{
					id: "label-style",
					items: [
						{
							type: "custom",
							id: "label-bg-color",
							component: LabelBackgroundColorMenu,
						},
						{
							type: "custom",
							id: "label-border-color",
							component: LabelBorderColorMenu,
						},
						{
							type: "custom",
							id: "label-border-style",
							component: LabelBorderStyleMenu,
						},
					],
				},
				{
					id: "label-text",
					items: [
						{
							type: "custom",
							id: "label-font-size",
							component: LabelFontSizeMenu,
						},
						{
							type: "custom",
							id: "label-font-color",
							component: LabelFontColorMenu,
						},
						{ type: "custom", id: "label-bold", component: LabelBoldMenu },
					],
				},
			],
		}),

		// SVG is not created from the StencilLibrary (only added via AI / direct .jis.json authoring).
		// Therefore factory / stencils are not registered.
		svg: defineObject({
			...builtinObjectDocDefinitions.svg,
			mapper: { toDoc: svgToDoc, toState: svgToState },
			stateValidator: isValidSvgState,
			component: Svg,
			behavior: createFrameBehavior<SvgState>(),
		}),
	};

/**
 * Registers a single object type described by `definition` across all registries
 * in the given bundle (mapper, component, text region, behavior, state validator,
 * menu), and optionally its factory / stencils.
 */
export const applyObjectDefinition = (
	registries: CanvasRegistries,
	type: ObjectType,
	definition: AnyObjectTypeDefinition,
): void => {
	registries.objectMapper.register(
		type,
		definition.mapper,
		definition.features,
	);
	registries.objectComponent.register(type, definition.component);
	if (definition.svgDefs) {
		registries.objectSvgDefs.register(type, definition.svgDefs);
	}
	if (definition.textRegion) {
		registries.objectTextRegion.register(type, definition.textRegion);
	}
	if (definition.textEditOverflow) {
		registries.objectTextEditOverflow.register(
			type,
			definition.textEditOverflow,
		);
	}
	if (definition.outline) {
		registries.objectOutline.register(type, definition.outline);
	}
	if (definition.anchorRegion) {
		registries.objectAnchorRegion.register(type, definition.anchorRegion);
	}
	if (definition.extraConnectPoints) {
		registries.objectExtraConnectPoints.register(
			type,
			definition.extraConnectPoints,
		);
	}
	if (definition.geometryKey) {
		registries.objectGeometryKey.register(type, definition.geometryKey);
	}
	if (definition.visualBounds) {
		registries.objectVisualBounds.register(type, definition.visualBounds);
	}
	registries.objectBehavior.register(type, definition.behavior);
	registries.objectStateValidator.register(type, definition.stateValidator);
	registries.objectMenu.register(
		type,
		definition.menu ?? createDefaultMenu(definition.features),
	);
	if (definition.selectionControls) {
		registries.selectionControl.register(type, definition.selectionControls);
	}
	if (definition.extraStyleProperties) {
		registries.styleProperty.registerExtras(
			type,
			definition.extraStyleProperties,
		);
	}

	if (definition.factory) {
		registries.objectFactory.register(type, definition.factory);
	} else if (definition.stencils) {
		throw new Error(
			`applyObjectDefinition: object type "${type}" declares stencils but no factory (click-placement and drag-drawing both require a factory)`,
		);
	}
	definition.stencils?.forEach((preset) => {
		registries.stencil.register(preset);
	});
};

/**
 * Clears every object registry in the bundle and re-registers all object types.
 *
 * The doc validators (objectDocValidatorRegistry) are not initialized here.
 * Their registrations are used only during parse-time validation, and
 * parseCanvasText lazily initializes them when needed
 * (schemas/registry/initializeObjectDocValidatorRegistry).
 *
 * @param registries Target bundle to populate.
 */
export const initializeObjectRegistry = (
	registries: CanvasRegistries,
): void => {
	registries.objectMapper.clear();
	registries.objectComponent.clear();
	registries.objectSvgDefs.clear();
	registries.objectTextRegion.clear();
	registries.objectTextEditOverflow.clear();
	registries.objectOutline.clear();
	registries.objectAnchorRegion.clear();
	registries.objectExtraConnectPoints.clear();
	registries.objectGeometryKey.clear();
	registries.objectVisualBounds.clear();
	registries.objectBehavior.clear();
	registries.objectStateValidator.clear();
	registries.objectMenu.clear();
	registries.selectionControl.clear();
	registries.objectFactory.clear();
	registries.stencil.clear();
	registries.styleProperty.clearExtras();

	for (const [type, definition] of Object.entries(ALL_OBJECT_DEFINITIONS)) {
		applyObjectDefinition(registries, type, definition);
	}
};
