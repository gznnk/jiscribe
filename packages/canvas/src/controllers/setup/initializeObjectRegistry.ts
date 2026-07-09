import type { ComponentType, FC } from "react";

import type { CanvasRegistries } from "./CanvasRegistries";
import { singletonRegistries } from "./CanvasRegistries";
import { Sticky } from "../../presentations/objects/annotations/Sticky";
import { Connector } from "../../presentations/objects/connections/Connector";
import {
	Diamond,
	DiamondPreview,
} from "../../presentations/objects/primitives/Diamond";
import {
	Ellipse,
	EllipsePreview,
} from "../../presentations/objects/primitives/Ellipse";
import {
	Polygon,
	PolygonPreview,
} from "../../presentations/objects/primitives/Polygon";
import {
	Polyline,
	PolylinePreview,
} from "../../presentations/objects/primitives/Polyline";
import { Rect, RectPreview } from "../../presentations/objects/primitives/Rect";
import { Svg } from "../../presentations/objects/primitives/Svg";
import type { ShapePreviewRenderer } from "../../presentations/objects/registry/ShapePreviewTypes";
import { StickyFeatures } from "../../schemas/objects/annotations/sticky/StickyDoc";
import { StickyShapeFactory } from "../../schemas/objects/annotations/sticky/StickyShapeFactory";
import { StickyShapePresets } from "../../schemas/objects/annotations/sticky/StickyShapePresets";
import type { ObjectDoc } from "../../schemas/objects/base/ObjectDoc";
import { ConnectorFeatures } from "../../schemas/objects/connections/connector/ConnectorDoc";
import { DiamondFeatures } from "../../schemas/objects/primitives/diamond/DiamondDoc";
import { DiamondShapeFactory } from "../../schemas/objects/primitives/diamond/DiamondShapeFactory";
import { DiamondShapePresets } from "../../schemas/objects/primitives/diamond/DiamondShapePresets";
import { EllipseFeatures } from "../../schemas/objects/primitives/ellipse/EllipseDoc";
import { EllipseShapeFactory } from "../../schemas/objects/primitives/ellipse/EllipseShapeFactory";
import { EllipseShapePresets } from "../../schemas/objects/primitives/ellipse/EllipseShapePresets";
import { GroupFeatures } from "../../schemas/objects/primitives/group/GroupDoc";
import { PolygonFeatures } from "../../schemas/objects/primitives/polygon/PolygonDoc";
import { PolygonShapeFactory } from "../../schemas/objects/primitives/polygon/PolygonShapeFactory";
import { PolygonShapePresets } from "../../schemas/objects/primitives/polygon/PolygonShapePresets";
import { PolylineFeatures } from "../../schemas/objects/primitives/polyline/PolylineDoc";
import { PolylineShapeFactory } from "../../schemas/objects/primitives/polyline/PolylineShapeFactory";
import { PolylineShapePresets } from "../../schemas/objects/primitives/polyline/PolylineShapePresets";
import { RectFeatures } from "../../schemas/objects/primitives/rect/RectDoc";
import { RectShapeFactory } from "../../schemas/objects/primitives/rect/RectShapeFactory";
import { RectShapePresets } from "../../schemas/objects/primitives/rect/RectShapePresets";
import { SvgFeatures } from "../../schemas/objects/primitives/svg/SvgDoc";
import type { ObjectFeatures } from "../../schemas/objects/types/ObjectFeatures";
import type { ObjectType } from "../../schemas/objects/types/ObjectType";
import type { ShapeFactory } from "../../schemas/objects/types/ShapeFactory";
import type {
	ShapeIconProps,
	ShapePreset,
} from "../../schemas/objects/types/ShapePreset";
import {
	stickyToDoc,
	stickyToState,
} from "../../states/objects/annotations/sticky/StickyMapper";
import type { StickyState } from "../../states/objects/annotations/sticky/StickyState";
import { isValidStickyState } from "../../states/objects/annotations/sticky/validateStickyState";
import type { ObjectMapperType } from "../../states/objects/base/MapperTypes";
import type { ObjectState } from "../../states/objects/base/ObjectState";
import {
	connectorToDoc,
	connectorToState,
} from "../../states/objects/connections/connector/ConnectorMapper";
import { isValidConnectorState } from "../../states/objects/connections/connector/validateConnectorState";
import {
	diamondToDoc,
	diamondToState,
} from "../../states/objects/primitives/diamond/DiamondMapper";
import type { DiamondState } from "../../states/objects/primitives/diamond/DiamondState";
import { isValidDiamondState } from "../../states/objects/primitives/diamond/validateDiamondState";
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
import type { ObjectStateValidateFn } from "../../states/registry/ObjectStateValidatorRegistry";
import { createFrameBehavior } from "../gestures/handlers/objects/base/FrameController";
import {
	moveByDelta as connectorMoveByDelta,
	rotateByGroup as connectorRotateByGroup,
	transformByGroup as connectorTransformByGroup,
} from "../gestures/handlers/objects/connections/ConnectorController";
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
import type { ObjectBehaviorEntry } from "../gestures/registry/ObjectBehaviorTypes";
import { DiamondIcon } from "../ui/icons/DiamondIcon";
import { EllipseIcon } from "../ui/icons/EllipseIcon";
import { MarkdownRectIcon } from "../ui/icons/MarkdownRectIcon";
import { PolygonIcon } from "../ui/icons/PolygonIcon";
import { PolylineIcon } from "../ui/icons/PolylineIcon";
import { RectIcon } from "../ui/icons/RectIcon";
import { StickyIcon } from "../ui/icons/StickyIcon";
import {
	LabelBackgroundColorMenu,
	LabelBoldMenu,
	LabelBorderColorMenu,
	LabelBorderStyleMenu,
	LabelFontColorMenu,
	LabelFontSizeMenu,
} from "../ui/menu/ObjectMenu/items/LabelStyleMenu";
import { RoutingMenu } from "../ui/menu/ObjectMenu/items/RoutingMenu";
import { StickyColorMenu } from "../ui/menu/ObjectMenu/items/StickyColorMenu";
import type { MenuSectionFactory } from "../ui/menu/ObjectMenu/ObjectMenuTypes";

