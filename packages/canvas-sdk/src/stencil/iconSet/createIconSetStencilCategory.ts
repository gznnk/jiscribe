import type { StencilCategory } from "@jiscribe/canvas";

import { createIconSetStencilIcon } from "./createIconSetStencilIcon";
import { toIconSetStencilId } from "./toIconSetStencilId";
import type { IconSetCatalog } from "../../schema/iconSet/createIconSetCatalog";
import type {
	IconSetCatalogEntry,
	IconSetDrawing,
} from "../../schema/iconSet/IconSetTypes";

/** What {@link createIconSetStencilCategory} takes. */
export type IconSetStencilCategoryParams = {
	/** The category id: keys its open / collapsed state and the host's label override. */
	id: string;
	/** The category's label, a plain string or one per locale. */
	label: StencilCategory["label"];
	/** The icon the category button shows, in any spelling the catalog resolves. */
	icon: string;
	/** The same prefix the presets were registered under (createIconSetStencils). */
	stencilIdPrefix: string;
	/** The set's name lookup (createIconSetCatalog). */
	catalog: IconSetCatalog<IconSetCatalogEntry>;
	/** Canonical name to drawing: the generated drawing module. */
	drawings: Readonly<Record<string, IconSetDrawing>>;
};

/**
 * The stencil category of one icon set: the palette laid out up front, the
 * library search over the whole set (catalog.search), and the "show all" view
 * in the set's declared sections.
 *
 * A category rather than a single preset because the shape means nothing until
 * an icon is chosen, and a placed shape offers no menu to change it. Core's
 * default bar does not carry it, so a host puts it into
 * `stencilLibrary.sections` or `toolbar.sections`.
 *
 * @param params - the category's id, label and button icon, the preset id
 *   prefix, and the set's lookup and drawings
 * @returns the category, its preset ids pointing at createIconSetStencils' presets
 */
export const createIconSetStencilCategory = ({
	id,
	label,
	icon,
	stencilIdPrefix,
	catalog,
	drawings,
}: IconSetStencilCategoryParams): StencilCategory => {
	const toStencilId = (name: string): string =>
		toIconSetStencilId(stencilIdPrefix, name);
	return {
		id,
		label,
		icon: createIconSetStencilIcon({ catalog, drawings, icon }),
		presetIds: catalog.paletteNames.map(toStencilId),
		search: (query) => {
			const { names, total } = catalog.search(query);
			return { presetIds: names.map(toStencilId), matchCount: total };
		},
		browseGroups: catalog.listBrowseGroups().map((group) => ({
			id: group.id,
			label: group.label,
			presetIds: group.names.map(toStencilId),
		})),
	};
};
