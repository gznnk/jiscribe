import type { Point } from "@jiscribe/geometry";
import type { Prettify } from "@jiscribe/utility-types";

import { DEFAULT_FONT_FAMILY } from "../../../text/style/fontFamilies";
import type { FillStyleDoc } from "../base/FillStyleDoc";
import { DEFAULT_STROKE_WIDTH } from "../base/StrokeStyleDoc";
import type { StrokeStyleDoc } from "../base/StrokeStyleDoc";
import type { TextStyleDoc } from "../base/TextStyleDoc";
import type { ConnectorRouting } from "../types/ConnectorRouting";
import type { CreateObjectType } from "../types/CreateObjectType";
import type { EndpointRef } from "../types/EndpointRef";
import type { ExtraStylePropertyDescriptor } from "../types/ExtraStyleProperty";
import type { ObjectFeatures } from "../types/ObjectFeatures";
import { AUTO_COLOR } from "../utils/autoColor";

/** Feature descriptor for the connector object type (poly geometry, strokeable, arrow ends, not connectable). */
export const ConnectorFeatures = {
	type: "connector",
	geometry: "poly",
	stroke: true,
	arrow: true,
	connectable: false,
} as const satisfies ObjectFeatures;

/**
 * Creation defaults of a connector, sitting where every other type's do
 * (`RECT_DOC_DEFAULTS` and friends) and reached through the type's `defaults`
 * (builtinObjectDocDefinitions).
 *
 * Only the style the type adopts is stated. Geometry and endpoints are never
 * defaulted: `source` / `target` are what the caller is creating, and `points`
 * is the route the engine chooses when nothing is stored. Arrow ends are not
 * here either — a connector drawn by dragging takes one from the gesture
 * (ConnectionAnchorEventHandler), while one created through the doc-ops
 * (`ops/connectors`) deliberately gets none.
 */
export const CONNECTOR_DOC_DEFAULTS: Required<
	Pick<ConnectorDoc, "type" | "stroke" | "strokeWidth">
> = {
	type: "connector",
	stroke: AUTO_COLOR,
	strokeWidth: DEFAULT_STROKE_WIDTH,
};

/**
 * Connector-specific styleable properties beyond the ObjectFeatures flags
 * (see ExtraStylePropertyRegistry). The `label.` prefix is a nested write path
 * into `connector.label`; a connector without a label ignores these (no-op).
 */
export const ConnectorExtraStyleProperties = {
	"label.fill": { valueType: "string" },
	"label.stroke": { valueType: "string" },
	"label.strokeWidth": { valueType: "number" },
	"label.strokeDashType": { valueType: "string" },
	"label.fontColor": { valueType: "string" },
	"label.fontFamily": { valueType: "string" },
	"label.fontSize": { valueType: "number" },
	"label.fontWeight": { valueType: "string" },
} as const satisfies Record<string, ExtraStylePropertyDescriptor>;

/**
 * Annotation (label) attached to a connector.
 *
 * Held as a **single nested object**, distinct from a shape's body text (the flat TextStyleDoc at
 * features.text). The reasons are: (1) `position` / `offset`, which describe placement along the
 * path, are connector-specific and we want the structure to make ownership explicit; (2) a short
 * tag on a line needs no alignment. Only color, family, size, and weight are borrowed
 * from TextStyleDoc for the style (no alignment).
 *
 * A label whose `text` is an empty string is equivalent to "none" and is removed on save.
 *
 * Background and border borrow the same vocabulary as shapes (`fill` / `stroke` / `strokeWidth`).
 * When `fill` is omitted, the knockout that hides the line with the canvas background color is kept;
 * when `strokeWidth` is omitted, there is no border.
 */
export type ConnectorLabel = Pick<
	TextStyleDoc,
	"fontColor" | "fontFamily" | "fontSize" | "fontWeight"