/**
 * Creation-related capabilities for the ShapeLibrary (shape palette).
 * Omitted for types not shown in the palette (group / connector).
 */
type ShapeLibraryRegistration = {
	/** Factory responsible for doc creation, dimensions, and bounds generation */
	factory?: ShapeFactory;
	/** Preview rendering during drag drawing (only for shapes that support bounds drawing) */
	previewRenderer?: ShapePreviewRenderer;
	/** Presets shown in the toolbar (multiple allowed per type) */
	presets?: ShapePreset[];
	/**
	 * Toolbar icon per preset ID.
	 * Injected into the corresponding preset at registration time.
	 */
	presetIcons?: Record<string, ComponentType<ShapeIconProps>>;
};

/**
 * The full description of a single object type across every registry
 * (mapper, component, behavior, state validator, menu) plus its optional
 * ShapeLibrary capabilities. Values are widened to the base state/doc types;
 * per-entry type-safety is enforced at definition site by `defineObject`.
 */
export type ObjectTypeDefinition = {
	mapper: ObjectMapperType;
	features: ObjectFeatures;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	component: FC<any>;
	behavior: ObjectBehaviorEntry;
	menuFactory: MenuSectionFactory<ObjectState>;
	validateState: ObjectStateValidateFn;
	shapeLibrary?: ShapeLibraryRegistration;
};

/**
 * Builds a single `ObjectTypeDefinition`, preserving per-type `TState` inference
 * at the definition site (mapper / behavior / menuFactory are checked together)
 * before widening to the base-typed record entry.
 */
const defineObject = <TDoc extends ObjectDoc, TState extends ObjectState>(def: {
	mapper: ObjectMapperType<TDoc, TState>;
	features: ObjectFeatures;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	component: FC<any>;
	behavior: ObjectBehaviorEntry<TState>;
	menuFactory: MenuSectionFactory<TState>;
	validateState: ObjectStateValidateFn;
	shapeLibrary?: ShapeLibraryRegistration;
}): ObjectTypeDefinition => def as unknown as ObjectTypeDefinition;

