/**
 * One element of a drawing: its tag, its attributes, and its children where it
 * has any. Attribute names carry React's spelling, so a renderer hands them
 * straight to `createElement`.
 *
 * Unlike lucide's IconNode this nests, because the AWS assets group fills and
 * placement with `<g fill="…">` / `<g transform="…">`. Flattening them would
 * mean composing the transforms.
 */
export type AwsIconNode = readonly [
	tag: string,
	attrs: Readonly<Record<string, string>>,
	children?: readonly AwsIconNode[],
];

/** An icon's layer, matching the prefix of its name (`service/…`). */
export type AwsIconTier = "service" | "resource" | "general" | "group";

/** Every layer, in the order the picker's filter chips list them. */
export const AWS_ICON_TIERS = [
	"service",
	"resource",
	"general",
	"group",
] as const satisfies readonly AwsIconTier[];

/** One icon, looked up by name. */
export type AwsIconEntry = {
	/** The asset's own viewBox, kept as authored (40 / 48 / 64 depending on the layer). */
	viewBox: string;
	/** Display name, the file stem opened up (`Amazon EC2 / Instance`). */
	label: string;
	/** AWS category name, from the directory the asset sits in. */
	category: string;
	/** Which layer the icon belongs to. */
	tier: AwsIconTier;
	/** The drawing AWS ships for a light ground, and the only one for most icons. */
	nodes: readonly AwsIconNode[];
	/**
	 * The separate drawing AWS ships for a dark ground, where the set has one:
	 * the General icons, the two AWS Cloud group icons and AWS Marketplace.
	 * Absent means the light drawing is the only rendition and reads on both.
	 */
	darkNodes?: readonly AwsIconNode[];
};
