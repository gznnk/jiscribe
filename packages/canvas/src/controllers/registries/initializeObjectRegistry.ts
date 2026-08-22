import { ConnectorExtraStyleProperties } from "@jiscribe/doc/model/objects/connector/ConnectorDoc";
import type { ObjectType } from "@jiscribe/doc/model/objects/types/ObjectType";
import { builtinObjectDocDefinitions } from "@jiscribe/doc/plugin/builtinObjectDocDefinitions";
import { extractTextSlotStyleDefaults } from "@jiscribe/doc/plugin/ObjectTextStyleDefaultsRegistry";
import { BODY_TEXT_SLOT_ID } from "@jiscribe/doc/text/style/textSlotId";

import type { CanvasRegistries } from "./CanvasRegistries";
import { defineObject } from "../../plugin/ObjectTypeDefinition";
import type {
	AnyObjectTypeDefinition,
	ObjectTypeDefinition,
} from "../../plugin/ObjectTypeDefinition";
import { supportsAutoHeightType } from "../../plugin/supportsAutoHeightType";
import { Connector } from "../../rendering/objects/connector/Connector";
import { Ellipse } from "../../rendering/objects/primitives/Ellipse";
import { Polygon } from "../../rendering/objects/primitives/Polygon";
import { Polyline } from "../../rendering/objects/primitives/Polyline";
import { Rect } from "../../rendering/objects/primitives/Rect";
import { Svg } from "../../rendering/objects/primitives/Svg";
import { Text } from "../../rendering/objects/primitives/Text";
import {
	connectorToDoc,
	connectorToState,
} from "../../states/objects/connector/ConnectorMapper";
import { isValidConnectorState } from "../../states/objects/connector/validateConnectorState";
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
import { resizeTextStateToContent } from "../../states/objects/primitives/text/resizeTextStateToContent";
import {
	textToDoc,
	textToState,
} from "../../states/objects/primitives/text/TextMapper";
import type { TextState } from "../../states/objects/primitives/text/TextState";
import { isValidTextState } from "../../states/objects/primitives/text/validateTextState";
import { resizeAutoHeightStateToContent } from "../../states/objects/utils/resizeAutoHeightStateToContent";
import { createFrameBehavior } from "../behaviors/base/FrameController";
import {
	moveByDelta as connectorMoveByDelta,
	rotateByGroup as connectorRotateByGroup,
	transformByGroup as connectorTransformByGroup,
} from "../behaviors/connector/ConnectorController";
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
	moveByDelta as textMoveByDelta,
	rotateByGroup as textRotateByGroup,
	transformByGroup as textTransformByGroup,
} from "../behaviors/primitives/TextController";
import type { ObjectTransformHandles } from "../ui/controls/ObjectTransformHandlesRegistry";
import {
	LabelBackgroundColorMenu,
	LabelBoldMenu,
	LabelBorderColorMenu,
	LabelBorderStyleMenu,
	LabelFontColorMenu,
	LabelFontSizeMenu,
} from "../ui/menu/ObjectMenu/items/LabelStyleMenu";
import { RoutingMenu } from "../ui/menu/ObjectMenu/items/RoutingMenu";
import type { ObjectMenuSection } from "../ui/menu/ObjectMenu/ObjectMenuTypes";
import { createDefaultMenu } from "../ui/menu/ObjectMenu/utils/createDefaultMenu";
import { EllipseStencils } from "../ui/objects/primitives/EllipseStencils";
import { PolygonStencils } from "../ui/objects/primitives/PolygonStencils";
import { PolylineStencils } from "../ui/objects/primitives/PolylineStencils";
import { RectStencils } from "../ui/objects/primitives/RectStencils";
import { TextStencils } from "../ui/objects/primitives/TextStencils";

/**
 * The handles a label text puts on its transform frame: none that resize it. Its
 * box is measured from the text in both directions, so a resize handle could
 * only contradict the measurement. Rotation stays — it is stored in the doc.
 */
const TEXT_LABEL_TRANSFORM_HANDLES: ObjectTransformHandles = { resize: false };

/**
 * The handles a block text puts on its frame: the two that change the width it
 * wraps in. The height stays the wrapped lines' to decide, so the anchors that
 * move a horizontal edge stay off.
 *
 * A module constant rather than a fresh object per call, since the frame is
 * memoized on the declaration it is handed (ObjectTransformHandlesRegistry).
 */
const TEXT_BLOCK_TRANSFORM_HANDLES: ObjectTransformHandles = {
	resize: "width",
};

