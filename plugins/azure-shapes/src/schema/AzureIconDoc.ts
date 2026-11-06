import { LABEL_TEXT_STYLE_DEFAULTS } from "@jiscribe/doc";
import type { CreateObjectType, ObjectFeatures } from "@jiscribe/doc";

/** The icon drawn when `icon` is omitted: the one an Azure diagram places most. */
export const DEFAULT_AZURE_ICON_NAME = "virtual-machine";

/**
 * A node drawing one icon of the Azure Architecture Icons set (or Microsoft
 * Entra ID, from the Entra icon package), built the way awsIcon is: rect
 * geometry, a label hung under the box, a connector endpoint.
 *
 * There is no `stroke` and no `fill`: Microsoft's terms forbid changing the
 * icons, and the stroke / fill menus are left out to match. The drawing is
 * scaled uniformly to the box's shorter side and centred, so a non-square box
 * adds margin rather than stretching it.
 */
export const AzureIconFeatures = {
	type: "azureIcon",
	geometry: "rect",
	transform: true,
	text: "label",
	connectable: true,
} as const satisfies ObjectFeatures;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const AzureIconDocBrand: unique symbol;

export type AzureIconDoc = CreateObjectType<
	typeof AzureIconFeatures,
	typeof AzureIconDocBrand,
	{
		/**
		 * Which icon to draw, as flat kebab-case (`virtual-machine`,
		 * `azure-cosmos-db`). Short names (`vm`, `aks`) and spellings with
		 * `azure-` / `microsoft-` dropped resolve too, wherever they are
		 * unambiguous. A name that resolves to nothing is a validation error
		 * carrying candidates. Omitted = {@link DEFAULT_AZURE_ICON_NAME}
		 */
		icon?: string;
	}
>;

/** The doc fields of this shape alone; the doc definition's `extraKeys`. */
export const AzureIconExtraKeys = [
	"icon",
] as const satisfies readonly (keyof AzureIconDoc)[];

export const AZURE_ICON_DOC_DEFAULTS: Omit<AzureIconDoc, "id"> = {
	type: "azureIcon",
	x: 0,
	y: 0,
	width: 64,
	height: 64,
	icon: DEFAULT_AZURE_ICON_NAME,
	text: "",
	// The drawing scales as a square, so a non-square box only gains margin.
	lockAspectRatio: true,
	...LABEL_TEXT_STYLE_DEFAULTS,
} as const as AzureIconDoc;
