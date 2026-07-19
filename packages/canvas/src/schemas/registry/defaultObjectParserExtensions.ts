import type { ObjectParserExtension } from "./ObjectDocValidatorRegistry";
import { CalloutFeatures } from "../objects/annotations/callout/CalloutDoc";
import { validateCalloutDoc } from "../objects/annotations/callout/validateCalloutDoc";
import { StickyFeatures } from "../objects/annotations/sticky/StickyDoc";
import { validateStickyDoc } from "../objects/annotations/sticky/validateStickyDoc";
import { ConnectorFeatures } from "../objects/connections/connector/ConnectorDoc";
import { validateConnectorDoc } from "../objects/connections/connector/validateConnectorDoc";
import { ContainerFeatures } from "../objects/containers/container/ContainerDoc";
import { validateContainerDoc } from "../objects/containers/container/validateContainerDoc";
import { CardFeatures } from "../objects/flowchart/card/CardDoc";
import { validateCardDoc } from "../objects/flowchart/card/validateCardDoc";
import { CrossFeatures } from "../objects/flowchart/cross/CrossDoc";
import { validateCrossDoc } from "../objects/flowchart/cross/validateCrossDoc";
import { DbFeatures } from "../objects/flowchart/db/DbDoc";
import { validateDbDoc } from "../objects/flowchart/db/validateDbDoc";
import { DelayFeatures } from "../objects/flowchart/delay/DelayDoc";
import { validateDelayDoc } from "../objects/flowchart/delay/validateDelayDoc";
import { DiamondFeatures } from "../objects/flowchart/diamond/DiamondDoc";
import { validateDiamondDoc } from "../objects/flowchart/diamond/validateDiamondDoc";
import { DisplayFeatures } from "../objects/flowchart/display/DisplayDoc";
import { validateDisplayDoc } from "../objects/flowchart/display/validateDisplayDoc";
import { DocumentFeatures } from "../objects/flowchart/document/DocumentDoc";
import { validateDocumentDoc } from "../objects/flowchart/document/validateDocumentDoc";
import { ExtractFeatures } from "../objects/flowchart/extract/ExtractDoc";
import { validateExtractDoc } from "../objects/flowchart/extract/validateExtractDoc";
import { HexagonFeatures } from "../objects/flowchart/hexagon/HexagonDoc";
import { validateHexagonDoc } from "../objects/flowchart/hexagon/validateHexagonDoc";
import { LoopLimitFeatures } from "../objects/flowchart/loopLimit/LoopLimitDoc";
import { validateLoopLimitDoc } from "../objects/flowchart/loopLimit/validateLoopLimitDoc";
import { ManualInputFeatures } from "../objects/flowchart/manualInput/ManualInputDoc";
import { validateManualInputDoc } from "../objects/flowchart/manualInput/validateManualInputDoc";
import { MultiDocumentFeatures } from "../objects/flowchart/multiDocument/MultiDocumentDoc";
import { validateMultiDocumentDoc } from "../objects/flowchart/multiDocument/validateMultiDocumentDoc";
import { OffPageConnectorFeatures } from "../objects/flowchart/offPageConnector/OffPageConnectorDoc";
import { validateOffPageConnectorDoc } from "../objects/flowchart/offPageConnector/validateOffPageConnectorDoc";
import { ParallelogramFeatures } from "../objects/flowchart/parallelogram/ParallelogramDoc";
import { validateParallelogramDoc } from "../objects/flowchart/parallelogram/validateParallelogramDoc";
import { StadiumFeatures } from "../objects/flowchart/stadium/StadiumDoc";
import { validateStadiumDoc } from "../objects/flowchart/stadium/validateStadiumDoc";
import { StoredDataFeatures } from "../objects/flowchart/storedData/StoredDataDoc";
import { validateStoredDataDoc } from "../objects/flowchart/storedData/validateStoredDataDoc";
import { SubroutineFeatures } from "../objects/flowchart/subroutine/SubroutineDoc";
import { validateSubroutineDoc } from "../objects/flowchart/subroutine/validateSubroutineDoc";
import { TrapezoidFeatures } from "../objects/flowchart/trapezoid/TrapezoidDoc";
import { validateTrapezoidDoc } from "../objects/flowchart/trapezoid/validateTrapezoidDoc";
import { ActorFeatures } from "../objects/general/actor/ActorDoc";
import { validateActorDoc } from "../objects/general/actor/validateActorDoc";
import { CloudFeatures } from "../objects/general/cloud/CloudDoc";
import { validateCloudDoc } from "../objects/general/cloud/validateCloudDoc";
import { EllipseFeatures } from "../objects/primitives/ellipse/EllipseDoc";
import { validateEllipseDoc } from "../objects/primitives/ellipse/validateEllipseDoc";
import { GroupFeatures } from "../objects/primitives/group/GroupDoc";
import { validateGroupDoc } from "../objects/primitives/group/validateGroupDoc";
import { PolygonFeatures } from "../objects/primitives/polygon/PolygonDoc";
import { validatePolygonDoc } from "../objects/primitives/polygon/validatePolygonDoc";
import { PolylineFeatures } from "../objects/primitives/polyline/PolylineDoc";
import { validatePolylineDoc } from "../objects/primitives/polyline/validatePolylineDoc";
import { RectFeatures } from "../objects/primitives/rect/RectDoc";
import { validateRectDoc } from "../objects/primitives/rect/validateRectDoc";
import { SvgFeatures } from "../objects/primitives/svg/SvgDoc";
import { validateSvgDoc } from "../objects/primitives/svg/validateSvgDoc";

