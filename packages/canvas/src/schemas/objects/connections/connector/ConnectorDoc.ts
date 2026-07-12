import type { Point } from "@workspace/geometry";
import type { Prettify } from "@workspace/utility-types";

import type { FillStyleDoc } from "../../base/FillStyleDoc";
import type { StrokeStyleDoc } from "../../base/StrokeStyleDoc";
import type { TextStyleDoc } from "../../base/TextStyleDoc";
import type { ArrowType } from "../../types/ArrowType";
import type { ConnectorRouting } from "../../types/ConnectorRouting";
import type { CreateObjectType } from "../../types/CreateObjectType";
import type { EndpointRef } from "../../types/EndpointRef";
import type { ObjectFeatures } from "../../types/ObjectFeatures";

/** Feature descriptor for the connector object type (poly geometry, strokeable, arrow ends, not connectable). */
export const ConnectorFeatures = {
	type: "connector",
	geometry: "poly",
	stroke: true,
	arrow: true,
	connectable: false,
} as const satisfies ObjectFeatures;

/**
 * Annotation (label) attached to a connector.
 *
 * Held as a **single nested object**, distinct from a shape's body text (the flat TextStyleDoc at
 * features.text). The reasons are: (1) `position` / `offset`, which describe placement along the
 * path, are connector-specific and we want the structure to make ownership explicit; (2) a short
 * tag on a line needs no alignment or markdown. Only color, size, and weight are borrowed from
 * TextStyleDoc for the style (no alignment or textType).
 *
 * A label whose `text` is an empty string is equivalent to "none" and is removed on save.
 *
 * Background and border borrow the same vocabulary as shapes (`fill` / `stroke` / `strokeWidth`).
 * When `fill` is omitted, the knockout that hides the line with the canvas background color is kept;
 * when `strokeWidth` is omitted, there is no border.
 */
export type ConnectorLabel = Pick<
	TextStyleDoc,
	"fontColor" | "fontSize" | "fontWeight"
> &
	Pick<FillStyleDoc, "fill"> &
	Pick<StrokeStyleDoc, "stroke" | "strokeWidth" | "strokeDashType"> & {
		/** The label string. Empty means hidden (no label). */
		text: string;
		/** Position along the path, as a ratio from 0 (source) to 1 (target). Default 0.5 (midpoint). */
		position?: number;
		/** Signed offset perpendicular to the path (world units). Default 0. */
		offset?: number;
	};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const ConnectorDocBrand: unique symbol;

/**
 * Doc for a connector (connection line).
 *
 * Semantics of `points`: holds **only the intermediate waypoints** in source → target order, in
 * world coordinates. Endpoint coordinates are not included (the source of truth for endpoints is the
 * `source` / `target` EndpointRef, and owned anchors are dynamically resolved at render time).
 * A straight connector has an empty array.
 *
 * When `routing` is `"orthogonal"` (the default when omitted), the path is auto-generated at render
 * time and `points` is unused (always empty; derived values are not persisted). Specify `"straight"`
 * explicitly only when a straight line is desired.
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
				startArrow?: ArrowType;
				endArrow?: ArrowType;
				/** Annotation on the connector. Omitted means no label. */
				label?: ConnectorLabel;
			}
		>,
		"points"
	> & {
		/** Intermediate waypoints (source → target). Omitted means none (a straight connector). */
		points?: Point[];
	}
>;
