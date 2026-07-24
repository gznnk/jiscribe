import type { CanvasRegistries } from "./CanvasRegistries";
import { defineObject } from "../../plugin/ObjectTypeDefinition";
import type {
	AnyObjectTypeDefinition,
	ObjectTypeDefinition,
} from "../../plugin/ObjectTypeDefinition";
import {
	Callout,
	calcCalloutTextRegion,
	calloutOutline,
} from "../../presentations/objects/annotations/Callout";
import { Sticky } from "../../presentations/objects/annotations/Sticky";
import { Connector } from "../../presentations/objects/connections/Connector";
import {
	Card,
	calcCardTextRegion,
	cardOutline,
} from "../../presentations/objects/flowchart/Card";
import {
	Cross,
	crossOutline,
} from "../../presentations/objects/flowchart/Cross";
import {
	Db,
	calcDbTextRegion,
	dbOutline,
} from "../../presentations/objects/flowchart/Db";
import {
	Delay,
	calcDelayTextRegion,
	delayOutline,
} from "../../presentations/objects/flowchart/Delay";
import {
	Diamond,
	calcDiamondTextRegion,
	diamondOutline,
} from "../../presentations/objects/flowchart/Diamond";
import {
	Display,
	calcDisplayTextRegion,
	displayOutline,
} from "../../presentations/objects/flowchart/Display";
import {
	Document,
	calcDocumentTextRegion,
	documentOutline,
} from "../../presentations/objects/flowchart/Document";
import {
	Extract,
	extractOutline,
} from "../../presentations/objects/flowchart/Extract";
import {
	Hexagon,
	calcHexagonTextRegion,
	hexagonOutline,
} from "../../presentations/objects/flowchart/Hexagon";
import {
	LoopLimit,
	calcLoopLimitTextRegion,
	loopLimitOutline,
} from "../../presentations/objects/flowchart/LoopLimit";
import {
	ManualInput,
	calcManualInputTextRegion,
	manualInputOutline,
} from "../../presentations/objects/flowchart/ManualInput";
import {
	MultiDocument,
	calcMultiDocumentTextRegion,
	multiDocumentOutline,
} from "../../presentations/objects/flowchart/MultiDocument";
import {
	OffPageConnector,
	calcOffPageConnectorTextRegion,
	offPageConnectorOutline,
} from "../../presentations/objects/flowchart/OffPageConnector";
import {
	Parallelogram,
	calcParallelogramTextRegion,
	parallelogramOutline,
} from "../../presentations/objects/flowchart/Parallelogram";
import {
	Stadium,
	calcStadiumTextRegion,
	stadiumOutline,
} from "../../presentations/objects/flowchart/Stadium";
import {
	StoredData,
	calcStoredDataTextRegion,
	storedDataOutline,
} from "../../presentations/objects/flowchart/StoredData";
import {
	Subroutine,
	calcSubroutineTextRegion,
} from "../../presentations/objects/flowchart/Subroutine";
import {
	Trapezoid,
	calcTrapezoidTextRegion,
	trapezoidOutline,
} from "../../presentations/objects/flowchart/Trapezoid";
import {
	Actor,
	calcActorTextRegion,
} from "../../presentations/objects/general/Actor";
import {
	Cloud,
	calcCloudTextRegion,
	cloudOutline,
} from "../../presentations/objects/general/Cloud";
import {
	Ellipse,
	calcEllipseTextRegion,
} from "../../presentations/objects/primitives/Ellipse";
import { Polygon } from "../../presentations/objects/primitives/Polygon";
import { Polyline } from "../../presentations/objects/primitives/Polyline";
import { Rect } from "../../presentations/objects/primitives/Rect";
import { Svg } from "../../presentations/objects/primitives/Svg";
import { CalloutFeatures } from "../../schemas/objects/annotations/callout/CalloutDoc";
import { CalloutObjectFactory } from "../../schemas/objects/annotations/callout/CalloutObjectFactory";
import { StickyFeatures } from "../../schemas/objects/annotations/sticky/StickyDoc";
import { StickyObjectFactory } from "../../schemas/objects/annotations/sticky/StickyObjectFactory";
import {
	ConnectorExtraStyleProperties,
	ConnectorFeatures,
} from "../../schemas/objects/connections/connector/ConnectorDoc";
import { CardFeatures } from "../../schemas/objects/flowchart/card/CardDoc";
import { CardObjectFactory } from "../../schemas/objects/flowchart/card/CardObjectFactory";
import { CrossFeatures } from "../../schemas/objects/flowchart/cross/CrossDoc";
import { CrossObjectFactory } from "../../schemas/objects/flowchart/cross/CrossObjectFactory";
import { DbFeatures } from "../../schemas/objects/flowchart/db/DbDoc";
import { DbObjectFactory } from "../../schemas/objects/flowchart/db/DbObjectFactory";
import { DelayFeatures } from "../../schemas/objects/flowchart/delay/DelayDoc";
import { DelayObjectFactory } from "../../schemas/objects/flowchart/delay/DelayObjectFactory";
import { DiamondFeatures } from "../../schemas/objects/flowchart/diamond/DiamondDoc";
import { DiamondObjectFactory } from "../../schemas/objects/flowchart/diamond/DiamondObjectFactory";
import { DisplayFeatures } from "../../schemas/objects/flowchart/display/DisplayDoc";
import { DisplayObjectFactory } from "../../schemas/objects/flowchart/display/DisplayObjectFactory";
import { DocumentFeatures } from "../../schemas/objects/flowchart/document/DocumentDoc";
import { DocumentObjectFactory } from "../../schemas/objects/flowchart/document/DocumentObjectFactory";
import { ExtractFeatures } from "../../schemas/objects/flowchart/extract/ExtractDoc";
import { ExtractObjectFactory } from "../../schemas/objects/flowchart/extract/ExtractObjectFactory";
import { HexagonFeatures } from "../../schemas/objects/flowchart/hexagon/HexagonDoc";
import { HexagonObjectFactory } from "../../schemas/objects/flowchart/hexagon/HexagonObjectFactory";
import { LoopLimitFeatures } from "../../schemas/objects/flowchart/loopLimit/LoopLimitDoc";
import { LoopLimitObjectFactory } from "../../schemas/objects/flowchart/loopLimit/LoopLimitObjectFactory";
import { ManualInputFeatures } from "../../schemas/objects/flowchart/manualInput/ManualInputDoc";
import { ManualInputObjectFactory } from "../../schemas/objects/flowchart/manualInput/ManualInputObjectFactory";
import { MultiDocumentFeatures } from "../../schemas/objects/flowchart/multiDocument/MultiDocumentDoc";
import { MultiDocumentObjectFactory } from "../../schemas/objects/flowchart/multiDocument/MultiDocumentObjectFactory";
import { OffPageConnectorFeatures } from "../../schemas/objects/flowchart/offPageConnector/OffPageConnectorDoc";
import { OffPageConnectorObjectFactory } from "../../schemas/objects/flowchart/offPageConnector/OffPageConnectorObjectFactory";
import { ParallelogramFeatures } from "../../schemas/objects/flowchart/parallelogram/ParallelogramDoc";
import { ParallelogramObjectFactory } from "../../schemas/objects/flowchart/parallelogram/ParallelogramObjectFactory";
import { StadiumFeatures } from "../../schemas/objects/flowchart/stadium/StadiumDoc";
import { StadiumObjectFactory } from "../../schemas/objects/flowchart/stadium/StadiumObjectFactory";
import { StoredDataFeatures } from "../../schemas/objects/flowchart/storedData/StoredDataDoc";
import { StoredDataObjectFactory } from "../../schemas/objects/flowchart/storedData/StoredDataObjectFactory";
import { SubroutineFeatures } from "../../schemas/objects/flowchart/subroutine/SubroutineDoc";
import { SubroutineObjectFactory } from "../../schemas/objects/flowchart/subroutine/SubroutineObjectFactory";
import { TrapezoidFeatures } from "../../schemas/objects/flowchart/trapezoid/TrapezoidDoc";
import { TrapezoidObjectFactory } from "../../schemas/objects/flowchart/trapezoid/TrapezoidObjectFactory";
import { ActorFeatures } from "../../schemas/objects/general/actor/ActorDoc";
import { ActorObjectFactory } from "../../schemas/objects/general/actor/ActorObjectFactory";
import { CloudFeatures } from "../../schemas/objects/general/cloud/CloudDoc";
import { CloudObjectFactory } from "../../schemas/objects/general/cloud/CloudObjectFactory";
import { EllipseFeatures } from "../../schemas/objects/primitives/ellipse/EllipseDoc";
import { EllipseObjectFactory } from "../../schemas/objects/primitives/ellipse/EllipseObjectFactory";
import { GroupFeatures } from "../../schemas/objects/primitives/group/GroupDoc";
import { PolygonFeatures } from "../../schemas/objects/primitives/polygon/PolygonDoc";
import { PolygonObjectFactory } from "../../schemas/objects/primitives/polygon/PolygonObjectFactory";
import { PolylineFeatures } from "../../schemas/objects/primitives/polyline/PolylineDoc";
import { PolylineObjectFactory } from "../../schemas/objects/primitives/polyline/PolylineObjectFactory";
import { RectFeatures } from "../../schemas/objects/primitives/rect/RectDoc";
import { RectObjectFactory } from "../../schemas/objects/primitives/rect/RectObjectFactory";
import { SvgFeatures } from "../../schemas/objects/primitives/svg/SvgDoc";
import type { ObjectType } from "../../schemas/objects/types/ObjectType";
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
import { CalloutTailTipControl } from "../ui/controls/CalloutTailControls";
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
import { createDefaultMenu } from "../ui/menu/ObjectMenu/utils/createDefaultMenu";
import { CalloutStencilPresets } from "../ui/objects/annotations/CalloutStencilPresets";
import { StickyStencilPresets } from "../ui/objects/annotations/StickyStencilPresets";
import { CardStencilPresets } from "../ui/objects/flowchart/CardStencilPresets";
import { CrossStencilPresets } from "../ui/objects/flowchart/CrossStencilPresets";
import { DbStencilPresets } from "../ui/objects/flowchart/DbStencilPresets";
import { DelayStencilPresets } from "../ui/objects/flowchart/DelayStencilPresets";
import { DiamondStencilPresets } from "../ui/objects/flowchart/DiamondStencilPresets";
import { DisplayStencilPresets } from "../ui/objects/flowchart/DisplayStencilPresets";
import { DocumentStencilPresets } from "../ui/objects/flowchart/DocumentStencilPresets";
import { ExtractStencilPresets } from "../ui/objects/flowchart/ExtractStencilPresets";
import { HexagonStencilPresets } from "../ui/objects/flowchart/HexagonStencilPresets";
import { LoopLimitStencilPresets } from "../ui/objects/flowchart/LoopLimitStencilPresets";
import { ManualInputStencilPresets } from "../ui/objects/flowchart/ManualInputStencilPresets";
import { MultiDocumentStencilPresets } from "../ui/objects/flowchart/MultiDocumentStencilPresets";
import { OffPageConnectorStencilPresets } from "../ui/objects/flowchart/OffPageConnectorStencilPresets";
import { ParallelogramStencilPresets } from "../ui/objects/flowchart/ParallelogramStencilPresets";
import { StadiumStencilPresets } from "../ui/objects/flowchart/StadiumStencilPresets";
import { StoredDataStencilPresets } from "../ui/objects/flowchart/StoredDataStencilPresets";
import { SubroutineStencilPresets } from "../ui/objects/flowchart/SubroutineStencilPresets";
import { TrapezoidStencilPresets } from "../ui/objects/flowchart/TrapezoidStencilPresets";
import { ActorStencilPresets } from "../ui/objects/general/ActorStencilPresets";
import { CloudStencilPresets } from "../ui/objects/general/CloudStencilPresets";
import { EllipseStencilPresets } from "../ui/objects/primitives/EllipseStencilPresets";
import { PolygonStencilPresets } from "../ui/objects/primitives/PolygonStencilPresets";
import { PolylineStencilPresets } from "../ui/objects/primitives/PolylineStencilPresets";
import { RectStencilPresets } from "../ui/objects/primitives/RectStencilPresets";

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
			stateValidator: isValidRectState,
			factory: RectObjectFactory,
			stencilPresets: RectStencilPresets,
		}),

		ellipse: defineObject({
			mapper: { toDoc: ellipseToDoc, toState: ellipseToState },
			features: EllipseFeatures,
			component: Ellipse,
			textRegion: calcEllipseTextRegion,
			behavior: createFrameBehavior<EllipseState>(),
			stateValidator: isValidEllipseState,
			factory: EllipseObjectFactory,
			stencilPresets: EllipseStencilPresets,
		}),

		diamond: defineObject({
			mapper: { toDoc: diamondToDoc, toState: diamondToState },
			features: DiamondFeatures,
			component: Diamond,
			textRegion: calcDiamondTextRegion,
			outline: diamondOutline,
			behavior: createFrameBehavior<DiamondState>(),
			stateValidator: isValidDiamondState,
			factory: DiamondObjectFactory,
			stencilPresets: DiamondStencilPresets,
		}),

		stadium: defineObject({
			mapper: { toDoc: stadiumToDoc, toState: stadiumToState },
			features: StadiumFeatures,
			component: Stadium,
			textRegion: calcStadiumTextRegion,
			outline: stadiumOutline,
			behavior: createFrameBehavior<StadiumState>(),
			stateValidator: isValidStadiumState,
			factory: StadiumObjectFactory,
			stencilPresets: StadiumStencilPresets,
		}),

		parallelogram: defineObject({
			mapper: { toDoc: parallelogramToDoc, toState: parallelogramToState },
			features: ParallelogramFeatures,
			component: Parallelogram,
			textRegion: calcParallelogramTextRegion,
			outline: parallelogramOutline,
			behavior: createFrameBehavior<ParallelogramState>(),
			stateValidator: isValidParallelogramState,
			factory: ParallelogramObjectFactory,
			stencilPresets: ParallelogramStencilPresets,
		}),

		hexagon: defineObject({
			mapper: { toDoc: hexagonToDoc, toState: hexagonToState },
			features: HexagonFeatures,
			component: Hexagon,
			textRegion: calcHexagonTextRegion,
			outline: hexagonOutline,
			behavior: createFrameBehavior<HexagonState>(),
			stateValidator: isValidHexagonState,
			factory: HexagonObjectFactory,
			stencilPresets: HexagonStencilPresets,
		}),

		cloud: defineObject({
			mapper: { toDoc: cloudToDoc, toState: cloudToState },
			features: CloudFeatures,
			component: Cloud,
			textRegion: calcCloudTextRegion,
			outline: cloudOutline,
			behavior: createFrameBehavior<CloudState>(),
			stateValidator: isValidCloudState,
			factory: CloudObjectFactory,
			stencilPresets: CloudStencilPresets,
		}),

		document: defineObject({
			mapper: { toDoc: documentToDoc, toState: documentToState },
			features: DocumentFeatures,
			component: Document,
			textRegion: calcDocumentTextRegion,
			outline: documentOutline,
			behavior: createFrameBehavior<DocumentState>(),
			stateValidator: isValidDocumentState,
			factory: DocumentObjectFactory,
			stencilPresets: DocumentStencilPresets,
		}),

		multiDocument: defineObject({
			mapper: { toDoc: multiDocumentToDoc, toState: multiDocumentToState },
			features: MultiDocumentFeatures,
			component: MultiDocument,
			textRegion: calcMultiDocumentTextRegion,
			outline: multiDocumentOutline,
			behavior: createFrameBehavior<MultiDocumentState>(),
			stateValidator: isValidMultiDocumentState,
			factory: MultiDocumentObjectFactory,
			stencilPresets: MultiDocumentStencilPresets,
		}),

		actor: defineObject({
			mapper: { toDoc: actorToDoc, toState: actorToState },
			features: ActorFeatures,
			component: Actor,
			textRegion: calcActorTextRegion,
			behavior: createFrameBehavior<ActorState>(),
			stateValidator: isValidActorState,
			factory: ActorObjectFactory,
			stencilPresets: ActorStencilPresets,
		}),

		callout: defineObject({
			mapper: { toDoc: calloutToDoc, toState: calloutToState },
			features: CalloutFeatures,
			component: Callout,
			textRegion: calcCalloutTextRegion,
			outline: calloutOutline,
			behavior: createFrameBehavior<CalloutState>(),
			stateValidator: isValidCalloutState,
			selectionControls: [
				{
					Component: CalloutTailTipControl,
					handler: new TailTipControlHandler(),
				},
			],
			factory: CalloutObjectFactory,
			stencilPresets: CalloutStencilPresets,
		}),

		db: defineObject({
			mapper: { toDoc: dbToDoc, toState: dbToState },
			features: DbFeatures,
			component: Db,
			textRegion: calcDbTextRegion,
			outline: dbOutline,
			behavior: createFrameBehavior<DbState>(),
			stateValidator: isValidDbState,
			factory: DbObjectFactory,
			stencilPresets: DbStencilPresets,
		}),

		storedData: defineObject({
			mapper: { toDoc: storedDataToDoc, toState: storedDataToState },
			features: StoredDataFeatures,
			component: StoredData,
			textRegion: calcStoredDataTextRegion,
			outline: storedDataOutline,
			behavior: createFrameBehavior<StoredDataState>(),
			stateValidator: isValidStoredDataState,
			factory: StoredDataObjectFactory,
			stencilPresets: StoredDataStencilPresets,
		}),

		subroutine: defineObject({
			mapper: { toDoc: subroutineToDoc, toState: subroutineToState },
			features: SubroutineFeatures,
			component: Subroutine,
			textRegion: calcSubroutineTextRegion,
			behavior: createFrameBehavior<SubroutineState>(),
			stateValidator: isValidSubroutineState,
			factory: SubroutineObjectFactory,
			stencilPresets: SubroutineStencilPresets,
		}),

		trapezoid: defineObject({
			mapper: { toDoc: trapezoidToDoc, toState: trapezoidToState },
			features: TrapezoidFeatures,
			component: Trapezoid,
			textRegion: calcTrapezoidTextRegion,
			outline: trapezoidOutline,
			behavior: createFrameBehavior<TrapezoidState>(),
			stateValidator: isValidTrapezoidState,
			factory: TrapezoidObjectFactory,
			stencilPresets: TrapezoidStencilPresets,
		}),

		manualInput: defineObject({
			mapper: { toDoc: manualInputToDoc, toState: manualInputToState },
			features: ManualInputFeatures,
			component: ManualInput,
			textRegion: calcManualInputTextRegion,
			outline: manualInputOutline,
			behavior: createFrameBehavior<ManualInputState>(),
			stateValidator: isValidManualInputState,
			factory: ManualInputObjectFactory,
			stencilPresets: ManualInputStencilPresets,
		}),

		card: defineObject({
			mapper: { toDoc: cardToDoc, toState: cardToState },
			features: CardFeatures,
			component: Card,
			textRegion: calcCardTextRegion,
			outline: cardOutline,
			behavior: createFrameBehavior<CardState>(),
			stateValidator: isValidCardState,
			factory: CardObjectFactory,
			stencilPresets: CardStencilPresets,
		}),

		delay: defineObject({
			mapper: { toDoc: delayToDoc, toState: delayToState },
			features: DelayFeatures,
			component: Delay,
			textRegion: calcDelayTextRegion,
			outline: delayOutline,
			behavior: createFrameBehavior<DelayState>(),
			stateValidator: isValidDelayState,
			factory: DelayObjectFactory,
			stencilPresets: DelayStencilPresets,
		}),

		loopLimit: defineObject({
			mapper: { toDoc: loopLimitToDoc, toState: loopLimitToState },
			features: LoopLimitFeatures,
			component: LoopLimit,
			textRegion: calcLoopLimitTextRegion,
			outline: loopLimitOutline,
			behavior: createFrameBehavior<LoopLimitState>(),
			stateValidator: isValidLoopLimitState,
			factory: LoopLimitObjectFactory,
			stencilPresets: LoopLimitStencilPresets,
		}),

		display: defineObject({
			mapper: { toDoc: displayToDoc, toState: displayToState },
			features: DisplayFeatures,
			component: Display,
			textRegion: calcDisplayTextRegion,
			outline: displayOutline,
			behavior: createFrameBehavior<DisplayState>(),
			stateValidator: isValidDisplayState,
			factory: DisplayObjectFactory,
			stencilPresets: DisplayStencilPresets,
		}),

		extract: defineObject({
			mapper: { toDoc: extractToDoc, toState: extractToState },
			features: ExtractFeatures,
			component: Extract,
			outline: extractOutline,
			behavior: createFrameBehavior<ExtractState>(),
			stateValidator: isValidExtractState,
			factory: ExtractObjectFactory,
			stencilPresets: ExtractStencilPresets,
		}),

		cross: defineObject({
			mapper: { toDoc: crossToDoc, toState: crossToState },
			features: CrossFeatures,
			component: Cross,
			outline: crossOutline,
			behavior: createFrameBehavior<CrossState>(),
			stateValidator: isValidCrossState,
			factory: CrossObjectFactory,
			stencilPresets: CrossStencilPresets,
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
			stateValidator: isValidOffPageConnectorState,
			factory: OffPageConnectorObjectFactory,
			stencilPresets: OffPageConnectorStencilPresets,
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
			stateValidator: isValidGroupState,
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
			stateValidator: isValidPolygonState,
			factory: PolygonObjectFactory,
			stencilPresets: PolygonStencilPresets,
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
			stateValidator: isValidPolylineState,
			factory: PolylineObjectFactory,
			stencilPresets: PolylineStencilPresets,
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
			stateValidator: isValidConnectorState,
		}),

		sticky: defineObject({
			mapper: { toDoc: stickyToDoc, toState: stickyToState },
			features: StickyFeatures,
			component: Sticky,
			behavior: createFrameBehavior<StickyState>(),
			menu: [
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
			stateValidator: isValidStickyState,
			factory: StickyObjectFactory,
			stencilPresets: StickyStencilPresets,
		}),

		// SVG is not created from the StencilLibrary (only added via AI / direct .jis.json authoring).
		// Therefore factory / stencilPresets are not registered.
		svg: defineObject({
			mapper: { toDoc: svgToDoc, toState: svgToState },
			features: SvgFeatures,
			component: Svg,
			behavior: createFrameBehavior<SvgState>(),
			stateValidator: isValidSvgState,
		}),
	};

/**
 * Registers a single object type described by `definition` across all registries
 * in the given bundle (mapper, component, text region, behavior, state validator,
 * menu), and optionally its factory / stencil presets.
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
	if (definition.textRegion) {
		registries.objectTextRegion.register(type, definition.textRegion);
	}
	if (definition.outline) {
		registries.objectOutline.register(type, definition.outline);
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
	} else if (definition.stencilPresets) {
		throw new Error(
			`applyObjectDefinition: object type "${type}" declares stencilPresets but no factory (click-placement and drag-drawing both require a factory)`,
		);
	}
	definition.stencilPresets?.forEach((preset) => {
		registries.stencilPreset.register(preset);
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
	registries.objectTextRegion.clear();
	registries.objectOutline.clear();
	registries.objectBehavior.clear();
	registries.objectStateValidator.clear();
	registries.objectMenu.clear();
	registries.selectionControl.clear();
	registries.objectFactory.clear();
	registries.stencilPreset.clear();
	registries.styleProperty.clearExtras();

	for (const [type, definition] of Object.entries(ALL_OBJECT_DEFINITIONS)) {
		applyObjectDefinition(registries, type, definition);
	}
};
