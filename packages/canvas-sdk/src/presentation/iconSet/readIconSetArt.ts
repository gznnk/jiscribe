import type { IconSetCatalog } from "../../schema/iconSet/createIconSetCatalog";
import type {
	IconSetCatalogEntry,
	IconSetDrawing,
} from "../../schema/iconSet/IconSetTypes";

/**
 * Looks up what drawing an icon takes: the catalog entry (for the viewBox) and
 * the drawing itself. For a shape drawing an icon somewhere other than its whole
 * box (a frame's corner badge); a whole-box icon is createIconSetObject's.
 *
 * @param catalog - the set's name lookup (createIconSetCatalog)
 * @param drawings - canonical name to drawing: the generated drawing module
 * @param name - any spelling the catalog resolves (aliases, shorthands)
 * @returns null when the name resolves to nothing, and also when the catalog
 *   knows it but the drawings do not (a set whose drawings are no longer
 *   shipped); either way the caller draws its stand-in
 */
export const readIconSetArt = (
	catalog: IconSetCatalog<IconSetCatalogEntry>,
	drawings: Readonly<Record<string, IconSetDrawing>>,
	name: string,
): { entry: IconSetCatalogEntry; drawing: IconSetDrawing } | null => {
	const resolved = catalog.resolveName(name);
	if (resolved === null) {
		return null;
	}
	const entry = catalog.readEntry(resolved);
	if (
		entry === null ||
		!Object.prototype.hasOwnProperty.call(drawings, resolved)
	) {
		return null;
	}
	return { entry, drawing: drawings[resolved] };
};
