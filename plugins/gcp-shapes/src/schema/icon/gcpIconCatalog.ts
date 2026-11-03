import { createIconSetCatalog } from "@jiscribe/canvas-sdk/doc";

import { GCP_ICON_BROWSE_GROUP_DECLARATIONS } from "./gcpIconBrowseGroups";
import { GCP_GENERAL_PRODUCT_ICONS } from "./generalProducts";
import { GCP_ICON_ALIASES } from "./iconAliases";
import { GCP_ICON_CATALOG_ENTRIES } from "./iconCatalog.generated";
import { GCP_TIER1_ICONS } from "./tier1Icons";

/**
 * The Google Cloud icon names: resolution (the short names, the general
 * products' names reaching their category's icon, spelling variants),
 * suggestions, the library search, the "show all" sections and the validator
 * gcpIcon's `icon` is checked with. Headless; the drawings are
 * GCP_ICON_DRAWINGS, on the UI side.
 *
 * No shorthand is derived mechanically: every other spelling a name answers to
 * is in one of the two hand-written tables.
 */
export const gcpIconCatalog = createIconSetCatalog({
	setLabel: "Google Cloud",
	entries: GCP_ICON_CATALOG_ENTRIES,
	aliases: { ...GCP_GENERAL_PRODUCT_ICONS, ...GCP_ICON_ALIASES },
	palette: GCP_TIER1_ICONS,
	browseGroups: GCP_ICON_BROWSE_GROUP_DECLARATIONS,
	listShorthands: () => [],
});