> &
	Pick<FillStyleDoc, "fill"> &
	Pick<StrokeStyleDoc, "stroke" | "strokeWidth" | "strokeDashType"> & {
		/** The label string. Empty means hidden (no label). */
		text: string;
		/** Position along the path, as a ratio from 0 (source) to 1 (target); omitted means {@link CONNECTOR_LABEL_DEFAULTS}. */
		position?: number;
		/** Signed offset perpendicular to the path (world units); omitted means {@link CONNECTOR_LABEL_DEFAULTS}. */
		offset?: number;
	};

/**
 * What an omitted {@link ConnectorLabel} field means to whoever reads the label.
 *
 * Distinct from {@link CONNECTOR_DOC_DEFAULTS}, which is what a newly created
 * connector is *written* with: nothing here is ever stored. A reader substitutes
 * these for keys that are not in the document, so a label reads the same outside
 * the canvas (doc-tools, the MCP tools, the AI docs) as inside it.
 *
 * Only the keys a reader has to resolve are here. `text` has no default (a label
 * without it does not exist), and `fill` / `stroke` / `strokeWidth` are absent on
 * purpose — omitting those means "no border" and "keep the knockout", which is a
 * behaviour rather than a value to substitute (see {@link ConnectorLabel}).
 */
export const CONNECTOR_LABEL_DEFAULTS: Required<
	Pick<
		ConnectorLabel,
		| "fontColor"
		| "fontSize"
		| "fontFamily"
		| "fontWeight"
		| "position"
		| "offset"
	>
> = {
	fontColor: AUTO_COLOR,
	fontSize: 16,
	fontFamily: DEFAULT_FONT_FAMILY,
	fontWeight: "normal",
	position: 0.5,
	offset: 0,
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const ConnectorDocBrand: unique symbol;

/**
 * Doc for a connector (connection line).
 *
 * Semantics of `points`: the route's **own vertices** — the corners the line bends at — in
 * source → target order, in world coordinates. Endpoint coordinates are not included (the source of
 * truth for endpoints is the `source` / `target` EndpointRef, and owned anchors are dynamically
 * resolved at render time). Empty means the path is the engine's to choose.
 *
 * Non-empty, `points` **is** the path under either line shape: the drawn corners are exactly the
 * stored ones. Only the vertex next to each endpoint is adjusted while an endpoint moves, sliding
 * along to keep its segment axis-aligned (`alignVertexPath`); when the operation commits, that
 * adjusted list is written back here (`reconcileConnectorVertices`), so at rest the stored list
 * always matches what is drawn. Nothing else is corrected — a shape dragged across the route is
 * crossed, and a route folded back on itself stays folded. Use ResetConnectorRouteCommand to hand
 * the path back to the engine.
 *
 * Unlike polyline/polygon — whose `points` *is* the shape and is required — a connector's waypoints
 * are optional here (unspecified means none). The shared `Poly` geometry types them as required, so
 * we override just this key back to optional; `ConnectorMapper` normalizes an absent value to `[]`,
 * keeping `ConnectorState.points` always present (Doc optional → State required).
 */
export type ConnectorDoc = Prettify<
	Omit<
		CreateObjectType<
			typeof ConnectorFeatures,
			typeof ConnectorDocBrand,
			{
				source: EndpointRef;
				target: EndpointRef;
				routing?: ConnectorRouting;
				/** Annotation on the connector. Omitted means no label. */
				label?: ConnectorLabel;
			}
		>,
		"points"
	> & {
		/** The route's vertices (source → target). Omitted means the engine routes the whole path. */
		points?: Point[];
	}
>;

/**
 * Doc fields connector carries beyond the ones its features imply
 * (see ObjectDocDefinition.extraKeys). `points` is not among them: the poly geometry
 * already accounts for it.
 */
export const CONNECTOR_EXTRA_KEYS = [
	"source",
	"target",
	"routing",
	"label",
] as const satisfies readonly (keyof ConnectorDoc)[];
