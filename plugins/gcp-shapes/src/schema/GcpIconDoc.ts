import { LABEL_TEXT_STYLE_DEFAULTS } from "@jiscribe/doc";
import type { CreateObjectType, ObjectFeatures } from "@jiscribe/doc";

/** The icon drawn when `icon` is omitted: the one a Google Cloud diagram places most. */
export const DEFAULT_GCP_ICON_NAME = "compute-engine";

/**
 * A node drawing one of the Google Cloud product icons (a core product's own
 * icon, or a category icon), built the way awsIcon is: rect geometry, a label
 * hung under the box, a connector endpoint.
 *
 * There is no `stroke` and no `fill`: the icons are redistributed unmodified
 * (LICENSE-ICONS.md), and the stroke / fill menus are left out to match. The drawing is
 * scaled uniformly to the box's shorter side and centred, so a non-square box
 * adds margin rather than stretching it.
 */
export const GcpIconFeatures = {
	type: "gcpIcon",
	geometry: "rect",
	transform: true,
	text: "label",
	connectable: true,
} as const satisfies ObjectFeatures;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const GcpIconDocBrand: unique symbol;

export type GcpIconDoc = CreateObjectType<
	typeof GcpIconFeatures,
	typeof GcpIconDocBrand,
	{
		/**
		 * Which icon to draw, as flat kebab-case (`compute-engine`,
		 * `cloud-run`, `networking`). Short names (`gce`, `gcs`) resolve too,
		 * and so does a product without an icon of its own (`pubsub`, `vpc`),
		 * onto its category's icon. A name that resolves to nothing is a
		 * validation error carrying candidates. Omitted =
		 * {@link DEFAULT_GCP_ICON_NAME}
		 */
		icon?: string;
	}
>;

/** The doc fields of this shape alone; the doc definition's `extraKeys`. */
export const GcpIconExtraKeys = [
	"icon",
] as const satisfies readonly (keyof GcpIconDoc)[];

export const GCP_ICON_DOC_DEFAULTS: Omit<GcpIconDoc, "id"> = {
	type: "gcpIcon",
	x: 0,
	y: 0,
	width: 64,
	height: 64,
	icon: DEFAULT_GCP_ICON_NAME,
	text: "",
	// The drawing scales as a square, so a non-square box only gains margin.
	lockAspectRatio: true,
	...LABEL_TEXT_STYLE_DEFAULTS,
} as const as GcpIconDoc;
