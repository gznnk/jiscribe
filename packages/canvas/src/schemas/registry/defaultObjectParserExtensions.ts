import type { ObjectParserExtension } from "./ObjectDocValidatorRegistry";
import { CalloutFeatures } from "../objects/annotations/callout/CalloutDoc";
import { validateCalloutDoc } from "../objects/annotations/callout/validateCalloutDoc";
import { StickyFeatures } from "../objects/annotations/sticky/StickyDoc";
import { validateStickyDoc } from "../objects/annotations/sticky/validateStickyDoc";
import { ConnectorFeatures } from "../objects/connections/connector/ConnectorDoc";
import { validateConnectorDoc } from "../objects/connections/connector/validateConnectorDoc";
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
	{ type: "cloud", features: CloudFeatures, validateDoc: validateCloudDoc },
	{ type: "actor", features: ActorFeatures, validateDoc: validateActorDoc },
	{
		type: "callout",
		features: CalloutFeatures,
		validateDoc: validateCalloutDoc,
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
