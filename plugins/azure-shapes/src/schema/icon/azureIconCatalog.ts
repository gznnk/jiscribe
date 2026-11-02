import { createIconSetCatalog } from "@jiscribe/canvas-sdk/doc";

import { AZURE_ICON_BROWSE_GROUP_DECLARATIONS } from "./azureIconBrowseGroups";
import { AZURE_ICON_ALIASES } from "./iconAliases";
import { AZURE_ICON_CATALOG_ENTRIES } from "./iconCatalog.generated";
import { AZURE_TIER1_ICONS } from "./tier1Icons";

/** Vendor prefixes, dropped so that `azure-cosmos-db` answers to `cosmos-db` as well. */
const VENDOR_PREFIXES = ["azure-", "microsoft-"] as const;

/**
 * The shorthands mechanically derivable from one name: the name without its
 * vendor prefix.
 *
 * @param name - a canonical name (`azure-cosmos-db`)
 * @returns `cosmos-db` for that one, nothing for a name with no vendor prefix;
 *   the kit leaves out a shorthand two names share, or one spelled like a name
 *   or an alias
 */
export const listAzureIconShorthands = (name: string): string[] =>
	VENDOR_PREFIXES.filter((prefix) => name.startsWith(prefix)).map((prefix) =>
		name.slice(prefix.length),
	);

/**
 * The Azure icon names: resolution (aliases, the shorthands above, spelling
 * variants), suggestions, the library search, the "show all" sections and the
 * validator azureIcon's `icon` is checked with. Headless; the drawings are
 * AZURE_ICON_DRAWINGS, on the UI side.
 */
export const azureIconCatalog = createIconSetCatalog({
	setLabel: "Azure",
	entries: AZURE_ICON_CATALOG_ENTRIES,
	aliases: AZURE_ICON_ALIASES,
	palette: AZURE_TIER1_ICONS,
	browseGroups: AZURE_ICON_BROWSE_GROUP_DECLARATIONS,
	listShorthands: listAzureIconShorthands,
});
