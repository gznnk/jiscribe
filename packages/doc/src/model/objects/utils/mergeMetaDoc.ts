/**
 * A change to the named text fields of a `meta`, field by field: a field left out
 * keeps what the note already says, and one given as null — or as `""`, since an
 * emptied field is no note at all — drops it.
 */
export type MetaParams = {
	/** The name the document or object goes by, or null to drop it. */
	name?: string | null;
	/** What it is about, as free text, or null to drop it. */
	description?: string | null;
};

/**
 * The `meta` a {@link MetaParams} leaves behind, the rule an object's note and the
 * document's own are both written by. Every member the params do not name (a
 * `reference`, a host's own keys) is kept, and the note itself goes once no member
 * is left — what carries no note carries no `meta`, the shape the parser produces
 * for a file without one.
 *
 * @param meta - The note as it stands, or undefined for none; never mutated
 * @param params - The fields to change
 * @returns A fresh record, or undefined once no member is left
 */
export const mergeMetaDoc = (
	meta: Readonly<Record<string, unknown>> | undefined,
	params: MetaParams,
): Record<string, unknown> | undefined => {
	const nextMeta: Record<string, unknown> = { ...meta };
	for (const key of ["name", "description"] as const) {
		const value = params[key];
		if (value === undefined) {
			continue;
		}
		if (value === null || value === "") {
			delete nextMeta[key];
		} else {
			nextMeta[key] = value;
		}
	}
	return Object.keys(nextMeta).length === 0 ? undefined : nextMeta;
};
