import type { IconSetNode } from "../../schema/iconSet/IconSetTypes";

const URL_REFERENCE_PATTERN = /url\(#([^)]+)\)/g;

/**
 * Appends a suffix to every id the drawing defines and to every reference to
 * one, so two instances of the same icon never put the same id in the document.
 * `url(#id)` resolves to the first element carrying the id document-wide, and
 * that first one may be inside something hidden (a closed library's glyph),
 * which takes the referring fill with it.
 *
 * @param nodes - the rendition to draw
 * @param idRefs - the ids the drawing defines (IconSetDrawing.idRefs); an id
 *   outside it is left as is, and so is a reference to one
 * @param suffix - appended after a `-`; the caller keeps it unique per instance
 *   and funcIRI-safe (letters, digits, `_` and `-`)
 * @returns a rewritten copy, or `nodes` itself when `idRefs` is empty
 */
export const suffixIconSetDrawingIds = (
	nodes: readonly IconSetNode[],
	idRefs: readonly string[],
	suffix: string,
): readonly IconSetNode[] => {
	if (idRefs.length === 0) {
		return nodes;
	}
	const ids = new Set(idRefs);
	const rewriteId = (id: string): string =>
		ids.has(id) ? `${id}-${suffix}` : id;
	const rewriteValue = (name: string, value: string): string => {
		if (name === "id") {
			return rewriteId(value);
		}
		if (name === "href" && value.startsWith("#")) {
			return `#${rewriteId(value.slice(1))}`;
		}
		return value.includes("url(#")
			? value.replace(
					URL_REFERENCE_PATTERN,
					(_match, id: string) => `url(#${rewriteId(id)})`,
				)
			: value;
	};
	const rewriteNodes = (
		source: readonly IconSetNode[],
	): readonly IconSetNode[] =>
		source.map(([tag, attrs, children]) => {
			const rewrittenAttrs: Record<string, string> = {};
			for (const [name, value] of Object.entries(attrs)) {
				rewrittenAttrs[name] = rewriteValue(name, value);
			}
			return children === undefined
				? [tag, rewrittenAttrs]
				: [tag, rewrittenAttrs, rewriteNodes(children)];
		});
	return rewriteNodes(nodes);
};