/**
 * One {@link ObjectParserExtension} entry per built-in object type. This is the single
 * source of truth for "which types parse-time validation knows about": `initializeObjectDocValidatorRegistry`
 * folds it into the global registry, and `createCanvasParser`'s default config (no
 * `presetExtensions` given) uses it verbatim. To swap out a builtin type for a plugin's
 * own extension of the same type name, filter this array and pass the replacement via
 * `extensions` (see `createCanvasParser`).
 *
 * When adding a new object type, add its entry here (otherwise both parse-time structure
 * validation and `validateSemantics`'s connectability checks report it as unknown).
 */
export const defaultObjectParserExtensions: readonly ObjectParserExtension[] = [
	{ type: "rect", features: RectFeatures, validateDoc: validateRectDoc },
	{
		type: "ellipse",
		features: EllipseFeatures,
		validateDoc: validateEllipseDoc,
	},
	{
		type: "diamond",
		features: DiamondFeatures,
		validateDoc: validateDiamondDoc,
	},
	{
		type: "stadium",
		features: StadiumFeatures,
		validateDoc: validateStadiumDoc,
	},
	{
		type: "parallelogram",
		features: ParallelogramFeatures,
		validateDoc: validateParallelogramDoc,
	},
	{
		type: "hexagon",
		features: HexagonFeatures,
		validateDoc: validateHexagonDoc,
	},
	{ type: "cloud", features: CloudFeatures, validateDoc: validateCloudDoc },
	{
		type: "document",
		features: DocumentFeatures,
		validateDoc: validateDocumentDoc,
	},
	{
		type: "multiDocument",
		features: MultiDocumentFeatures,
		validateDoc: validateMultiDocumentDoc,
	},
	{ type: "actor", features: ActorFeatures, validateDoc: validateActorDoc },
	{
		type: "callout",
		features: CalloutFeatures,
		validateDoc: validateCalloutDoc,
	},
	{ type: "db", features: DbFeatures, validateDoc: validateDbDoc },
	{
		type: "storedData",
		features: StoredDataFeatures,
		validateDoc: validateStoredDataDoc,
	},
	{
		type: "subroutine",
		features: SubroutineFeatures,
		validateDoc: validateSubroutineDoc,
	},
	{
		type: "trapezoid",
		features: TrapezoidFeatures,
		validateDoc: validateTrapezoidDoc,
	},
	{
		type: "manualInput",
		features: ManualInputFeatures,
		validateDoc: validateManualInputDoc,
	},
	{ type: "card", features: CardFeatures, validateDoc: validateCardDoc },
	{
		type: "container",
		features: ContainerFeatures,
		validateDoc: validateContainerDoc,
	},
	{ type: "delay", features: DelayFeatures, validateDoc: validateDelayDoc },
	{
		type: "loopLimit",
		features: LoopLimitFeatures,
		validateDoc: validateLoopLimitDoc,
	},
	{
		type: "display",
		features: DisplayFeatures,
		validateDoc: validateDisplayDoc,
	},
	{
		type: "extract",
		features: ExtractFeatures,
		validateDoc: validateExtractDoc,
	},
	{ type: "cross", features: CrossFeatures, validateDoc: validateCrossDoc },
	{
		type: "offPageConnector",
		features: OffPageConnectorFeatures,
		validateDoc: validateOffPageConnectorDoc,
	},
	{ type: "group", features: GroupFeatures, validateDoc: validateGroupDoc },
	{
		type: "polygon",
		features: PolygonFeatures,
		validateDoc: validatePolygonDoc,
	},
	{
		type: "polyline",
		features: PolylineFeatures,
		validateDoc: validatePolylineDoc,
	},
	{
		type: "connector",
		features: ConnectorFeatures,
		validateDoc: validateConnectorDoc,
	},
	{ type: "sticky", features: StickyFeatures, validateDoc: validateStickyDoc },
	{ type: "svg", features: SvgFeatures, validateDoc: validateSvgDoc },
];
