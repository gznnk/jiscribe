import type { FC } from "react";

import type { CanvasRegistries } from "./CanvasRegistries";
import {
	Callout,
	CalloutPreview,
	calcCalloutTextRegion,
	calloutOutline,
} from "../../presentations/objects/annotations/Callout";
import { Sticky } from "../../presentations/objects/annotations/Sticky";
import { Connector } from "../../presentations/objects/connections/Connector";
import {
	Card,
	CardPreview,
	calcCardTextRegion,
	cardOutline,
} from "../../presentations/objects/flowchart/Card";
import {
	Cross,
	CrossPreview,
	crossOutline,
} from "../../presentations/objects/flowchart/Cross";
import {
	Db,
	DbPreview,
	calcDbTextRegion,
	dbOutline,
} from "../../presentations/objects/flowchart/Db";
import {
	Delay,
	DelayPreview,
	calcDelayTextRegion,
	delayOutline,
} from "../../presentations/objects/flowchart/Delay";
import {
	Diamond,
	DiamondPreview,
	calcDiamondTextRegion,
	diamondOutline,
} from "../../presentations/objects/flowchart/Diamond";
import {
	Display,
	DisplayPreview,
	calcDisplayTextRegion,
	displayOutline,
} from "../../presentations/objects/flowchart/Display";
import {
	Document,
	DocumentPreview,
	calcDocumentTextRegion,
	documentOutline,
} from "../../presentations/objects/flowchart/Document";
import {
	Extract,
	ExtractPreview,
	extractOutline,
} from "../../presentations/objects/flowchart/Extract";
import {
	Hexagon,
	HexagonPreview,
	calcHexagonTextRegion,
	hexagonOutline,
} from "../../presentations/objects/flowchart/Hexagon";
import {
	LoopLimit,
	LoopLimitPreview,
	calcLoopLimitTextRegion,
	loopLimitOutline,
} from "../../presentations/objects/flowchart/LoopLimit";
import {
	ManualInput,
	ManualInputPreview,
	calcManualInputTextRegion,
	manualInputOutline,
} from "../../presentations/objects/flowchart/ManualInput";
import {
	MultiDocument,
	MultiDocumentPreview,
	calcMultiDocumentTextRegion,
	multiDocumentOutline,
} from "../../presentations/objects/flowchart/MultiDocument";
import {
	OffPageConnector,
	OffPageConnectorPreview,
	calcOffPageConnectorTextRegion,
	offPageConnectorOutline,
} from "../../presentations/objects/flowchart/OffPageConnector";
import {
	Parallelogram,
	ParallelogramPreview,
	calcParallelogramTextRegion,
	parallelogramOutline,
} from "../../presentations/objects/flowchart/Parallelogram";
import {
	Stadium,
	StadiumPreview,
	calcStadiumTextRegion,
	stadiumOutline,
} from "../../presentations/objects/flowchart/Stadium";
import {
	StoredData,
	StoredDataPreview,
	calcStoredDataTextRegion,
	storedDataOutline,
} from "../../presentations/objects/flowchart/StoredData";
import {
	Subroutine,
	SubroutinePreview,
	calcSubroutineTextRegion,
} from "../../presentations/objects/flowchart/Subroutine";
import {
	Trapezoid,
	TrapezoidPreview,
	calcTrapezoidTextRegion,
	trapezoidOutline,
} from "../../presentations/objects/flowchart/Trapezoid";
import {
	Actor,
	ActorPreview,
	calcActorTextRegion,
} from "../../presentations/objects/general/Actor";
import {
	Cloud,
	CloudPreview,
	calcCloudTextRegion,
	cloudOutline,
} from "../../presentations/objects/general/Cloud";
import {
	Ellipse,
	EllipsePreview,
	calcEllipseTextRegion,
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
import type { ShapeOutlineProvider } from "../../presentations/objects/registry/ShapeOutlineRegistry";
import type { ShapePreviewRenderer } from "../../presentations/objects/registry/ShapePreviewTypes";
import type { TextRegionCalculator } from "../../presentations/objects/registry/TextRegionRegistry";
import { CalloutFeatures } from "../../schemas/objects/annotations/callout/CalloutDoc";
import { CalloutShapeFactory } from "../../schemas/objects/annotations/callout/CalloutShapeFactory";
import { StickyFeatures } from "../../schemas/objects/annotations/sticky/StickyDoc";
import { StickyShapeFactory } from "../../schemas/objects/annotations/sticky/StickyShapeFactory";
import type { ObjectDoc } from "../../schemas/objects/base/ObjectDoc";
import {
	ConnectorExtraStyleProperties,
	ConnectorFeatures,
} from "../../schemas/objects/connections/connector/ConnectorDoc";
import { CardFeatures } from "../../schemas/objects/flowchart/card/CardDoc";
import { CardShapeFactory } from "../../schemas/objects/flowchart/card/CardShapeFactory";
import { CrossFeatures } from "../../schemas/objects/flowchart/cross/CrossDoc";
import { CrossShapeFactory } from "../../schemas/objects/flowchart/cross/CrossShapeFactory";
import { DbFeatures } from "../../schemas/objects/flowchart/db/DbDoc";
import { DbShapeFactory } from "../../schemas/objects/flowchart/db/DbShapeFactory";
import { DelayFeatures } from "../../schemas/objects/flowchart/delay/DelayDoc";
import { DelayShapeFactory } from "../../schemas/objects/flowchart/delay/DelayShapeFactory";
import { DiamondFeatures } from "../../schemas/objects/flowchart/diamond/DiamondDoc";
import { DiamondShapeFactory } from "../../schemas/objects/flowchart/diamond/DiamondShapeFactory";
import { DisplayFeatures } from "../../schemas/objects/flowchart/display/DisplayDoc";
import { DisplayShapeFactory } from "../../schemas/objects/flowchart/display/DisplayShapeFactory";
import { DocumentFeatures } from "../../schemas/objects/flowchart/document/DocumentDoc";
import { DocumentShapeFactory } from "../../schemas/objects/flowchart/document/DocumentShapeFactory";
import { ExtractFeatures } from "../../schemas/objects/flowchart/extract/ExtractDoc";
import { ExtractShapeFactory } from "../../schemas/objects/flowchart/extract/ExtractShapeFactory";
import { HexagonFeatures } from "../../schemas/objects/flowchart/hexagon/HexagonDoc";
import { HexagonShapeFactory } from "../../schemas/objects/flowchart/hexagon/HexagonShapeFactory";
import { LoopLimitFeatures } from "../../schemas/objects/flowchart/loopLimit/LoopLimitDoc";
import { LoopLimitShapeFactory } from "../../schemas/objects/flowchart/loopLimit/LoopLimitShapeFactory";
import { ManualInputFeatures } from "../../schemas/objects/flowchart/manualInput/ManualInputDoc";
import { ManualInputShapeFactory } from "../../schemas/objects/flowchart/manualInput/ManualInputShapeFactory";
import { MultiDocumentFeatures } from "../../schemas/objects/flowchart/multiDocument/MultiDocumentDoc";
import { MultiDocumentShapeFactory } from "../../schemas/objects/flowchart/multiDocument/MultiDocumentShapeFactory";
import { OffPageConnectorFeatures } from "../../schemas/objects/flowchart/offPageConnector/OffPageConnectorDoc";
import { OffPageConnectorShapeFactory } from "../../schemas/objects/flowchart/offPageConnector/OffPageConnectorShapeFactory";
import { ParallelogramFeatures } from "../../schemas/objects/flowchart/parallelogram/ParallelogramDoc";
import { ParallelogramShapeFactory } from "../../schemas/objects/flowchart/parallelogram/ParallelogramShapeFactory";
import { StadiumFeatures } from "../../schemas/objects/flowchart/stadium/StadiumDoc";
import { StadiumShapeFactory } from "../../schemas/objects/flowchart/stadium/StadiumShapeFactory";
import { StoredDataFeatures } from "../../schemas/objects/flowchart/storedData/StoredDataDoc";
import { StoredDataShapeFactory } from "../../schemas/objects/flowchart/storedData/StoredDataShapeFactory";
import { SubroutineFeatures } from "../../schemas/objects/flowchart/subroutine/SubroutineDoc";
import { SubroutineShapeFactory } from "../../schemas/objects/flowchart/subroutine/SubroutineShapeFactory";
import { TrapezoidFeatures } from "../../schemas/objects/flowchart/trapezoid/TrapezoidDoc";
import { TrapezoidShapeFactory } from "../../schemas/objects/flowchart/trapezoid/TrapezoidShapeFactory";
import { ActorFeatures } from "../../schemas/objects/general/actor/ActorDoc";
import { ActorShapeFactory } from "../../schemas/objects/general/actor/ActorShapeFactory";
import { CloudFeatures } from "../../schemas/objects/general/cloud/CloudDoc";
import { CloudShapeFactory } from "../../schemas/objects/general/cloud/CloudShapeFactory";
import { EllipseFeatures } from "../../schemas/objects/primitives/ellipse/EllipseDoc";
import { EllipseShapeFactory } from "../../schemas/objects/primitives/ellipse/EllipseShapeFactory";
import { GroupFeatures } from "../../schemas/objects/primitives/group/GroupDoc";
import { PolygonFeatures } from "../../schemas/objects/primitives/polygon/PolygonDoc";
import { PolygonShapeFactory } from "../../schemas/objects/primitives/polygon/PolygonShapeFactory";
import { PolylineFeatures } from "../../schemas/objects/primitives/polyline/PolylineDoc";
import { PolylineShapeFactory } from "../../schemas/objects/primitives/polyline/PolylineShapeFactory";
import { RectFeatures } from "../../schemas/objects/primitives/rect/RectDoc";
import { RectShapeFactory } from "../../schemas/objects/primitives/rect/RectShapeFactory";
import { SvgFeatures } from "../../schemas/objects/primitives/svg/SvgDoc";
import type { ExtraStylePropertyDescriptor } from "../../schemas/objects/types/ExtraStyleProperty";
import type { ObjectFeatures } from "../../schemas/objects/types/ObjectFeatures";
import type { ObjectType } from "../../schemas/objects/types/ObjectType";
import type { ShapeFactory } from "../../schemas/objects/types/ShapeFactory";
import {
	calloutToDoc,
	calloutToState,
} from "../../states/objects/annotations/callout/CalloutMapper";
import type { CalloutState } from "../../states/objects/annotations/callout/CalloutState";
import { isValidCalloutState } from "../../states/objects/annotations/callout/validateCalloutState";
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
	cardToDoc,
	cardToState,
} from "../../states/objects/flowchart/card/CardMapper";
import type { CardState } from "../../states/objects/flowchart/card/CardState";
import { isValidCardState } from "../../states/objects/flowchart/card/validateCardState";
import {
	crossToDoc,
	crossToState,
} from "../../states/objects/flowchart/cross/CrossMapper";
import type { CrossState } from "../../states/objects/flowchart/cross/CrossState";
import { isValidCrossState } from "../../states/objects/flowchart/cross/validateCrossState";
import { dbToDoc, dbToState } from "../../states/objects/flowchart/db/DbMapper";
import type { DbState } from "../../states/objects/flowchart/db/DbState";
import { isValidDbState } from "../../states/objects/flowchart/db/validateDbState";
import {
	delayToDoc,
	delayToState,
} from "../../states/objects/flowchart/delay/DelayMapper";
import type { DelayState } from "../../states/objects/flowchart/delay/DelayState";
import { isValidDelayState } from "../../states/objects/flowchart/delay/validateDelayState";
import {
	diamondToDoc,
	diamondToState,
} from "../../states/objects/flowchart/diamond/DiamondMapper";
import type { DiamondState } from "../../states/objects/flowchart/diamond/DiamondState";
import { isValidDiamondState } from "../../states/objects/flowchart/diamond/validateDiamondState";
import {
	displayToDoc,
	displayToState,
} from "../../states/objects/flowchart/display/DisplayMapper";
import type { DisplayState } from "../../states/objects/flowchart/display/DisplayState";
import { isValidDisplayState } from "../../states/objects/flowchart/display/validateDisplayState";
import {
	documentToDoc,
	documentToState,
} from "../../states/objects/flowchart/document/DocumentMapper";
import type { DocumentState } from "../../states/objects/flowchart/document/DocumentState";
import { isValidDocumentState } from "../../states/objects/flowchart/document/validateDocumentState";
import {
	extractToDoc,
	extractToState,
} from "../../states/objects/flowchart/extract/ExtractMapper";
import type { ExtractState } from "../../states/objects/flowchart/extract/ExtractState";
import { isValidExtractState } from "../../states/objects/flowchart/extract/validateExtractState";
import {
	hexagonToDoc,
	hexagonToState,
} from "../../states/objects/flowchart/hexagon/HexagonMapper";
import type { HexagonState } from "../../states/objects/flowchart/hexagon/HexagonState";
import { isValidHexagonState } from "../../states/objects/flowchart/hexagon/validateHexagonState";
import {
	loopLimitToDoc,
	loopLimitToState,
} from "../../states/objects/flowchart/loopLimit/LoopLimitMapper";
import type { LoopLimitState } from "../../states/objects/flowchart/loopLimit/LoopLimitState";
import { isValidLoopLimitState } from "../../states/objects/flowchart/loopLimit/validateLoopLimitState";
import {
	manualInputToDoc,
	manualInputToState,
} from "../../states/objects/flowchart/manualInput/ManualInputMapper";
import type { ManualInputState } from "../../states/objects/flowchart/manualInput/ManualInputState";
import { isValidManualInputState } from "../../states/objects/flowchart/manualInput/validateManualInputState";
import {
	multiDocumentToDoc,
	multiDocumentToState,
} from "../../states/objects/flowchart/multiDocument/MultiDocumentMapper";
import type { MultiDocumentState } from "../../states/objects/flowchart/multiDocument/MultiDocumentState";
import { isValidMultiDocumentState } from "../../states/objects/flowchart/multiDocument/validateMultiDocumentState";
import {
	offPageConnectorToDoc,
	offPageConnectorToState,
} from "../../states/objects/flowchart/offPageConnector/OffPageConnectorMapper";
import type { OffPageConnectorState } from "../../states/objects/flowchart/offPageConnector/OffPageConnectorState";
import { isValidOffPageConnectorState } from "../../states/objects/flowchart/offPageConnector/validateOffPageConnectorState";
import {
	parallelogramToDoc,
	parallelogramToState,
} from "../../states/objects/flowchart/parallelogram/ParallelogramMapper";
import type { ParallelogramState } from "../../states/objects/flowchart/parallelogram/ParallelogramState";
import { isValidParallelogramState } from "../../states/objects/flowchart/parallelogram/validateParallelogramState";
import {
	stadiumToDoc,
	stadiumToState,
} from "../../states/objects/flowchart/stadium/StadiumMapper";
import type { StadiumState } from "../../states/objects/flowchart/stadium/StadiumState";
import { isValidStadiumState } from "../../states/objects/flowchart/stadium/validateStadiumState";
import {
	storedDataToDoc,
	storedDataToState,
} from "../../states/objects/flowchart/storedData/StoredDataMapper";
import type { StoredDataState } from "../../states/objects/flowchart/storedData/StoredDataState";
import { isValidStoredDataState } from "../../states/objects/flowchart/storedData/validateStoredDataState";
import {
	subroutineToDoc,
	subroutineToState,
} from "../../states/objects/flowchart/subroutine/SubroutineMapper";
import type { SubroutineState } from "../../states/objects/flowchart/subroutine/SubroutineState";
import { isValidSubroutineState } from "../../states/objects/flowchart/subroutine/validateSubroutineState";
import {
	trapezoidToDoc,
	trapezoidToState,
} from "../../states/objects/flowchart/trapezoid/TrapezoidMapper";
import type { TrapezoidState } from "../../states/objects/flowchart/trapezoid/TrapezoidState";
import { isValidTrapezoidState } from "../../states/objects/flowchart/trapezoid/validateTrapezoidState";
import {
	actorToDoc,
	actorToState,
} from "../../states/objects/general/actor/ActorMapper";
import type { ActorState } from "../../states/objects/general/actor/ActorState";
import { isValidActorState } from "../../states/objects/general/actor/validateActorState";
import {
	cloudToDoc,
	cloudToState,
} from "../../states/objects/general/cloud/CloudMapper";
import type { CloudState } from "../../states/objects/general/cloud/CloudState";
import { isValidCloudState } from "../../states/objects/general/cloud/validateCloudState";
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
import { TailTipControlHandler } from "../gestures/handlers/controls/callout/TailTipControlHandler";
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
import { CalloutTailTipControl } from "../ui/controls/CalloutTailControls";
import type { SelectionControlDefinition } from "../ui/controls/SelectionControlTypes";
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
import { CalloutShapePresets } from "../ui/objects/annotations/CalloutShapePresets";
import { StickyShapePresets } from "../ui/objects/annotations/StickyShapePresets";
import { CardShapePresets } from "../ui/objects/flowchart/CardShapePresets";
import { CrossShapePresets } from "../ui/objects/flowchart/CrossShapePresets";
import { DbShapePresets } from "../ui/objects/flowchart/DbShapePresets";
import { DelayShapePresets } from "../ui/objects/flowchart/DelayShapePresets";
import { DiamondShapePresets } from "../ui/objects/flowchart/DiamondShapePresets";
import { DisplayShapePresets } from "../ui/objects/flowchart/DisplayShapePresets";
import { DocumentShapePresets } from "../ui/objects/flowchart/DocumentShapePresets";
import { ExtractShapePresets } from "../ui/objects/flowchart/ExtractShapePresets";
import { HexagonShapePresets } from "../ui/objects/flowchart/HexagonShapePresets";
import { LoopLimitShapePresets } from "../ui/objects/flowchart/LoopLimitShapePresets";
import { ManualInputShapePresets } from "../ui/objects/flowchart/ManualInputShapePresets";
import { MultiDocumentShapePresets } from "../ui/objects/flowchart/MultiDocumentShapePresets";
import { OffPageConnectorShapePresets } from "../ui/objects/flowchart/OffPageConnectorShapePresets";
import { ParallelogramShapePresets } from "../ui/objects/flowchart/ParallelogramShapePresets";
import { StadiumShapePresets } from "../ui/objects/flowchart/StadiumShapePresets";
import { StoredDataShapePresets } from "../ui/objects/flowchart/StoredDataShapePresets";
import { SubroutineShapePresets } from "../ui/objects/flowchart/SubroutineShapePresets";
import { TrapezoidShapePresets } from "../ui/objects/flowchart/TrapezoidShapePresets";
import { ActorShapePresets } from "../ui/objects/general/ActorShapePresets";
import { CloudShapePresets } from "../ui/objects/general/CloudShapePresets";
import { EllipseShapePresets } from "../ui/objects/primitives/EllipseShapePresets";
import { PolygonShapePresets } from "../ui/objects/primitives/PolygonShapePresets";
import { PolylineShapePresets } from "../ui/objects/primitives/PolylineShapePresets";
import { RectShapePresets } from "../ui/objects/primitives/RectShapePresets";
import type { ShapePreset } from "../ui/objects/ShapePreset";

