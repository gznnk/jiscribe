import type { IconSetCatalogEntry } from "@jiscribe/canvas-sdk/doc";

/** An icon's layer, matching the prefix of its name (`service/…`). */
export type AwsIconTier = "service" | "resource" | "general" | "group";

/** Every layer, from the services down to the group frames. */
export const AWS_ICON_TIERS = [
	"service",
	"resource",
	"general",
	"group",
] as const satisfies readonly AwsIconTier[];

/** One icon of the catalog. The viewBox is 40 / 48 / 64 depending on the layer. */
export type AwsIconCatalogEntry = IconSetCatalogEntry & {
	/** Which layer the icon belongs to. */
	tier: AwsIconTier;
};
