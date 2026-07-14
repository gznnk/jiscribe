import { objectDocValidatorRegistry } from "./ObjectDocValidatorRegistry";
import { CalloutFeatures } from "../objects/annotations/callout/CalloutDoc";
import { validateCalloutDoc } from "../objects/annotations/callout/validateCalloutDoc";
import { StickyFeatures } from "../objects/annotations/sticky/StickyDoc";
import { validateStickyDoc } from "../objects/annotations/sticky/validateStickyDoc";
import { ConnectorFeatures } from "../objects/connections/connector/ConnectorDoc";
import { validateConnectorDoc } from "../objects/connections/connector/validateConnectorDoc";
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
import { ManualInputFeatures } from "../objects/flowchart/manualInput/ManualInputDoc";
import { validateManualInputDoc } from "../objects/flowchart/manualInput/validateManualInputDoc";
import { OffPageConnectorFeatures } from "../objects/flowchart/offPageConnector/OffPageConnectorDoc";
import { validateOffPageConnectorDoc } from "../objects/flowchart/offPageConnector/validateOffPageConnectorDoc";
import { ParallelogramFeatures } from "../objects/flowchart/parallelogram/ParallelogramDoc";
import { validateParallelogramDoc } from "../objects/flowchart/parallelogram/validateParallelogramDoc";
import { StadiumFeatures } from "../objects/flowchart/stadium/StadiumDoc";
import { validateStadiumDoc } from "../objects/flowchart/stadium/validateStadiumDoc";
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
 * Registers each type's doc validator and features into
 * {@link objectDocValidatorRegistry}.
 *
 * This is a schema-layer-only initialization, all that is needed to "just parse
 * and validate text into a CanvasDoc". It pulls in no UI dependencies such as
 * React / @emotion, so it can be safely called from the Node side of the VSCode
 * extension (the parser-only entry `./parser`).
 *
 * This registry is populated lazily at parse time: the only production caller is
 * {@link import("../canvas/validators/parseCanvasText").parseCanvasText}, which
 * calls this idempotently (guarded by `objectDocValidatorRegistry.isEmpty()`) when
 * it needs to validate. The UI-side
 * {@link import("../../controllers/setup/initializeObjectRegistry").initializeObjectRegistry}
 * intentionally does NOT initialize this registry (see the comment there); doc
 * validators are a schema-layer concern needed only during parse-time validation.
 *
 * When adding a new object type, do not forget to register it here (if this is
 * empty, {@link import("../canvas/validators/validateSemantics").validateSemantics}
 * reports every connectability check as false, producing false positives).
 */
export const initializeObjectDocValidatorRegistry = (): void => {
	objectDocValidatorRegistry.clear();
	objectDocValidatorRegistry.register("rect", validateRectDoc, RectFeatures);
	objectDocValidatorRegistry.register(
		"ellipse",
		validateEllipseDoc,
		EllipseFeatures,
	);
	objectDocValidatorRegistry.register(
		"diamond",
		validateDiamondDoc,
		DiamondFeatures,
	);
	objectDocValidatorRegistry.register(
		"stadium",
		validateStadiumDoc,
		StadiumFeatures,
	);
	objectDocValidatorRegistry.register(
		"parallelogram",
		validateParallelogramDoc,
		ParallelogramFeatures,
	);
	objectDocValidatorRegistry.register(
		"hexagon",
		validateHexagonDoc,
		HexagonFeatures,
	);
	objectDocValidatorRegistry.register("cloud", validateCloudDoc, CloudFeatures);
	objectDocValidatorRegistry.register(
		"document",
		validateDocumentDoc,
		DocumentFeatures,
	);
	objectDocValidatorRegistry.register("actor", validateActorDoc, ActorFeatures);
	objectDocValidatorRegistry.register(
		"callout",
		validateCalloutDoc,
		CalloutFeatures,
	);
	objectDocValidatorRegistry.register("db", validateDbDoc, DbFeatures);
	objectDocValidatorRegistry.register(
		"subroutine",
		validateSubroutineDoc,
		SubroutineFeatures,
	);
	objectDocValidatorRegistry.register(
		"trapezoid",
		validateTrapezoidDoc,
		TrapezoidFeatures,
	);
	objectDocValidatorRegistry.register(
		"manualInput",
		validateManualInputDoc,
		ManualInputFeatures,
	);
	objectDocValidatorRegistry.register("card", validateCardDoc, CardFeatures);
	objectDocValidatorRegistry.register("delay", validateDelayDoc, DelayFeatures);
	objectDocValidatorRegistry.register(
		"display",
		validateDisplayDoc,
		DisplayFeatures,
	);
	objectDocValidatorRegistry.register(
		"extract",
		validateExtractDoc,
		ExtractFeatures,
	);
	objectDocValidatorRegistry.register("cross", validateCrossDoc, CrossFeatures);
	objectDocValidatorRegistry.register(
		"offPageConnector",
		validateOffPageConnectorDoc,
		OffPageConnectorFeatures,
	);
	objectDocValidatorRegistry.register("group", validateGroupDoc, GroupFeatures);
	objectDocValidatorRegistry.register(
		"polygon",
		validatePolygonDoc,
		PolygonFeatures,
	);
	objectDocValidatorRegistry.register(
		"polyline",
		validatePolylineDoc,
		PolylineFeatures,
	);
	objectDocValidatorRegistry.register(
		"connector",
		validateConnectorDoc,
		ConnectorFeatures,
	);
	objectDocValidatorRegistry.register(
		"sticky",
		validateStickyDoc,
		StickyFeatures,
	);
	objectDocValidatorRegistry.register("svg", validateSvgDoc, SvgFeatures);
};
