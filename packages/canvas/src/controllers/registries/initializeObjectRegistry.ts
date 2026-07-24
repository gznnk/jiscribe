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
import { handleCalloutTailTip } from "../gestures/handlers/controls/callout/handleCalloutTailTip";
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
import { CalloutStencils } from "../ui/objects/annotations/CalloutStencils";
import { StickyStencils } from "../ui/objects/annotations/StickyStencils";
import { CardStencils } from "../ui/objects/flowchart/CardStencils";
import { CrossStencils } from "../ui/objects/flowchart/CrossStencils";
import { DbStencils } from "../ui/objects/flowchart/DbStencils";
import { DelayStencils } from "../ui/objects/flowchart/DelayStencils";
import { DiamondStencils } from "../ui/objects/flowchart/DiamondStencils";
import { DisplayStencils } from "../ui/objects/flowchart/DisplayStencils";
import { DocumentStencils } from "../ui/objects/flowchart/DocumentStencils";
import { ExtractStencils } from "../ui/objects/flowchart/ExtractStencils";
import { HexagonStencils } from "../ui/objects/flowchart/HexagonStencils";
import { LoopLimitStencils } from "../ui/objects/flowchart/LoopLimitStencils";
import { ManualInputStencils } from "../ui/objects/flowchart/ManualInputStencils";
import { MultiDocumentStencils } from "../ui/objects/flowchart/MultiDocumentStencils";
import { OffPageConnectorStencils } from "../ui/objects/flowchart/OffPageConnectorStencils";
import { ParallelogramStencils } from "../ui/objects/flowchart/ParallelogramStencils";
import { StadiumStencils } from "../ui/objects/flowchart/StadiumStencils";
import { StoredDataStencils } from "../ui/objects/flowchart/StoredDataStencils";
import { SubroutineStencils } from "../ui/objects/flowchart/SubroutineStencils";
import { TrapezoidStencils } from "../ui/objects/flowchart/TrapezoidStencils";
import { ActorStencils } from "../ui/objects/general/ActorStencils";
import { CloudStencils } from "../ui/objects/general/CloudStencils";
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
			features: RectFeatures,
			mapper: { toDoc: rectToDoc, toState: rectToState },
			stateValidator: isValidRectState,
			factory: RectObjectFactory,
			component: Rect,
			behavior: createFrameBehavior<RectState>(),
			stencils: RectStencils,
		}),

		ellipse: defineObject({
			features: EllipseFeatures,
			mapper: { toDoc: ellipseToDoc, toState: ellipseToState },
			stateValidator: isValidEllipseState,
			factory: EllipseObjectFactory,
			component: Ellipse,
			textRegion: calcEllipseTextRegion,
			behavior: createFrameBehavior<EllipseState>(),
			stencils: EllipseStencils,
		}),

		diamond: defineObject({
			features: DiamondFeatures,
			mapper: { toDoc: diamondToDoc, toState: diamondToState },
			stateValidator: isValidDiamondState,
			factory: DiamondObjectFactory,
			component: Diamond,
			textRegion: calcDiamondTextRegion,
			outline: diamondOutline,
			behavior: createFrameBehavior<DiamondState>(),
			stencils: DiamondStencils,
		}),

		stadium: defineObject({
			features: StadiumFeatures,
			mapper: { toDoc: stadiumToDoc, toState: stadiumToState },
			stateValidator: isValidStadiumState,
			factory: StadiumObjectFactory,
			component: Stadium,
			textRegion: calcStadiumTextRegion,
			outline: stadiumOutline,
			behavior: createFrameBehavior<StadiumState>(),
			stencils: StadiumStencils,
		}),

		parallelogram: defineObject({
			features: ParallelogramFeatures,
			mapper: { toDoc: parallelogramToDoc, toState: parallelogramToState },
			stateValidator: isValidParallelogramState,
			factory: ParallelogramObjectFactory,
			component: Parallelogram,
			textRegion: calcParallelogramTextRegion,
			outline: parallelogramOutline,
			behavior: createFrameBehavior<ParallelogramState>(),
			stencils: ParallelogramStencils,
		}),

		hexagon: defineObject({
			features: HexagonFeatures,
			mapper: { toDoc: hexagonToDoc, toState: hexagonToState },
			stateValidator: isValidHexagonState,
			factory: HexagonObjectFactory,
			component: Hexagon,
			textRegion: calcHexagonTextRegion,
			outline: hexagonOutline,
			behavior: createFrameBehavior<HexagonState>(),
			stencils: HexagonStencils,
		}),

		cloud: defineObject({
			features: CloudFeatures,
			mapper: { toDoc: cloudToDoc, toState: cloudToState },
			stateValidator: isValidCloudState,
			factory: CloudObjectFactory,
			component: Cloud,
			textRegion: calcCloudTextRegion,
			outline: cloudOutline,
			behavior: createFrameBehavior<CloudState>(),
			stencils: CloudStencils,
		}),

		document: defineObject({
			features: DocumentFeatures,
			mapper: { toDoc: documentToDoc, toState: documentToState },
			stateValidator: isValidDocumentState,
			factory: DocumentObjectFactory,
			component: Document,
			textRegion: calcDocumentTextRegion,
			outline: documentOutline,
			behavior: createFrameBehavior<DocumentState>(),
			stencils: DocumentStencils,
		}),

		multiDocument: defineObject({
			features: MultiDocumentFeatures,
			mapper: { toDoc: multiDocumentToDoc, toState: multiDocumentToState },
			stateValidator: isValidMultiDocumentState,
			factory: MultiDocumentObjectFactory,
			component: MultiDocument,
			textRegion: calcMultiDocumentTextRegion,
			outline: multiDocumentOutline,
			behavior: createFrameBehavior<MultiDocumentState>(),
			stencils: MultiDocumentStencils,
		}),

		actor: defineObject({
			features: ActorFeatures,
			mapper: { toDoc: actorToDoc, toState: actorToState },
			stateValidator: isValidActorState,
			factory: ActorObjectFactory,
			component: Actor,
			textRegion: calcActorTextRegion,
			behavior: createFrameBehavior<ActorState>(),
			stencils: ActorStencils,
		}),

		callout: defineObject({
			features: CalloutFeatures,
			mapper: { toDoc: calloutToDoc, toState: calloutToState },
			stateValidator: isValidCalloutState,
			factory: CalloutObjectFactory,
			component: Callout,
			textRegion: calcCalloutTextRegion,
			outline: calloutOutline,
			behavior: createFrameBehavior<CalloutState>(),
			selectionControls: [
				{
					name: "tailTip",
					Component: CalloutTailTipControl,
					handle: handleCalloutTailTip,
				},
			],
			stencils: CalloutStencils,
		}),

		db: defineObject({
			features: DbFeatures,
			mapper: { toDoc: dbToDoc, toState: dbToState },
			stateValidator: isValidDbState,
			factory: DbObjectFactory,
			component: Db,
			textRegion: calcDbTextRegion,
			outline: dbOutline,
			behavior: createFrameBehavior<DbState>(),
			stencils: DbStencils,
		}),

		storedData: defineObject({
			features: StoredDataFeatures,
			mapper: { toDoc: storedDataToDoc, toState: storedDataToState },
			stateValidator: isValidStoredDataState,
			factory: StoredDataObjectFactory,
			component: StoredData,
			textRegion: calcStoredDataTextRegion,
			outline: storedDataOutline,
			behavior: createFrameBehavior<StoredDataState>(),
			stencils: StoredDataStencils,
		}),

		subroutine: defineObject({
			features: SubroutineFeatures,
			mapper: { toDoc: subroutineToDoc, toState: subroutineToState },
			stateValidator: isValidSubroutineState,
			factory: SubroutineObjectFactory,
			component: Subroutine,
			textRegion: calcSubroutineTextRegion,
			behavior: createFrameBehavior<SubroutineState>(),
			stencils: SubroutineStencils,
		}),

		trapezoid: defineObject({
			features: TrapezoidFeatures,
			mapper: { toDoc: trapezoidToDoc, toState: trapezoidToState },
			stateValidator: isValidTrapezoidState,
			factory: TrapezoidObjectFactory,
			component: Trapezoid,
			textRegion: calcTrapezoidTextRegion,
			outline: trapezoidOutline,
			behavior: createFrameBehavior<TrapezoidState>(),
			stencils: TrapezoidStencils,
		}),

		manualInput: defineObject({
			features: ManualInputFeatures,
			mapper: { toDoc: manualInputToDoc, toState: manualInputToState },
			stateValidator: isValidManualInputState,
			factory: ManualInputObjectFactory,
			component: ManualInput,
			textRegion: calcManualInputTextRegion,
			outline: manualInputOutline,
			behavior: createFrameBehavior<ManualInputState>(),
			stencils: ManualInputStencils,
		}),

		card: defineObject({
			features: CardFeatures,
			mapper: { toDoc: cardToDoc, toState: cardToState },
			stateValidator: isValidCardState,
			factory: CardObjectFactory,
			component: Card,
			textRegion: calcCardTextRegion,
			outline: cardOutline,
			behavior: createFrameBehavior<CardState>(),
			stencils: CardStencils,
		}),

		delay: defineObject({
			features: DelayFeatures,
			mapper: { toDoc: delayToDoc, toState: delayToState },
			stateValidator: isValidDelayState,
			factory: DelayObjectFactory,
			component: Delay,
			textRegion: calcDelayTextRegion,
			outline: delayOutline,
			behavior: createFrameBehavior<DelayState>(),
			stencils: DelayStencils,
		}),

		loopLimit: defineObject({
			features: LoopLimitFeatures,
			mapper: { toDoc: loopLimitToDoc, toState: loopLimitToState },
			stateValidator: isValidLoopLimitState,
			factory: LoopLimitObjectFactory,
			component: LoopLimit,
			textRegion: calcLoopLimitTextRegion,
			outline: loopLimitOutline,
			behavior: createFrameBehavior<LoopLimitState>(),
			stencils: LoopLimitStencils,
		}),

		display: defineObject({
			features: DisplayFeatures,
			mapper: { toDoc: displayToDoc, toState: displayToState },
			stateValidator: isValidDisplayState,
			factory: DisplayObjectFactory,
			component: Display,
			textRegion: calcDisplayTextRegion,
			outline: displayOutline,
			behavior: createFrameBehavior<DisplayState>(),
			stencils: DisplayStencils,
		}),

		extract: defineObject({
			features: ExtractFeatures,
			mapper: { toDoc: extractToDoc, toState: extractToState },
			stateValidator: isValidExtractState,
			factory: ExtractObjectFactory,
			component: Extract,
			outline: extractOutline,
			behavior: createFrameBehavior<ExtractState>(),
			stencils: ExtractStencils,
		}),

		cross: defineObject({
			features: CrossFeatures,
			mapper: { toDoc: crossToDoc, toState: crossToState },
			stateValidator: isValidCrossState,
			factory: CrossObjectFactory,
			component: Cross,
			outline: crossOutline,
			behavior: createFrameBehavior<CrossState>(),
			stencils: CrossStencils,
		}),

		offPageConnector: defineObject({
			features: OffPageConnectorFeatures,
			mapper: {
				toDoc: offPageConnectorToDoc,
				toState: offPageConnectorToState,
			},
			stateValidator: isValidOffPageConnectorState,
			factory: OffPageConnectorObjectFactory,
			component: OffPageConnector,
			textRegion: calcOffPageConnectorTextRegion,
			outline: offPageConnectorOutline,
			behavior: createFrameBehavior<OffPageConnectorState>(),
			stencils: OffPageConnectorStencils,
		}),

		group: defineObject({
			features: GroupFeatures,
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
			features: PolygonFeatures,
			mapper: { toDoc: polygonToDoc, toState: polygonToState },
			stateValidator: isValidPolygonState,
			factory: PolygonObjectFactory,
			component: Polygon,
			behavior: {
				moveByDelta: polygonMoveByDelta,
				transformByGroup: polygonTransformByGroup,
				rotateByGroup: polygonRotateByGroup,
			},
			stencils: PolygonStencils,
		}),

		polyline: defineObject({
			features: PolylineFeatures,
			mapper: { toDoc: polylineToDoc, toState: polylineToState },
			stateValidator: isValidPolylineState,
			factory: PolylineObjectFactory,
			component: Polyline,
			behavior: {
				moveByDelta: polylineMoveByDelta,
				transformByGroup: polylineTransformByGroup,
				rotateByGroup: polylineRotateByGroup,
			},
			stencils: PolylineStencils,
		}),

		connector: defineObject({
			features: ConnectorFeatures,
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

		sticky: defineObject({
			features: StickyFeatures,
			mapper: { toDoc: stickyToDoc, toState: stickyToState },
			stateValidator: isValidStickyState,
			factory: StickyObjectFactory,
			component: Sticky,
			behavior: createFrameBehavior<StickyState>(),
			stencils: StickyStencils,
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
		}),

		// SVG is not created from the StencilLibrary (only added via AI / direct .jis.json authoring).
		// Therefore factory / stencils are not registered.
		svg: defineObject({
			features: SvgFeatures,
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
	registries.objectTextRegion.clear();
	registries.objectOutline.clear();
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
