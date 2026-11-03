// The headless entry (no UI): what a server, a diagnostic or the MCP reads to
// take part in parse-time validation without pulling react in. Only
// ./schema/** and @jiscribe/doc / @jiscribe/canvas-sdk/doc may be imported
// here, and none of the drawings: the catalog of names is all it loads.
import { createFrameObjectDoc } from "@jiscribe/canvas-sdk/doc";
import { calcOutsideBoxTextRegion } from "@jiscribe/doc";
import type { CanvasDocPlugin, ObjectDocDefinition } from "@jiscribe/doc";

import {
	GCP_ICON_DOC_DEFAULTS,
	GcpIconExtraKeys,
	GcpIconFeatures,
} from "./schema/GcpIconDoc";
import { gcpIconCatalog } from "./schema/icon/gcpIconCatalog";

export const gcpIconDocDefinition: ObjectDocDefinition = createFrameObjectDoc({
	features: GcpIconFeatures,
	defaults: GCP_ICON_DOC_DEFAULTS,
	extraKeys: GcpIconExtraKeys,
	// The drawing fills the box and the label hangs outside it, below.
	textRegion: calcOutsideBoxTextRegion,
	description:
		'One icon from Google\'s official Google Cloud product icons, drawn as a node: it holds text and can be a connector endpoint, so arrows attach to it directly. Google draws its core products with icons of their own and every other product with the icon of its category, and `icon` follows that: it names the picture as a flat kebab-case name — a core product ("compute-engine", "cloud-run", "gke", "cloud-storage", "cloud-sql", "bigquery", "vertex-ai") or a category ("networking", "data-analytics", "security-identity", "serverless-computing"). Any other product\'s name resolves to its category\'s icon ("pubsub" and "dataflow" draw "data-analytics", "cloud-functions" draws "serverless-computing", "vpc" draws "networking", "iam" draws "security-identity"), and common short names resolve too ("gce", "gcs", "spanner", "scc"); a name that resolves to nothing is a validation error carrying suggestions. `text` is drawn as a label below the box, auto-sized to itself: write the product\'s official name there ("Compute Engine", "Pub/Sub", "Cloud Load Balancing"), which tells apart the products sharing one category icon and belongs near the icon. There is no stroke or fill: the icons may not be recoloured or altered. Keep the box square (the 64x64 default) — the drawing is scaled uniformly and centred, so a non-square box only adds margin. Group them with a container frame to show which project, region or VPC network they live in.',
	summary: "Google Cloud product icon (a labelled, connectable node)",
	// Placed at its default size and adjusted afterwards. Dragging a box out
	// would only centre the drawing on the shorter side.
	supportsBounds: false,
	validateExtra: gcpIconCatalog.validateIconName,
});

/**
 * The headless `CanvasDocPlugin`: it teaches `createCanvasParser` the type and
 * loads no drawing code at all.
 */
export const gcpShapesDocPlugin: CanvasDocPlugin = {
	id: "gcp-shapes",
	objects: { gcpIcon: gcpIconDocDefinition },
};

// The name tables and the palette order are read by headless consumers too (the
// AI documentation generator, diagnostics). The drawings are not: they are
// GCP_ICON_DRAWINGS, from the UI entry alone.
export { gcpIconCatalog } from "./schema/icon/gcpIconCatalog";
export { GCP_GENERAL_PRODUCT_ICONS } from "./schema/icon/generalProducts";
export { GCP_ICON_ALIASES } from "./schema/icon/iconAliases";
export {
	GCP_ICON_CATALOG_ENTRIES,
	GCP_ICON_CATEGORY_ZIP_URL,
	GCP_ICON_CORE_ZIP_URL,
	GCP_ICON_RELEASE,
	GCP_ICON_SOURCE_URL,
} from "./schema/icon/iconCatalog.generated";
export {
	GCP_TIER1_ICON_NAMES,
	GCP_TIER1_ICONS,
} from "./schema/icon/tier1Icons";