/**
 * Data-only description of every object type. `createCanvasRegistries` applies a
 * chosen subset of these to a fresh bundle; `initializeObjectRegistry` applies
 * all of them to its target bundle.
 */
export const ALL_OBJECT_DEFINITIONS: Record<ObjectType, ObjectTypeDefinition> =
	{
		rect: defineObject({
			mapper: { toDoc: rectToDoc, toState: rectToState },
			features: RectFeatures,
			component: Rect,
			behavior: createFrameBehavior<RectState>(),
			menuFactory: (_state) => [
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
			validateState: isValidRectState,
			shapeLibrary: {
				factory: RectShapeFactory,
				previewRenderer: RectPreview,
				presets: RectShapePresets,
				presetIcons: { rect: RectIcon, "rect-markdown": MarkdownRectIcon },
			},
		}),

		ellipse: defineObject({
			mapper: { toDoc: ellipseToDoc, toState: ellipseToState },
			features: EllipseFeatures,
			component: Ellipse,
			behavior: createFrameBehavior<EllipseState>(),
			menuFactory: (_state) => [
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
			validateState: isValidEllipseState,
			shapeLibrary: {
				factory: EllipseShapeFactory,
				previewRenderer: EllipsePreview,
				presets: EllipseShapePresets,
				presetIcons: { ellipse: EllipseIcon },
			},
		}),

		diamond: defineObject({
			mapper: { toDoc: diamondToDoc, toState: diamondToState },
			features: DiamondFeatures,
			component: Diamond,
			behavior: createFrameBehavior<DiamondState>(),
			menuFactory: (_state) => [
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
			validateState: isValidDiamondState,
			shapeLibrary: {
				factory: DiamondShapeFactory,
				previewRenderer: DiamondPreview,
				presets: DiamondShapePresets,
				presetIcons: { diamond: DiamondIcon },
			},
		}),

		group: defineObject({
			mapper: { toDoc: groupToDoc, toState: groupToState },
			features: GroupFeatures,
			component: () => null,
			behavior: {
				moveByDelta: groupMoveByDelta,
				transformByGroup: groupTransformByGroup,
				rotateByGroup: groupRotateByGroup,
			},
			menuFactory: (_state) => [
				{
					id: "transform",
					items: [{ type: "aspectRatio" }],
				},
			],
			validateState: isValidGroupState,
		}),

		polygon: defineObject({
			mapper: { toDoc: polygonToDoc, toState: polygonToState },
			features: PolygonFeatures,
			component: Polygon,
			behavior: {
				moveByDelta: polygonMoveByDelta,
				transformByGroup: polygonTransformByGroup,
				rotateByGroup: polygonRotateByGroup,
			},
			menuFactory: (_state) => [
				{
					id: "style",
					items: [
						{ type: "backgroundColor" },
						{ type: "borderColor" },
						{ type: "borderStyle", radius: false },
					],
				},
			],
			validateState: isValidPolygonState,
			shapeLibrary: {
				factory: PolygonShapeFactory,
				previewRenderer: PolygonPreview,
				presets: PolygonShapePresets,
				presetIcons: { polygon: PolygonIcon },
			},
		}),

		polyline: defineObject({
			mapper: { toDoc: polylineToDoc, toState: polylineToState },
			features: PolylineFeatures,
			component: Polyline,
			behavior: {
				moveByDelta: polylineMoveByDelta,
				transformByGroup: polylineTransformByGroup,
				rotateByGroup: polylineRotateByGroup,
			},
			menuFactory: (_state) => [
				{
					id: "arrowHead",
					items: [{ type: "arrowHead" }],
				},
				{
					id: "line",
					items: [{ type: "lineColor" }, { type: "lineStyle" }],
				},
			],
			validateState: isValidPolylineState,
			shapeLibrary: {
				factory: PolylineShapeFactory,
				previewRenderer: PolylinePreview,
				presets: PolylineShapePresets,
				presetIcons: { polyline: PolylineIcon },
			},
		}),

		connector: defineObject({
			mapper: { toDoc: connectorToDoc, toState: connectorToState },
			features: ConnectorFeatures,
			component: Connector,
			behavior: {
				moveByDelta: connectorMoveByDelta,
				transformByGroup: connectorTransformByGroup,
				rotateByGroup: connectorRotateByGroup,
			},
			menuFactory: (state) => [
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
				// Label styles. Shown only when a label (label.text) is present.
				// Following the shapes, split into background/border (style) and text (text) sections.
				...(state.label?.text
					? [
							{
								id: "label-style",
								items: [
									{
										type: "custom" as const,
										id: "label-bg-color",
										component: LabelBackgroundColorMenu,
									},
									{
										type: "custom" as const,
										id: "label-border-color",
										component: LabelBorderColorMenu,
									},
									{
										type: "custom" as const,
										id: "label-border-style",
										component: LabelBorderStyleMenu,
									},
								],
							},
							{
								id: "label-text",
								items: [
									{
										type: "custom" as const,
										id: "label-font-size",
										component: LabelFontSizeMenu,
									},
									{
										type: "custom" as const,
										id: "label-font-color",
										component: LabelFontColorMenu,
									},
									{
										type: "custom" as const,
										id: "label-bold",
										component: LabelBoldMenu,
									},
								],
							},
						]
					: []),
			],
			validateState: isValidConnectorState,
		}),

		sticky: defineObject({
			mapper: { toDoc: stickyToDoc, toState: stickyToState },
			features: StickyFeatures,
			component: Sticky,
			behavior: createFrameBehavior<StickyState>(),
			menuFactory: (_state: StickyState) => [
				{
					id: "style",
					items: [
						{ type: "custom", id: "sticky-color", component: StickyColorMenu },
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
			validateState: isValidStickyState,
			shapeLibrary: {
				factory: StickyShapeFactory,
				presets: StickyShapePresets,
				presetIcons: { sticky: StickyIcon },
			},
		}),

		// SVG is not created from the ShapeLibrary (only added via AI / direct .jis.json authoring).
		// Therefore shapeLibrary (factory / preview / presets) is not registered.
		svg: defineObject({
			mapper: { toDoc: svgToDoc, toState: svgToState },
			features: SvgFeatures,
			component: Svg,
			behavior: createFrameBehavior<SvgState>(),
			menuFactory: (_state) => [
				{
					id: "transform",
					items: [{ type: "aspectRatio" }],
				},
			],
			validateState: isValidSvgState,
		}),
	};

/**
 * Registers a single object type described by `definition` across all registries
 * in the given bundle (mapper, component, behavior, state validator, menu), and
 * optionally its ShapeLibrary capabilities.
 */
export const applyObjectDefinition = (
	registries: CanvasRegistries,
	type: ObjectType,
	definition: ObjectTypeDefinition,
): void => {
	registries.objectMapper.register(
		type,
		definition.mapper,
		definition.features,
	);
	registries.objectComponent.register(type, definition.component);
	registries.objectBehavior.register(type, definition.behavior);
	registries.objectStateValidator.register(type, definition.validateState);
	registries.objectMenu.register(type, definition.menuFactory);

	const shapeLibrary = definition.shapeLibrary;
	if (shapeLibrary?.factory) {
		registries.shapeFactory.register(type, shapeLibrary.factory);
	}
	if (shapeLibrary?.previewRenderer) {
		registries.shapePreview.register(type, shapeLibrary.previewRenderer);
	}
	shapeLibrary?.presets?.forEach((preset) => {
		const icon = shapeLibrary.presetIcons?.[preset.id];
		registries.shapePreset.register(icon ? { ...preset, icon } : preset);
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
 * @param registries Target bundle. Defaults to the module-level singletons for
 * backward compatibility with existing singleton consumers.
 */
export const initializeObjectRegistry = (
	registries: CanvasRegistries = singletonRegistries,
): void => {
	registries.objectMapper.clear();
	registries.objectComponent.clear();
	registries.objectBehavior.clear();
	registries.objectStateValidator.clear();
	registries.objectMenu.clear();
	registries.shapeFactory.clear();
	registries.shapePreview.clear();
	registries.shapePreset.clear();

	for (const [type, definition] of Object.entries(ALL_OBJECT_DEFINITIONS)) {
		applyObjectDefinition(registries, type, definition);
	}
};
