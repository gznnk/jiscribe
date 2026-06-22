import type { FC } from "react";

import { Sticky } from "../../presentations/objects/annotations/Sticky";
import { Connector } from "../../presentations/objects/connections/Connector";
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
import { objectComponentRegistry } from "../../presentations/objects/registry/ObjectComponentRegistry";
import { shapePreviewRegistry } from "../../presentations/objects/registry/ShapePreviewRegistry";
import type { ShapePreviewRenderer } from "../../presentations/objects/registry/ShapePreviewTypes";
import { StickyFeatures } from "../../schemas/objects/annotations/sticky/StickyDoc";
import { StickyShapeFactory } from "../../schemas/objects/annotations/sticky/StickyShapeFactory";
import { StickyShapePresets } from "../../schemas/objects/annotations/sticky/StickyShapePresets";
import type { ObjectDoc } from "../../schemas/objects/base/ObjectDoc";
import { ConnectorFeatures } from "../../schemas/objects/connections/connector/ConnectorDoc";
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
import type { ShapePreset } from "../../schemas/objects/types/ShapePreset";
import { shapeFactoryRegistry } from "../../schemas/registry/ShapeFactoryRegistry";
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
	ellipseToDoc,
	ellipseToState,
} from "../../states/objects/primitives/ellipse/EllipseMapper";
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
import { isValidRectState } from "../../states/objects/primitives/rect/validateRectState";
import {
	svgToDoc,
	svgToState,
} from "../../states/objects/primitives/svg/SvgMapper";
import { isValidSvgState } from "../../states/objects/primitives/svg/validateSvgState";
import { objectMapperRegistry } from "../../states/registry/ObjectMapperRegistry";
import type { ObjectStateValidateFn } from "../../states/registry/ObjectStateValidatorRegistry";
import { objectStateValidatorRegistry } from "../../states/registry/ObjectStateValidatorRegistry";
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
import {
	moveByDelta as svgMoveByDelta,
	rotateByGroup as svgRotateByGroup,
	transformByGroup as svgTransformByGroup,
} from "../gestures/handlers/objects/primitives/SvgController";
import { objectBehaviorRegistry } from "../gestures/registry/ObjectBehaviorRegistry";
import type { ObjectBehaviorEntry } from "../gestures/registry/ObjectBehaviorTypes";
import { StickyColorMenu } from "../ui/menu/ObjectMenu/items/StickyColorMenu";
import { objectMenuRegistry } from "../ui/menu/ObjectMenu/ObjectMenuRegistry";
import type { MenuSectionFactory } from "../ui/menu/ObjectMenu/ObjectMenuTypes";
import { shapePresetRegistry } from "../ui/menu/ShapeLibrary/ShapePresetRegistry";

/**
 * Initialize all object registries with definitions for every object type.
 */
export const initializeObjectRegistry = (): void => {
	objectMapperRegistry.clear();
	objectComponentRegistry.clear();
	objectBehaviorRegistry.clear();
	objectStateValidatorRegistry.clear();
	objectMenuRegistry.clear();
	shapeFactoryRegistry.clear();
	shapePreviewRegistry.clear();
	shapePresetRegistry.clear();

	// doc バリデータ（objectDocValidatorRegistry）はここでは初期化しない。
	// 登録内容は parse 時の検証でしか使われず、parseCanvasText が必要時に
	// 遅延初期化する（schemas/registry/initializeObjectDocValidatorRegistry）。

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
		isValidRectState,
		{
			factory: RectShapeFactory,
			previewRenderer: RectPreview,
			presets: RectShapePresets,
		},
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
		isValidEllipseState,
		{
			factory: EllipseShapeFactory,
			previewRenderer: EllipsePreview,
			presets: EllipseShapePresets,
		},
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
		isValidGroupState,
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
		isValidPolygonState,
		{
			factory: PolygonShapeFactory,
			previewRenderer: PolygonPreview,
			presets: PolygonShapePresets,
		},
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
		isValidPolylineState,
		{
			factory: PolylineShapeFactory,
			previewRenderer: PolylinePreview,
			presets: PolylineShapePresets,
		},
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
		isValidConnectorState,
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
		isValidStickyState,
		{
			factory: StickyShapeFactory,
			presets: StickyShapePresets,
		},
	);

	// SVG は ShapeLibrary からは生成しない（AI / .jis.json 直書きでのみ追加）。
	// そのため shapeLibrary（factory / preview / presets）は登録しない。
	registerObject(
		"svg",
		{ toDoc: svgToDoc, toState: svgToState },
		SvgFeatures,
		Svg,
		{
			moveByDelta: svgMoveByDelta,
			transformByGroup: svgTransformByGroup,
			rotateByGroup: svgRotateByGroup,
		},
		(_state) => [
			{
				id: "transform",
				items: [{ type: "aspectRatio" }],
			},
		],
		isValidSvgState,
	);
};

/**
 * ShapeLibrary（図形パレット）に関わる生成系ケイパビリティ。
 * パレットに出さない型（group / connector）では省略する。
 */
type ShapeLibraryRegistration = {
	/** doc 生成・寸法・bounds 生成を担うファクトリ */
	factory?: ShapeFactory;
	/** ドラッグ描画中のプレビュー描画（bounds 描画対応図形のみ） */
	previewRenderer?: ShapePreviewRenderer;
	/** ツールバーに並ぶプリセット（1 型につき複数可） */
	presets?: ShapePreset[];
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
	validateState: ObjectStateValidateFn,
	shapeLibrary?: ShapeLibraryRegistration,
): void => {
	objectMapperRegistry.register(type, mapper, features);
	objectComponentRegistry.register(type, component);
	objectBehaviorRegistry.register(type, behavior);
	objectStateValidatorRegistry.register(type, validateState);
	objectMenuRegistry.register(type, menuFactory);

	if (shapeLibrary?.factory) {
		shapeFactoryRegistry.register(type, shapeLibrary.factory);
	}
	if (shapeLibrary?.previewRenderer) {
		shapePreviewRegistry.register(type, shapeLibrary.previewRenderer);
	}
	shapeLibrary?.presets?.forEach((preset) => {
		shapePresetRegistry.register(preset);
	});
};