/**
 * Creation-related capabilities for the ShapeLibrary (shape palette).
 * Omitted for types not shown in the palette (group / connector).
 */
export type ShapeLibraryRegistration = {
	/** Factory responsible for doc creation, dimensions, and bounds generation */
	factory?: ShapeFactory;
	/** Preview rendering during drag drawing (only for shapes that support bounds drawing) */
	previewRenderer?: ShapePreviewRenderer;
	/** Presets shown in the toolbar (multiple allowed per type) */
	presets?: ShapePreset[];
};

/**
 * The full description of a single object type across every registry
 * (mapper, component, text region, behavior, state validator, menu) plus its
 * optional ShapeLibrary capabilities. Values are widened to the base state/doc types;
 * per-entry type-safety is enforced at definition site by `defineObject`.
 */
export type ObjectTypeDefinition = {
	mapper: ObjectMapperType;
	features: ObjectFeatures;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	component: FC<any>;
	/** Text region calculator. Omitted = full bbox (see TextRegionRegistry). */
	textRegion?: TextRegionCalculator;
	/** Outline polygon provider. Omitted = bounding-box rect/ellipse (see ShapeOutlineRegistry). */
	outline?: ShapeOutlineProvider;
	behavior: ObjectBehaviorEntry;
	menuFactory: MenuSectionFactory<ObjectState>;
	validateState: ObjectStateValidateFn;
	/** Type-specific selection controls (handle renderer + gesture strategy pairs). */
	selectionControls?: SelectionControlDefinition[];
	/** Styleable properties beyond the ObjectFeatures flags (see StylePropertyRegistry). */
	extraStyleProperties?: Record<string, ExtraStylePropertyDescriptor>;
	shapeLibrary?: ShapeLibraryRegistration;
};

