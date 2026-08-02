import {
	CALLOUT_DOC_DEFAULTS,
	CalloutFeatures,
} from "../objects/annotations/callout/CalloutDoc";
import { CalloutObjectFactory } from "../objects/annotations/callout/CalloutObjectFactory";
import { validateCalloutDoc } from "../objects/annotations/callout/validateCalloutDoc";
import {
	STICKY_DOC_DEFAULTS,
	StickyFeatures,
} from "../objects/annotations/sticky/StickyDoc";
import { StickyObjectFactory } from "../objects/annotations/sticky/StickyObjectFactory";
import { validateStickyDoc } from "../objects/annotations/sticky/validateStickyDoc";
import { ConnectorFeatures } from "../objects/connections/connector/ConnectorDoc";
import { validateConnectorDoc } from "../objects/connections/connector/validateConnectorDoc";
import {
	CLOUD_DOC_DEFAULTS,
	CloudFeatures,
} from "../objects/general/cloud/CloudDoc";
import { CloudObjectFactory } from "../objects/general/cloud/CloudObjectFactory";
import { validateCloudDoc } from "../objects/general/cloud/validateCloudDoc";
import {
	ELLIPSE_DOC_DEFAULTS,
	EllipseFeatures,
} from "../objects/primitives/ellipse/EllipseDoc";
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
import {
	RECT_DOC_DEFAULTS,
	RectFeatures,
} from "../objects/primitives/rect/RectDoc";
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
 *
 * `description` / `summary` / `defaults` feed the generated JSON schema and AI docs
 * (`pnpm generate:ai`); types whose schema `$def` is a handwritten template
 * (group / connector / svg / polyline / polygon) carry only `summary`.
 */
export const builtinObjectDocDefinitions = {
	rect: {
		features: RectFeatures,
		validateDoc: validateRectDoc,
		factory: RectObjectFactory,
		description: "Rectangle shape.",
		summary: "general-purpose node / label box",
		defaults: RECT_DOC_DEFAULTS,
	},
	ellipse: {
		features: EllipseFeatures,
		validateDoc: validateEllipseDoc,
		factory: EllipseObjectFactory,
		description: "Ellipse (oval) shape.",
		summary: "ellipse / oval node (center-based geometry)",
		defaults: ELLIPSE_DOC_DEFAULTS,
	},
	cloud: {
		features: CloudFeatures,
		validateDoc: validateCloudDoc,
		factory: CloudObjectFactory,
		description:
			"Cloud shape, typically used for external systems/networks in architecture diagrams or fuzzy concepts in brainstorming. Uses the same rect-based geometry (x/y/width/height) as RectDoc; only the rendering is a cloud. Text is laid out in a reduced central region inside the bumps, so give it generous width/height for longer text.",
		summary: "external system, fuzzy concept",
		defaults: CLOUD_DOC_DEFAULTS,
	},
	callout: {
		features: CalloutFeatures,
		validateDoc: validateCalloutDoc,
		factory: CalloutObjectFactory,
		description:
			"Speech-bubble callout, typically used for annotations and explanatory comments. Uses the same rect-based geometry (x/y/width/height) as RectDoc; only the rendering is a bubble. The tail stays inside the bounding box, occupying a quarter of it on its side; text is laid out in the bubble body beside it. Point the tail at the annotated object via `tail` (default: bottom edge, position 0.2).",
		summary: "annotation bubble",
		defaults: CALLOUT_DOC_DEFAULTS,
	},
	group: {
		features: GroupFeatures,
		validateDoc: validateGroupDoc,
		summary: "container of child objects",
	},
	polygon: {
		features: PolygonFeatures,
		validateDoc: validatePolygonDoc,
		factory: PolygonObjectFactory,
		summary: "closed shape from points",
	},
	polyline: {
		features: PolylineFeatures,
		validateDoc: validatePolylineDoc,
		factory: PolylineObjectFactory,
		summary: "open line",
	},
	connector: {
		features: ConnectorFeatures,
		validateDoc: validateConnectorDoc,
		summary: "edge / arrow between objects",
	},
	sticky: {
		features: StickyFeatures,
		validateDoc: validateStickyDoc,
		factory: StickyObjectFactory,
		description: "Sticky note annotation.",
		summary: "sticky note (no stroke or `rx`)",
		defaults: STICKY_DOC_DEFAULTS,
	},
	svg: {
		features: SvgFeatures,
		validateDoc: validateSvgDoc,
		summary: "raw SVG escape hatch (opaque box)",
	},
} satisfies Readonly<Record<string, ObjectDocDefinition>>;
