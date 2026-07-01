import { objectDocValidatorRegistry } from "./ObjectDocValidatorRegistry";
import { StickyFeatures } from "../objects/annotations/sticky/StickyDoc";
import { validateStickyDoc } from "../objects/annotations/sticky/validateStickyDoc";
import { ConnectorFeatures } from "../objects/connections/connector/ConnectorDoc";
import { validateConnectorDoc } from "../objects/connections/connector/validateConnectorDoc";
import { DiamondFeatures } from "../objects/primitives/diamond/DiamondDoc";
import { validateDiamondDoc } from "../objects/primitives/diamond/validateDiamondDoc";
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
 * The UI side ({@link import("../../controllers/setup/initializeObjectRegistry")})
 * calls this function alongside the other registries (components, gestures,
 * menus, etc.), centralizing the single source of truth for doc validator
 * registration here.
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
