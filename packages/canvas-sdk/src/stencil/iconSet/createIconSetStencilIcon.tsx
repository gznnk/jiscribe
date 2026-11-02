import type { StencilIconProps } from "@jiscribe/canvas";
import type { NamedExoticComponent } from "react";

import {
	calcIconSetArtPlacement,
	readIconSetViewBoxSize,
} from "../../presentation/iconSet/calcIconSetArtPlacement";
import { IconSetArt } from "../../presentation/iconSet/IconSetArt";
import { readIconSetArt } from "../../presentation/iconSet/readIconSetArt";
import type { IconSetCatalog } from "../../schema/iconSet/createIconSetCatalog";
import type {
	IconSetCatalogEntry,
	IconSetDrawing,
} from "../../schema/iconSet/IconSetTypes";
import { createStencilIcon } from "../createStencilIcon";

/** Side of the `<svg>` createStencilIcon provides; asset viewBoxes are scaled down to it. */
const STENCIL_ICON_SIZE = 24;

/** What {@link createIconSetStencilIcon} takes. */
export type IconSetStencilIconParams = {
	/** The set's name lookup (createIconSetCatalog). */
	catalog: IconSetCatalog<IconSetCatalogEntry>;
	/** Canonical name to drawing: the generated drawing module. */
	drawings: Readonly<Record<string, IconSetDrawing>>;
	/** The icon to draw, in any spelling the catalog resolves. */
	icon: string;
};

/**
 * Builds one palette glyph: the icon scaled into createStencilIcon's 24×24 box.
 *
 * @param params - the set's lookup and drawings, and the icon; a name that
 *   resolves to nothing, or one the drawings do not hold, gives a glyph that
 *   draws nothing (an empty `<g />`)
 * @returns the memoized component a `Stencil`'s or a category's `icon` takes
 */
export const createIconSetStencilIcon = ({
	catalog,
	drawings,
	icon,
}: IconSetStencilIconParams): NamedExoticComponent<StencilIconProps> => {
	const art = readIconSetArt(catalog, drawings, icon);
	if (art === null) {
		return createStencilIcon(<g />);
	}
	const viewBox = readIconSetViewBoxSize(art.entry.viewBox);
	const { scale } = calcIconSetArtPlacement(
		STENCIL_ICON_SIZE,
		STENCIL_ICON_SIZE,
		viewBox.width,
		viewBox.height,
	);
	return createStencilIcon(
		<g transform={`scale(${scale})`}>
			<IconSetArt drawing={art.drawing} />
		</g>,
	);
};
