import { createIconSetCatalog } from "@jiscribe/canvas-sdk/doc";

import { AWS_ICON_BROWSE_GROUP_DECLARATIONS } from "./awsIconBrowseGroups";
import type { AwsIconCatalogEntry } from "./AwsIconCatalogEntry";
import { AWS_ICON_ALIASES } from "./iconAliases";
import { AWS_ICON_CATALOG_ENTRIES } from "./iconCatalog.generated";
import { AWS_TIER1_ICONS } from "./tier1Icons";

/** Vendor prefixes, dropped so that `amazon-ec2` answers to `ec2` as well. */
const VENDOR_PREFIXES = ["amazon-", "aws-"] as const;

/**
 * The shorthands mechanically derivable from one name: the name without its
 * layer prefix, and that without the vendor prefix of its first segment.
 *
 * @param name - a canonical name (`service/aws-lambda`)
 * @returns `aws-lambda` and `lambda` for that one; the kit leaves out a
 *   shorthand two names share, or one spelled like a name or an alias
 */
export const listAwsIconShorthands = (name: string): string[] => {
	const withoutTier = name.slice(name.indexOf("/") + 1);
	const shorthands = [withoutTier];
	for (const prefix of VENDOR_PREFIXES) {
		if (withoutTier.startsWith(prefix)) {
			shorthands.push(withoutTier.slice(prefix.length));
		}
	}
	return shorthands;
};

/**
 * The AWS icon names: resolution (aliases, the shorthands above, spelling
 * variants), suggestions, the library search, the "show all" sections and the
 * validator awsIcon's `icon` is checked with. Headless; the drawings are
 * AWS_ICON_DRAWINGS, on the UI side.
 */
export const awsIconCatalog = createIconSetCatalog<AwsIconCatalogEntry>({
	setLabel: "AWS",
	entries: AWS_ICON_CATALOG_ENTRIES,
	aliases: AWS_ICON_ALIASES,
	palette: AWS_TIER1_ICONS,
	browseGroups: AWS_ICON_BROWSE_GROUP_DECLARATIONS,
	listShorthands: listAwsIconShorthands,
});
