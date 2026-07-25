import { CalloutFeatures } from "../objects/annotations/callout/CalloutDoc";
import { CalloutObjectFactory } from "../objects/annotations/callout/CalloutObjectFactory";
import { validateCalloutDoc } from "../objects/annotations/callout/validateCalloutDoc";
import { StickyFeatures } from "../objects/annotations/sticky/StickyDoc";
import { StickyObjectFactory } from "../objects/annotations/sticky/StickyObjectFactory";
import { validateStickyDoc } from "../objects/annotations/sticky/validateStickyDoc";
import { ConnectorFeatures } from "../objects/connections/connector/ConnectorDoc";
import { validateConnectorDoc } from "../objects/connections/connector/validateConnectorDoc";
import { ActorFeatures } from "../objects/general/actor/ActorDoc";
import { ActorObjectFactory } from "../objects/general/actor/ActorObjectFactory";
import { validateActorDoc } from "../objects/general/actor/validateActorDoc";
import { CloudFeatures } from "../objects/general/cloud/CloudDoc";
import { CloudObjectFactory } from "../objects/general/cloud/CloudObjectFactory";
import { validateCloudDoc } from "../objects/general/cloud/validateCloudDoc";
import { EllipseFeatures } from "../objects/primitives/ellipse/EllipseDoc";
import { EllipseObjectFactory } from "../objects/primitives/ellipse/EllipseObjectFactory";
import { validateEllipseDoc } from "../objects/primitives/ellipse/validateEllipseDoc";
import { GroupFeatures } from "../objects/primitives/group/GroupDoc";
import { validateGroupDoc } from "../objects/primitives/group/validateGroupDoc";
import { PolygonFeatures } from "../objects/primitives/polygon/PolygonDoc";
import { PolygonObjectFactory } from "../objects/primitives/polygon/PolygonObjectFactory";
import { validatePolygonDoc } from "../objects/primitives/polygon/validatePolygonDoc";
import { PolylineFeatures } from "../objects/primitives/polyline/PolylineDoc";
import { PolylineObjectFactory } from "../objects/primitives/polyline/PolylineObjectFactory";
import { validatePolylineDoc } from "../objects/primitives/polyline/validatePolylineDoc";
import { RectFeatures } from "../objects/primitives/rect/RectDoc";
import { RectObjectFactory } from "../objects/primitives/rect/RectObjectFactory";
import { validateRectDoc } from "../objects/primitives/rect/validateRectDoc";
import { SvgFeatures } from "../objects/primitives/svg/SvgDoc";
import { validateSvgDoc } from "../objects/primitives/svg/validateSvgDoc";
import type { ObjectDocDefinition } from "../plugin/ObjectDocDefinition";

/**
 * One {@link ObjectDocDefinition} per built-in object type — the single source of
 * truth for the headless (doc) layer of the built-ins. The UI table
 * (`ALL_OBJECT_DEFINITIONS`) spreads each entry and adds its render/interaction
 * fields; `initializeObjectDocValidatorRegistry` folds these into the global
 * registry; and `createCanvasParser`'s default config uses them verbatim.
 *
 * When adding a new built-in type, add its entry here (otherwise parse-time
 * structure validation and connectability checks report it as unknown). `factory`
 * is present only for types created programmatically (group / connector / svg have none).
 */
export const builtinObjectDocDefinitions = {
	rect: {
		features: RectFeatures,
		validateDoc: validateRectDoc,
		factory: RectObjectFactory,
	},
	ellipse: {
		features: EllipseFeatures,
		validateDoc: validateEllipseDoc,
		factory: EllipseObjectFactory,
	},
	cloud: {
		features: CloudFeatures,
		validateDoc: validateCloudDoc,
		factory: CloudObjectFactory,
	},
	actor: {
		features: ActorFeatures,
		validateDoc: validateActorDoc,
		factory: ActorObjectFactory,
	},
	callout: {
		features: CalloutFeatures,
		validateDoc: validateCalloutDoc,
		factory: CalloutObjectFactory,
	},
	group: {
		features: GroupFeatures,
		validateDoc: validateGroupDoc,
	},
	polygon: {
		features: PolygonFeatures,
		validateDoc: validatePolygonDoc,
		factory: PolygonObjectFactory,
	},
	polyline: {
		features: PolylineFeatures,
		validateDoc: validatePolylineDoc,
		factory: PolylineObjectFactory,
	},
	connector: {
		features: ConnectorFeatures,
		validateDoc: validateConnectorDoc,
	},
	sticky: {
		features: StickyFeatures,
		validateDoc: validateStickyDoc,
		factory: StickyObjectFactory,
	},
	svg: {
		features: SvgFeatures,
		validateDoc: validateSvgDoc,
	},
} satisfies Readonly<Record<string, ObjectDocDefinition>>;