/**
 * Builds a single `ObjectTypeDefinition`, preserving per-type `TState` inference
 * at the definition site (mapper / behavior / menuFactory are checked together)
 * before widening to the base-typed record entry.
 */
export const defineObject = <
	TDoc extends ObjectDoc,
	TState extends ObjectState,
>(def: {
	mapper: ObjectMapperType<TDoc, TState>;
	features: ObjectFeatures;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	component: FC<any>;
	textRegion?: TextRegionCalculator;
	outline?: ShapeOutlineProvider;
	behavior: ObjectBehaviorEntry<TState>;
	menuFactory: MenuSectionFactory<TState>;
	validateState: ObjectStateValidateFn;
	selectionControls?: SelectionControlDefinition<TState>[];
	extraStyleProperties?: Record<string, ExtraStylePropertyDescriptor>;
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
			},
		}),

		ellipse: defineObject({
			mapper: { toDoc: ellipseToDoc, toState: ellipseToState },
			features: EllipseFeatures,
			component: Ellipse,
			textRegion: calcEllipseTextRegion,
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
			},
		}),

		diamond: defineObject({
			mapper: { toDoc: diamondToDoc, toState: diamondToState },
			features: DiamondFeatures,
			component: Diamond,
			textRegion: calcDiamondTextRegion,
			outline: diamondOutline,
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
			},
		}),

		stadium: defineObject({
			mapper: { toDoc: stadiumToDoc, toState: stadiumToState },
			features: StadiumFeatures,
			component: Stadium,
			textRegion: calcStadiumTextRegion,
			outline: stadiumOutline,
			behavior: createFrameBehavior<StadiumState>(),
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
			validateState: isValidStadiumState,
			shapeLibrary: {
				factory: StadiumShapeFactory,
				previewRenderer: StadiumPreview,
				presets: StadiumShapePresets,
			},
		}),

		parallelogram: defineObject({
			mapper: { toDoc: parallelogramToDoc, toState: parallelogramToState },
			features: ParallelogramFeatures,
			component: Parallelogram,
			textRegion: calcParallelogramTextRegion,
			outline: parallelogramOutline,
			behavior: createFrameBehavior<ParallelogramState>(),
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
			validateState: isValidParallelogramState,
			shapeLibrary: {
				factory: ParallelogramShapeFactory,
				previewRenderer: ParallelogramPreview,
				presets: ParallelogramShapePresets,
			},
		}),

		hexagon: defineObject({
			mapper: { toDoc: hexagonToDoc, toState: hexagonToState },
			features: HexagonFeatures,
			component: Hexagon,
			textRegion: calcHexagonTextRegion,
			outline: hexagonOutline,
			behavior: createFrameBehavior<HexagonState>(),
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
			validateState: isValidHexagonState,
			shapeLibrary: {
				factory: HexagonShapeFactory,
				previewRenderer: HexagonPreview,
				presets: HexagonShapePresets,
			},
		}),

		cloud: defineObject({
			mapper: { toDoc: cloudToDoc, toState: cloudToState },
			features: CloudFeatures,
			component: Cloud,
			textRegion: calcCloudTextRegion,
			outline: cloudOutline,
			behavior: createFrameBehavior<CloudState>(),
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
			validateState: isValidCloudState,
			shapeLibrary: {
				factory: CloudShapeFactory,
				previewRenderer: CloudPreview,
				presets: CloudShapePresets,
			},
		}),

		document: defineObject({
			mapper: { toDoc: documentToDoc, toState: documentToState },
			features: DocumentFeatures,
			component: Document,
			textRegion: calcDocumentTextRegion,
			outline: documentOutline,
			behavior: createFrameBehavior<DocumentState>(),
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
			validateState: isValidDocumentState,
			shapeLibrary: {
				factory: DocumentShapeFactory,
				previewRenderer: DocumentPreview,
				presets: DocumentShapePresets,
			},
		}),

		multiDocument: defineObject({
			mapper: { toDoc: multiDocumentToDoc, toState: multiDocumentToState },
			features: MultiDocumentFeatures,
			component: MultiDocument,
			textRegion: calcMultiDocumentTextRegion,
			outline: multiDocumentOutline,
			behavior: createFrameBehavior<MultiDocumentState>(),
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
			validateState: isValidMultiDocumentState,
			shapeLibrary: {
				factory: MultiDocumentShapeFactory,
				previewRenderer: MultiDocumentPreview,
				presets: MultiDocumentShapePresets,
			},
		}),

		actor: defineObject({
			mapper: { toDoc: actorToDoc, toState: actorToState },
			features: ActorFeatures,
			component: Actor,
			textRegion: calcActorTextRegion,
			behavior: createFrameBehavior<ActorState>(),
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
			validateState: isValidActorState,
			shapeLibrary: {
				factory: ActorShapeFactory,
				previewRenderer: ActorPreview,
				presets: ActorShapePresets,
			},
		}),

		callout: defineObject({
			mapper: { toDoc: calloutToDoc, toState: calloutToState },
			features: CalloutFeatures,
			component: Callout,
			textRegion: calcCalloutTextRegion,
			outline: calloutOutline,
			behavior: createFrameBehavior<CalloutState>(),
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
			validateState: isValidCalloutState,
			selectionControls: [
				{
					Component: CalloutTailTipControl,
					handler: new TailTipControlHandler(),
				},
			],
			shapeLibrary: {
				factory: CalloutShapeFactory,
				previewRenderer: CalloutPreview,
				presets: CalloutShapePresets,
			},
		}),

		db: defineObject({
			mapper: { toDoc: dbToDoc, toState: dbToState },
			features: DbFeatures,
			component: Db,
			textRegion: calcDbTextRegion,
			outline: dbOutline,
			behavior: createFrameBehavior<DbState>(),
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
			validateState: isValidDbState,
			shapeLibrary: {
				factory: DbShapeFactory,
				previewRenderer: DbPreview,
				presets: DbShapePresets,
			},
		}),

		storedData: defineObject({
			mapper: { toDoc: storedDataToDoc, toState: storedDataToState },
			features: StoredDataFeatures,
			component: StoredData,
			textRegion: calcStoredDataTextRegion,
			outline: storedDataOutline,
			behavior: createFrameBehavior<StoredDataState>(),
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
			validateState: isValidStoredDataState,
			shapeLibrary: {
				factory: StoredDataShapeFactory,
				previewRenderer: StoredDataPreview,
				presets: StoredDataShapePresets,
			},
		}),

		subroutine: defineObject({
			mapper: { toDoc: subroutineToDoc, toState: subroutineToState },
			features: SubroutineFeatures,
			component: Subroutine,
			textRegion: calcSubroutineTextRegion,
			behavior: createFrameBehavior<SubroutineState>(),
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
			validateState: isValidSubroutineState,
			shapeLibrary: {
				factory: SubroutineShapeFactory,
				previewRenderer: SubroutinePreview,
				presets: SubroutineShapePresets,
			},
		}),

		trapezoid: defineObject({
			mapper: { toDoc: trapezoidToDoc, toState: trapezoidToState },
			features: TrapezoidFeatures,
			component: Trapezoid,
			textRegion: calcTrapezoidTextRegion,
			outline: trapezoidOutline,
			behavior: createFrameBehavior<TrapezoidState>(),
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
			validateState: isValidTrapezoidState,
			shapeLibrary: {
				factory: TrapezoidShapeFactory,
				previewRenderer: TrapezoidPreview,
				presets: TrapezoidShapePresets,
			},
		}),

		manualInput: defineObject({
			mapper: { toDoc: manualInputToDoc, toState: manualInputToState },
			features: ManualInputFeatures,
			component: ManualInput,
			textRegion: calcManualInputTextRegion,
			outline: manualInputOutline,
			behavior: createFrameBehavior<ManualInputState>(),
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
			validateState: isValidManualInputState,
			shapeLibrary: {
				factory: ManualInputShapeFactory,
				previewRenderer: ManualInputPreview,
				presets: ManualInputShapePresets,
			},
		}),

		card: defineObject({
			mapper: { toDoc: cardToDoc, toState: cardToState },
			features: CardFeatures,
			component: Card,
			textRegion: calcCardTextRegion,
			outline: cardOutline,
			behavior: createFrameBehavior<CardState>(),
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
			validateState: isValidCardState,
			shapeLibrary: {
				factory: CardShapeFactory,
				previewRenderer: CardPreview,
				presets: CardShapePresets,
			},
		}),

		delay: defineObject({
			mapper: { toDoc: delayToDoc, toState: delayToState },
			features: DelayFeatures,
			component: Delay,
			textRegion: calcDelayTextRegion,
			outline: delayOutline,
			behavior: createFrameBehavior<DelayState>(),
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
			validateState: isValidDelayState,
			shapeLibrary: {
				factory: DelayShapeFactory,
				previewRenderer: DelayPreview,
				presets: DelayShapePresets,
			},
		}),

		loopLimit: defineObject({
			mapper: { toDoc: loopLimitToDoc, toState: loopLimitToState },
			features: LoopLimitFeatures,
			component: LoopLimit,
			textRegion: calcLoopLimitTextRegion,
			outline: loopLimitOutline,
			behavior: createFrameBehavior<LoopLimitState>(),
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
			validateState: isValidLoopLimitState,
			shapeLibrary: {
				factory: LoopLimitShapeFactory,
				previewRenderer: LoopLimitPreview,
				presets: LoopLimitShapePresets,
			},
		}),

		display: defineObject({
			mapper: { toDoc: displayToDoc, toState: displayToState },
			features: DisplayFeatures,
			component: Display,
			textRegion: calcDisplayTextRegion,
			outline: displayOutline,
			behavior: createFrameBehavior<DisplayState>(),
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
			validateState: isValidDisplayState,
			shapeLibrary: {
				factory: DisplayShapeFactory,
				previewRenderer: DisplayPreview,
				presets: DisplayShapePresets,
			},
		}),

		extract: defineObject({
			mapper: { toDoc: extractToDoc, toState: extractToState },
			features: ExtractFeatures,
			component: Extract,
			outline: extractOutline,
			behavior: createFrameBehavior<ExtractState>(),
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
					id: "transform",
					items: [{ type: "aspectRatio" }],
				},
			],
			validateState: isValidExtractState,
			shapeLibrary: {
				factory: ExtractShapeFactory,
				previewRenderer: ExtractPreview,
				presets: ExtractShapePresets,
			},
		}),

		cross: defineObject({
			mapper: { toDoc: crossToDoc, toState: crossToState },
			features: CrossFeatures,
			component: Cross,
			outline: crossOutline,
			behavior: createFrameBehavior<CrossState>(),
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
					id: "transform",
					items: [{ type: "aspectRatio" }],
				},
			],
			validateState: isValidCrossState,
			shapeLibrary: {
				factory: CrossShapeFactory,
				previewRenderer: CrossPreview,
				presets: CrossShapePresets,
			},
		}),

		offPageConnector: defineObject({
			mapper: {
				toDoc: offPageConnectorToDoc,
				toState: offPageConnectorToState,
			},
			features: OffPageConnectorFeatures,
			component: OffPageConnector,
			textRegion: calcOffPageConnectorTextRegion,
			outline: offPageConnectorOutline,
			behavior: createFrameBehavior<OffPageConnectorState>(),
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
			validateState: isValidOffPageConnectorState,
			shapeLibrary: {
				factory: OffPageConnectorShapeFactory,
				previewRenderer: OffPageConnectorPreview,
				presets: OffPageConnectorShapePresets,
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
			},
		}),

		connector: defineObject({
			mapper: { toDoc: connectorToDoc, toState: connectorToState },
			features: ConnectorFeatures,
			extraStyleProperties: ConnectorExtraStyleProperties,
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
 * in the given bundle (mapper, component, text region, behavior, state validator,
 * menu), and optionally its ShapeLibrary capabilities.
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
	if (definition.textRegion) {
		registries.textRegion.register(type, definition.textRegion);
	}
	if (definition.outline) {
		registries.shapeOutline.register(type, definition.outline);
	}
	registries.objectBehavior.register(type, definition.behavior);
	registries.objectStateValidator.register(type, definition.validateState);
	registries.objectMenu.register(type, definition.menuFactory);
	if (definition.selectionControls) {
		registries.selectionControl.register(type, definition.selectionControls);
	}
	if (definition.extraStyleProperties) {
		registries.styleProperty.registerExtras(
			type,
			definition.extraStyleProperties,
		);
	}

	const shapeLibrary = definition.shapeLibrary;
	if (shapeLibrary?.factory) {
		registries.shapeFactory.register(type, shapeLibrary.factory);
	}
	if (shapeLibrary?.previewRenderer) {
		registries.shapePreview.register(type, shapeLibrary.previewRenderer);
	}
	shapeLibrary?.presets?.forEach((preset) => {
		registries.shapePreset.register(preset);
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
	registries.textRegion.clear();
	registries.shapeOutline.clear();
	registries.objectBehavior.clear();
	registries.objectStateValidator.clear();
	registries.objectMenu.clear();
	registries.selectionControl.clear();
	registries.shapeFactory.clear();
	registries.shapePreview.clear();
	registries.shapePreset.clear();
	registries.styleProperty.clearExtras();

	for (const [type, definition] of Object.entries(ALL_OBJECT_DEFINITIONS)) {
		applyObjectDefinition(registries, type, definition);
	}
};
