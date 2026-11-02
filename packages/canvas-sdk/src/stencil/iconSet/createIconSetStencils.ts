import type { Stencil } from "@jiscribe/canvas";

import { createIconSetStencilIcon } from "./createIconSetStencilIcon";
import { toIconSetStencilId } from "./toIconSetStencilId";
import type { IconSetCatalog } from "../../schema/iconSet/createIconSetCatalog";
import type {
	IconSetCatalogEntry,
	IconSetDrawing,
} from "../../schema/iconSet/IconSetTypes";

/** What {@link createIconSetStencils} takes. */
export type IconSetStencilsParams = {
	/** The type every preset places. */
	objectType: string;
	/** Put before each preset id (toIconSetStencilId); by convention the object type. */
	stencilIdPrefix: string;
	/** The set's name lookup (createIconSetCatalog). */
	catalog: IconSetCatalog<IconSetCatalogEntry>;
	/** Canonical name to drawing: the generated drawing module. */
	drawings: Readonly<Record<string, IconSetDrawing>>;
};

/**
 * One preset per icon of the set, palette members first in palette order, so a
 * library search or the "show all" view can place any of them.
 *
 * The label rides in `defaultOverrides`, so a placed shape comes with the name
 * already in it (catalog.readLabel: the palette's, else the entry's). It stays
 * out of the type's doc defaults, which are also what a document an AI writes
 * falls back to — every shape would go by the same name.
 *
 * @param params - the type, the id prefix, and the set's lookup and drawings
 * @returns the `stencils` of the type's ObjectTypeDefinition
 * @throws when the palette names an icon the catalog does not hold, which is a
 *   mistake in the set's own tables
 */
export const createIconSetStencils = ({
	objectType,
	stencilIdPrefix,
	catalog,
	drawings,
}: IconSetStencilsParams): Stencil[] =>
	[...new Set([...catalog.paletteNames, ...catalog.names])].map((icon) => {
		const label = catalog.readLabel(icon);
		if (label === null) {
			throw new Error(
				`${objectType} stencils: the palette names the icon "${icon}", which the icon set does not hold`,
			);
		}
		return {
			id: toIconSetStencilId(stencilIdPrefix, icon),
			objectType,
			label,
			icon: createIconSetStencilIcon({ catalog, drawings, icon }),
			defaultOverrides: { icon, text: label },
		};
	});