/**
 * Data-only description of every object type. `createCanvasRegistries` applies a
 * chosen subset of these to a fresh bundle; `initializeObjectRegistry` applies
 * all of them to its target bundle.
 *
 * Each entry spreads its headless definition, so a built-in's `textRegion` comes
 * from `builtinObjectDocDefinitions` — the ellipse's inscribed rect, the box
 * itself for the other two. The plugins' UI definitions declare theirs again
 * instead, their doc-side declaration being allowed to say "not in the box at
 * all", which a renderer cannot use (see createFrameObjectDefinition).
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
			behavior: createFrameBehavior<EllipseState>(),
			stencils: EllipseStencils,
		}),

		text: defineObject({
			...builtinObjectDocDefinitions.text,
			mapper: { toDoc: textToDoc, toState: textToState },
			stateValidator: isValidTextState,
			contentResizer: (state, context) =>
				resizeTextStateToContent(state, context.textStyleDefaults),
			component: Text,
			behavior: {
				moveByDelta: textMoveByDelta,
				transformByGroup: textTransformByGroup,
				rotateByGroup: textRotateByGroup,
			},
			transformHandles: (state: TextState) =>
				state.textLayout === "block"
					? TEXT_BLOCK_TRANSFORM_HANDLES
					: TEXT_LABEL_TRANSFORM_HANDLES,
			// The layout switch is the one section text adds to what its features
			// imply; every other type either declares its whole menu or takes the
			// derived one as it is.
			menu: [
				...createDefaultMenu(builtinObjectDocDefinitions.text.features),
				{ id: "text-layout", items: [{ type: "textLayout" }] },
			],
			stencils: TextStencils,
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
 * The switch between a height the document states and one that follows the text,
 * appended to the menu of every type that may take it (`supportsAutoHeightType`).
 * One shared section value, so the merge that keeps only the sections every
 * selected type registers matches it across a multi-type selection.
 */
const AUTO_HEIGHT_MENU_SECTION: ObjectMenuSection = {
	id: "auto-height",
	items: [{ type: "autoHeight" }],
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
	const slotStyleDefaults = extractTextSlotStyleDefaults(
		definition.features,
		definition.defaults,
		definition.textSlotStyleDefaults,
	);
	if (slotStyleDefaults) {
		registries.objectTextStyleDefaults.register(type, slotStyleDefaults);
	}
	const supportsAutoHeight = supportsAutoHeightType(definition);
	if (supportsAutoHeight) {
		registries.objectAutoHeight.register(type);
	}
	// A type whose doc may leave `height` out gets the shared derivation, which is
	// inert for every object of it that states one — the two are mutually
	// exclusive anyway, a content-resized type storing no size at all
	// (`geometry: "point"`) and an auto-height one storing a rect.
	const resizeToContent =
		definition.contentResizer ??
		(supportsAutoHeight
			? (state, context) =>
					resizeAutoHeightStateToContent(
						state,
						definition.textRegion,
						context.textStyleDefaults,
					)
			: undefined);
	if (resizeToContent) {
		// The resizer measures the text with the style it is drawn with, so the
		// type's own defaults ride in on the context rather than each resizer
		// reaching for a registry the states layer cannot see. Only the body slot's
		// are passed: a content-resized type sizes its box to one text. A type with
		// no defaults to add is registered as it is, so nothing is wrapped for nothing.
		const textStyleDefaults = slotStyleDefaults?.[BODY_TEXT_SLOT_ID];
		registries.objectContentResizer.register(
			type,
			textStyleDefaults === undefined
				? resizeToContent
				: (state, context) =>
						resizeToContent(state, { ...context, textStyleDefaults }),
		);
	}
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
	if (definition.transformHandles) {
		registries.objectTransformHandles.register(
			type,
			definition.transformHandles,
		);
	}
	registries.objectBehavior.register(type, definition.behavior);
	registries.objectStateValidator.register(type, definition.stateValidator);
	const menu = definition.menu ?? createDefaultMenu(definition.features);
	// The switch is appended rather than declared per type: it belongs to every
	// type whose document may leave `height` out, and a type declaring its own
	// menu would otherwise have to remember it. A multi-type selection keeps only
	// the sections every selected type registers, so the section itself is the
	// gate that hides the switch beside a shape that cannot take it (useMenuSections).
	registries.objectMenu.register(
		type,
		supportsAutoHeight ? [...menu, AUTO_HEIGHT_MENU_SECTION] : menu,
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
 * The doc validators are not initialized here. They are used only during parse-time
 * validation, where `createCanvasParser` builds its own registry from the definition
 * set it is given (parser/createCanvasParser).
 *
 * @param registries Target bundle to populate.
 */
export const initializeObjectRegistry = (
	registries: CanvasRegistries,
): void => {
	registries.objectMapper.clear();
	registries.objectTextStyleDefaults.clear();
	registries.objectContentResizer.clear();
	registries.objectAutoHeight.clear();
	registries.objectComponent.clear();
	registries.objectSvgDefs.clear();
	registries.objectTextRegion.clear();
	registries.objectTextEditOverflow.clear();
	registries.objectOutline.clear();
	registries.objectAnchorRegion.clear();
	registries.objectExtraConnectPoints.clear();
	registries.objectGeometryKey.clear();
	registries.objectVisualBounds.clear();
	registries.objectTransformHandles.clear();
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
