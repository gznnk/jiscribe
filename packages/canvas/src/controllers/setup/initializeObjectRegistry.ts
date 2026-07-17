import type { ComponentType, FC } from "react";

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
	Container,
	ContainerPreview,
	calcContainerTextRegion,
} from "../../presentations/objects/containers/Container";
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
import { CalloutShapePresets } from "../../schemas/objects/annotations/callout/CalloutShapePresets";
import { StickyFeatures } from "../../schemas/objects/annotations/sticky/StickyDoc";
import { StickyShapeFactory } from "../../schemas/objects/annotations/sticky/StickyShapeFactory";
import { StickyShapePresets } from "../../schemas/objects/annotations/sticky/StickyShapePresets";
import type { ObjectDoc } from "../../schemas/objects/base/ObjectDoc";
import { ConnectorFeatures } from "../../schemas/objects/connections/connector/ConnectorDoc";
import { ContainerFeatures } from "../../schemas/objects/containers/container/ContainerDoc";
import { ContainerShapeFactory } from "../../schemas/objects/containers/container/ContainerShapeFactory";
import { ContainerShapePresets } from "../../schemas/objects/containers/container/ContainerShapePresets";
import { CardFeatures } from "../../schemas/objects/flowchart/card/CardDoc";
import { CardShapeFactory } from "../../schemas/objects/flowchart/card/CardShapeFactory";
import { CardShapePresets } from "../../schemas/objects/flowchart/card/CardShapePresets";
import { CrossFeatures } from "../../schemas/objects/flowchart/cross/CrossDoc";
import { CrossShapeFactory } from "../../schemas/objects/flowchart/cross/CrossShapeFactory";
import { CrossShapePresets } from "../../schemas/objects/flowchart/cross/CrossShapePresets";
import { DbFeatures } from "../../schemas/objects/flowchart/db/DbDoc";
import { DbShapeFactory } from "../../schemas/objects/flowchart/db/DbShapeFactory";
import { DbShapePresets } from "../../schemas/objects/flowchart/db/DbShapePresets";
import { DelayFeatures } from "../../schemas/objects/flowchart/delay/DelayDoc";
import { DelayShapeFactory } from "../../schemas/objects/flowchart/delay/DelayShapeFactory";
import { DelayShapePresets } from "../../schemas/objects/flowchart/delay/DelayShapePresets";
import { DiamondFeatures } from "../../schemas/objects/flowchart/diamond/DiamondDoc";
import { DiamondShapeFactory } from "../../schemas/objects/flowchart/diamond/DiamondShapeFactory";
import { DiamondShapePresets } from "../../schemas/objects/flowchart/diamond/DiamondShapePresets";
import { DisplayFeatures } from "../../schemas/objects/flowchart/display/DisplayDoc";
import { DisplayShapeFactory } from "../../schemas/objects/flowchart/display/DisplayShapeFactory";
import { DisplayShapePresets } from "../../schemas/objects/flowchart/display/DisplayShapePresets";
import { DocumentFeatures } from "../../schemas/objects/flowchart/document/DocumentDoc";
import { DocumentShapeFactory } from "../../schemas/objects/flowchart/document/DocumentShapeFactory";
import { DocumentShapePresets } from "../../schemas/objects/flowchart/document/DocumentShapePresets";
import { ExtractFeatures } from "../../schemas/objects/flowchart/extract/ExtractDoc";
import { ExtractShapeFactory } from "../../schemas/objects/flowchart/extract/ExtractShapeFactory";
import { ExtractShapePresets } from "../../schemas/objects/flowchart/extract/ExtractShapePresets";
import { HexagonFeatures } from "../../schemas/objects/flowchart/hexagon/HexagonDoc";
import { HexagonShapeFactory } from "../../schemas/objects/flowchart/hexagon/HexagonShapeFactory";
import { HexagonShapePresets } from "../../schemas/objects/flowchart/hexagon/HexagonShapePresets";
import { LoopLimitFeatures } from "../../schemas/objects/flowchart/loopLimit/LoopLimitDoc";
import { LoopLimitShapeFactory } from "../../schemas/objects/flowchart/loopLimit/LoopLimitShapeFactory";
import { LoopLimitShapePresets } from "../../schemas/objects/flowchart/loopLimit/LoopLimitShapePresets";
import { ManualInputFeatures } from "../../schemas/objects/flowchart/manualInput/ManualInputDoc";
import { ManualInputShapeFactory } from "../../schemas/objects/flowchart/manualInput/ManualInputShapeFactory";
import { ManualInputShapePresets } from "../../schemas/objects/flowchart/manualInput/ManualInputShapePresets";
import { MultiDocumentFeatures } from "../../schemas/objects/flowchart/multiDocument/MultiDocumentDoc";
import { MultiDocumentShapeFactory } from "../../schemas/objects/flowchart/multiDocument/MultiDocumentShapeFactory";
import { MultiDocumentShapePresets } from "../../schemas/objects/flowchart/multiDocument/MultiDocumentShapePresets";
import { OffPageConnectorFeatures } from "../../schemas/objects/flowchart/offPageConnector/OffPageConnectorDoc";
import { OffPageConnectorShapeFactory } from "../../schemas/objects/flowchart/offPageConnector/OffPageConnectorShapeFactory";
import { OffPageConnectorShapePresets } from "../../schemas/objects/flowchart/offPageConnector/OffPageConnectorShapePresets";
import { ParallelogramFeatures } from "../../schemas/objects/flowchart/parallelogram/ParallelogramDoc";
import { ParallelogramShapeFactory } from "../../schemas/objects/flowchart/parallelogram/ParallelogramShapeFactory";
import { ParallelogramShapePresets } from "../../schemas/objects/flowchart/parallelogram/ParallelogramShapePresets";
import { StadiumFeatures } from "../../schemas/objects/flowchart/stadium/StadiumDoc";
import { StadiumShapeFactory } from "../../schemas/objects/flowchart/stadium/StadiumShapeFactory";
import { StadiumShapePresets } from "../../schemas/objects/flowchart/stadium/StadiumShapePresets";
import { StoredDataFeatures } from "../../schemas/objects/flowchart/storedData/StoredDataDoc";
import { StoredDataShapeFactory } from "../../schemas/objects/flowchart/storedData/StoredDataShapeFactory";
import { StoredDataShapePresets } from "../../schemas/objects/flowchart/storedData/StoredDataShapePresets";
import { SubroutineFeatures } from "../../schemas/objects/flowchart/subroutine/SubroutineDoc";
import { SubroutineShapeFactory } from "../../schemas/objects/flowchart/subroutine/SubroutineShapeFactory";
import { SubroutineShapePresets } from "../../schemas/objects/flowchart/subroutine/SubroutineShapePresets";
import { TrapezoidFeatures } from "../../schemas/objects/flowchart/trapezoid/TrapezoidDoc";
import { TrapezoidShapeFactory } from "../../schemas/objects/flowchart/trapezoid/TrapezoidShapeFactory";
import { TrapezoidShapePresets } from "../../schemas/objects/flowchart/trapezoid/TrapezoidShapePresets";
import { ActorFeatures } from "../../schemas/objects/general/actor/ActorDoc";
import { ActorShapeFactory } from "../../schemas/objects/general/actor/ActorShapeFactory";
import { ActorShapePresets } from "../../schemas/objects/general/actor/ActorShapePresets";
import { CloudFeatures } from "../../schemas/objects/general/cloud/CloudDoc";
import { CloudShapeFactory } from "../../schemas/objects/general/cloud/CloudShapeFactory";
import { CloudShapePresets } from "../../schemas/objects/general/cloud/CloudShapePresets";
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
	containerToDoc,
	containerToState,
} from "../../states/objects/containers/container/ContainerMapper";
import type { ContainerState } from "../../states/objects/containers/container/ContainerState";
import { isValidContainerState } from "../../states/objects/containers/container/validateContainerState";
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
import { HeaderHeightControlHandler } from "../gestures/handlers/controls/container/HeaderHeightControlHandler";
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
import type { SelectionControlDefinition } from "../registry/SelectionControlTypes";
import { CalloutTailTipControl } from "../ui/controls/CalloutTailControls";
import { ContainerHeaderHeightControl } from "../ui/controls/ContainerHeaderControls";
import { ActorIcon } from "../ui/icons/ActorIcon";
import { BoundaryIcon } from "../ui/icons/BoundaryIcon";
import { CalloutIcon } from "../ui/icons/CalloutIcon";
import { CardIcon } from "../ui/icons/CardIcon";
import { CloudIcon } from "../ui/icons/CloudIcon";
import { CrossIcon } from "../ui/icons/CrossIcon";
import { DbIcon } from "../ui/icons/DbIcon";
import { DelayIcon } from "../ui/icons/DelayIcon";
import { DiamondIcon } from "../ui/icons/DiamondIcon";
import { DisplayIcon } from "../ui/icons/DisplayIcon";
import { DocumentIcon } from "../ui/icons/DocumentIcon";
import { EllipseIcon } from "../ui/icons/EllipseIcon";
import { ExtractIcon } from "../ui/icons/ExtractIcon";
import { FrameIcon } from "../ui/icons/FrameIcon";
import { HexagonIcon } from "../ui/icons/HexagonIcon";
import { LoopLimitIcon } from "../ui/icons/LoopLimitIcon";
import { ManualInputIcon } from "../ui/icons/ManualInputIcon";
import { MarkdownRectIcon } from "../ui/icons/MarkdownRectIcon";
import { MultiDocumentIcon } from "../ui/icons/MultiDocumentIcon";
import { OffPageConnectorIcon } from "../ui/icons/OffPageConnectorIcon";
import { OnPageConnectorIcon } from "../ui/icons/OnPageConnectorIcon";
import { ParallelogramIcon } from "../ui/icons/ParallelogramIcon";
import { PolygonIcon } from "../ui/icons/PolygonIcon";
import { PolylineIcon } from "../ui/icons/PolylineIcon";
import { RectIcon } from "../ui/icons/RectIcon";
import { StadiumIcon } from "../ui/icons/StadiumIcon";
import { StickyIcon } from "../ui/icons/StickyIcon";
import { StoredDataIcon } from "../ui/icons/StoredDataIcon";
import { SubroutineIcon } from "../ui/icons/SubroutineIcon";
import { TrapezoidIcon } from "../ui/icons/TrapezoidIcon";
import { ZoneIcon } from "../ui/icons/ZoneIcon";
import { HeaderColorMenu } from "../ui/menu/ObjectMenu/items/HeaderColorMenu";
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
	textRegion?: TextRegionCalculator;
	outline?: ShapeOutlineProvider;
	behavior: ObjectBehaviorEntry<TState>;
	menuFactory: MenuSectionFactory<TState>;
	validateState: ObjectStateValidateFn;
	selectionControls?: SelectionControlDefinition<TState>[];
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
				presetIcons: {
					rect: RectIcon,
					process: RectIcon,
					"rect-markdown": MarkdownRectIcon,
				},
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
				presetIcons: {
					ellipse: EllipseIcon,
					onPageConnector: OnPageConnectorIcon,
				},
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
				presetIcons: { diamond: DiamondIcon },
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
				presetIcons: { stadium: StadiumIcon },
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
				presetIcons: { parallelogram: ParallelogramIcon },
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
				presetIcons: { hexagon: HexagonIcon },
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
				presetIcons: { cloud: CloudIcon },
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
				presetIcons: { document: DocumentIcon },
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
				presetIcons: { multiDocument: MultiDocumentIcon },
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
				presetIcons: { actor: ActorIcon },
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
				presetIcons: { callout: CalloutIcon },
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
				presetIcons: { db: DbIcon },
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
				presetIcons: { storedData: StoredDataIcon },
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
				presetIcons: { subroutine: SubroutineIcon },
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
				presetIcons: { trapezoid: TrapezoidIcon },
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
				presetIcons: { manualInput: ManualInputIcon },
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
				presetIcons: { card: CardIcon },
			},
		}),

		container: defineObject({
			mapper: { toDoc: containerToDoc, toState: containerToState },
			features: ContainerFeatures,
			component: Container,
			textRegion: calcContainerTextRegion,
			behavior: createFrameBehavior<ContainerState>(),
			menuFactory: (_state) => [
				{
					id: "style",
					items: [
						{ type: "backgroundColor" },
						{
							type: "custom",
							id: "header-color",
							component: HeaderColorMenu,
						},
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
			validateState: isValidContainerState,
			selectionControls: [
				{
					Component: ContainerHeaderHeightControl,
					handler: new HeaderHeightControlHandler(),
				},
			],
			shapeLibrary: {
				factory: ContainerShapeFactory,
				previewRenderer: ContainerPreview,
				presets: ContainerShapePresets,
				presetIcons: {
					frame: FrameIcon,
					boundary: BoundaryIcon,
					zone: ZoneIcon,
				},
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
				presetIcons: { delay: DelayIcon },
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
				presetIcons: { loopLimit: LoopLimitIcon },
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
				presetIcons: { display: DisplayIcon },
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
				presetIcons: { extract: ExtractIcon },
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
				presetIcons: { cross: CrossIcon },
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
				presetIcons: { offPageConnector: OffPageConnectorIcon },
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

	for (const [type, definition] of Object.entries(ALL_OBJECT_DEFINITIONS)) {
		applyObjectDefinition(registries, type, definition);
	}
};
