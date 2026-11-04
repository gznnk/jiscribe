import type { ObjectDoc } from "@jiscribe/doc";

import type { Diagnostic } from "./Diagnostic";

/**
 * An `id` attribute: the lower-case name alone, set off by whitespace before it
 * so that `data-id` and the like are not read as one.
 */
const ID_ATTRIBUTE_PATTERN = /(?:^|\s)id\s*=\s*(?:"([^"]*)"|'([^']*)')/g;

/** A reference by fragment: `url(#x)`, quoted or not. */
const URL_REFERENCE_PATTERN = /url\(\s*["']?#([^"')\s]+)["']?\s*\)/g;

/** A reference by fragment through `href` or `xlink:href`. */
const HREF_REFERENCE_PATTERN =
	/(?:^|[\s:])href\s*=\s*(?:"#([^"]*)"|'#([^']*)')/g;

/** Every value the pattern's first or second capture group holds in the text, in order. */
const collectCaptures = (text: string, pattern: RegExp): string[] =>
	[...text.matchAll(pattern)].flatMap((match) => {
		const captured = match[1] ?? match[2];
		return captured === undefined || captured === "" ? [] : [captured];
	});

/** What one svg object's markup defines and refers to. */
type SvgIdUsage = {
	object: ObjectDoc;
	/** Ids its markup defines. */
	definedIds: ReadonlySet<string>;
	/** Ids its markup refers to, in order of first reference. */
	referencedIds: readonly string[];
};

const readSvgIdUsage = (object: ObjectDoc): SvgIdUsage | null => {
	const svgText = (object as { svgText?: unknown }).svgText;
	if (object.type !== "svg" || typeof svgText !== "string") {
		return null;
	}
	return {
		object,
		definedIds: new Set(collectCaptures(svgText, ID_ATTRIBUTE_PATTERN)),
		referencedIds: [
			...new Set([
				...collectCaptures(svgText, URL_REFERENCE_PATTERN),
				...collectCaptures(svgText, HREF_REFERENCE_PATTERN),
			]),
		],
	};
};

/**
 * The svg objects whose own references may resolve to another svg's markup.
 * Every svg's markup goes into the one page as written (the canvas renames no
 * id), so a `url(#x)` or `href="#x"` resolves to the first element of that id in
 * the page — which is another svg's, when an svg drawn before it defines the same
 * id and is on screen. Only an id the later svg both defines and refers to is
 * reported: a duplicate nothing refers to (an editor's `id="Layer_1"`) changes
 * nothing a reader sees, and a duplicate inside one svg's own markup is left
 * alone. Package-internal; {@link import("./diagnoseDoc").diagnoseDoc}
 * interleaves the findings with the rest by object.
 *
 * @param objects - The whole document flattened in drawing order (flattenObjects), which is the order the markup enters the page in
 * @returns One warning per svg whose references are at risk, keyed by the object itself, naming each such id and the svg drawn first that defines it
 */
export const diagnoseSvgIdCollisions = (
	objects: readonly ObjectDoc[],
): ReadonlyMap<ObjectDoc, Diagnostic> => {
	const firstDefinerById = new Map<string, ObjectDoc>();
	const findings = new Map<ObjectDoc, Diagnostic>();
	for (const object of objects) {
		const usage = readSvgIdUsage(object);
		if (usage === null) {
			continue;
		}
		const clashes = usage.referencedIds.flatMap((id) => {
			const firstDefiner = firstDefinerById.get(id);
			return usage.definedIds.has(id) && firstDefiner !== undefined
				? [`"${id}" (defined first by ${firstDefiner.id})`]
				: [];
		});
		if (clashes.length > 0) {
			findings.set(object, {
				severity: "warning",
				objectId: object.id,
				message: `svg markup refers to ids an svg drawn before it also defines: ${clashes.join(", ")}; every svg's markup shares one page, so which definition a reference resolves to depends on which svgs are on screen, and it can resolve to the earlier svg's; rename the ids so each is unique within the document`,
			});
		}
		for (const id of usage.definedIds) {
			if (!firstDefinerById.has(id)) {
				firstDefinerById.set(id, object);
			}
		}
	}
	return findings;
};
