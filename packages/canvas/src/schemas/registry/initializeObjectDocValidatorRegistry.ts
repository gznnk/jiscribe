import { objectDocValidatorRegistry } from "./ObjectDocValidatorRegistry";
import { StickyFeatures } from "../objects/annotations/sticky/StickyDoc";
import { validateStickyDoc } from "../objects/annotations/sticky/validateStickyDoc";
import { ConnectorFeatures } from "../objects/connections/connector/ConnectorDoc";
import { validateConnectorDoc } from "../objects/connections/connector/validateConnectorDoc";
import { ActorFeatures } from "../objects/primitives/actor/ActorDoc";
import { validateActorDoc } from "../objects/primitives/actor/validateActorDoc";
import { CalloutFeatures } from "../objects/primitives/callout/CalloutDoc";
import { validateCalloutDoc } from "../objects/primitives/callout/validateCalloutDoc";
import { CardFeatures } from "../objects/primitives/card/CardDoc";
import { validateCardDoc } from "../objects/primitives/card/validateCardDoc";
import { CloudFeatures } from "../objects/primitives/cloud/CloudDoc";
import { validateCloudDoc } from "../objects/primitives/cloud/validateCloudDoc";
import { CrossFeatures } from "../objects/primitives/cross/CrossDoc";
import { validateCrossDoc } from "../objects/primitives/cross/validateCrossDoc";
import { DbFeatures } from "../objects/primitives/db/DbDoc";
import { validateDbDoc } from "../objects/primitives/db/validateDbDoc";
import { DelayFeatures } from "../objects/primitives/delay/DelayDoc";
import { validateDelayDoc } from "../objects/primitives/delay/validateDelayDoc";
import { DiamondFeatures } from "../objects/primitives/diamond/DiamondDoc";
import { validateDiamondDoc } from "../objects/primitives/diamond/validateDiamondDoc";
import { DisplayFeatures } from "../objects/primitives/display/DisplayDoc";
import { validateDisplayDoc } from "../objects/primitives/display/validateDisplayDoc";
import { DocumentFeatures } from "../objects/primitives/document/DocumentDoc";
import { validateDocumentDoc } from "../objects/primitives/document/validateDocumentDoc";
import { EllipseFeatures } from "../objects/primitives/ellipse/EllipseDoc";
import { validateEllipseDoc } from "../objects/primitives/ellipse/validateEllipseDoc";
import { GroupFeatures } from "../objects/primitives/group/GroupDoc";
import { validateGroupDoc } from "../objects/primitives/group/validateGroupDoc";
import { HexagonFeatures } from "../objects/primitives/hexagon/HexagonDoc";
import { validateHexagonDoc } from "../objects/primitives/hexagon/validateHexagonDoc";
import { ManualInputFeatures } from "../objects/primitives/manualInput/ManualInputDoc";
import { validateManualInputDoc } from "../objects/primitives/manualInput/validateManualInputDoc";
import { ParallelogramFeatures } from "../objects/primitives/parallelogram/ParallelogramDoc";
import { validateParallelogramDoc } from "../objects/primitives/parallelogram/validateParallelogramDoc";
import { PolygonFeatures } from "../objects/primitives/polygon/PolygonDoc";
import { validatePolygonDoc } from "../objects/primitives/polygon/validatePolygonDoc";
import { PolylineFeatures } from "../objects/primitives/polyline/PolylineDoc";
import { validatePolylineDoc } from "../objects/primitives/polyline/validatePolylineDoc";
import { RectFeatures } from "../objects/primitives/rect/RectDoc";
import { validateRectDoc } from "../objects/primitives/rect/validateRectDoc";
import { StadiumFeatures } from "../objects/primitives/stadium/StadiumDoc";
import { validateStadiumDoc } from "../objects/primitives/stadium/validateStadiumDoc";
import { SubroutineFeatures } from "../objects/primitives/subroutine/SubroutineDoc";
import { validateSubroutineDoc } from "../objects/primitives/subroutine/validateSubroutineDoc";
import { SvgFeatures } from "../objects/primitives/svg/SvgDoc";
import { validateSvgDoc } from "../objects/primitives/svg/validateSvgDoc";
import { TrapezoidFeatures } from "../objects/primitives/trapezoid/TrapezoidDoc";
import { validateTrapezoidDoc } from "../objects/primitives/trapezoid/validateTrapezoidDoc";
import { TriangleFeatures } from "../objects/primitives/triangle/TriangleDoc";
import { validateTriangleDoc } from "../objects/primitives/triangle/validateTriangleDoc";

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
		"triangle",
		validateTriangleDoc,
		TriangleFeatures,
	);
	objectDocValidatorRegistry.register("cross", validateCrossDoc, CrossFeatures);
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
