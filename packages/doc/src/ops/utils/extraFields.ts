import { quoteNames } from "./errorText";
import type { ObjectRecord } from "./objectAccess";
import { TEXT_BODY_KEYS } from "../../model/objects/base/TextStyleDoc";
import { holdsBodyInsideBox } from "../../plugin/hasInsetTextRegion";
import type { ObjectDocDefinition } from "../../plugin/ObjectDocDefinition";
import { DocOperationError } from "../errors";

/** Whether a type stores a field of this name beyond the ones its features imply. */
export const declaresExtraKey = (
	definition: ObjectDocDefinition,
	key: string,
): boolean => (definition.extraKeys ?? []).includes(key);

/**
 * Every name a props write may set on one type: what the type declares for
 * itself, plus what carrying a single body *inside its box* implies
 * (TEXT_BODY_KEYS). The second group is shared rather than declared by each
 * type, so it is added here instead of being copied into as many `extraKeys`
 * lists — but only where the body has a box to be placed against
 * ({@link holdsBodyInsideBox}): on a type drawing its label outside its
 * outline, the keys would be accepted, written, and never read.
 */
const collectWritableKeys = (
	definition: ObjectDocDefinition,
): readonly string[] => [
	...(definition.extraKeys ?? []),
	...(definition.features.text === "body" && holdsBodyInsideBox(definition)
		? TEXT_BODY_KEYS
		: []),
];

/**
 * Copies a type's own properties — the ones no parameter of the call covers, such as
 * the lucide icon's `icon` or the callout's `tail` — onto an object.
 *
 * Three kinds of name are refused, for different reasons. One the call already spells
 * out itself would be silently overwritten by the dedicated parameter, so writing it
 * here can only lose a value. One the type does not declare cannot mean anything to it:
 * nothing downstream reads it, the mapper drops it on the way to the state, and the
 * value would sit in the document looking as though it had taken effect — which is the
 * whole point of asking the definition rather than writing what it is handed. And a
 * body-placement key on a type whose label is not inside its box is refused with that
 * reason named, the property existing on other types being what would make the generic
 * message misleading.
 *
 * @param target - The object being built or edited, mutated in place
 * @param extraProps - Property names and values as given; a value of `undefined` is dropped,
 *   so an optional argument that was never filled in reads as absent
 * @param definition - The type's doc definition, whose `extraKeys` and text feature say
 *   which names it has (see {@link collectWritableKeys}); a type with neither accepts no
 *   extra props at all
 * @param reserved - Names the call takes as parameters of its own, which differ per op
 *   (a creation call owns the geometry, an edit call does not)
 * @param subjectName - What to call the offender in the error: the object type when
 *   creating, its id when editing
 * @returns The names written, in the order `extraProps` lists them
 * @throws {@link DocOperationError} for a reserved name, or one the type does not have
 */
export const applyExtraProps = (
	target: ObjectRecord,
	extraProps: Readonly<Record<string, unknown>>,
	definition: ObjectDocDefinition,
	reserved: ReadonlySet<string>,
	subjectName: string,
): string[] => {
	const names = Object.keys(extraProps);

	const shadowed = names.filter((key) => reserved.has(key));
	if (shadowed.length > 0) {
		throw new DocOperationError(
			`extraProps on "${subjectName}" must not carry ${quoteNames(shadowed)}: ${
				shadowed.length === 1 ? "that name is" : "those names are"
			} a parameter of the call itself, so pass ${shadowed.length === 1 ? "it" : "them"} there`,
		);
	}

	const allowed = collectWritableKeys(definition);
	const unknown = names.filter((key) => !allowed.includes(key));
	if (unknown.length > 0) {
		// A body-placement key on a type whose label is not inside its box gets
		// its own reason: "not one of this type's properties" would send the
		// caller hunting for a different spelling of a knob the type cannot have.
		const inertBodyKeys = unknown.filter(
			(key) =>
				(TEXT_BODY_KEYS as readonly string[]).includes(key) &&
				definition.features.text === "body",
		);
		if (inertBodyKeys.length > 0) {
			throw new DocOperationError(
				`extraProps on "${subjectName}" must not carry ${quoteNames(inertBodyKeys)}: this type draws its label outside its box, so there is nothing for a body placement to move`,
			);
		}
		throw new DocOperationError(
			`extraProps on "${subjectName}" must not carry ${quoteNames(unknown)}: ${
				allowed.length === 0
					? "this type has no properties of its own"
					: `this type's own properties are ${quoteNames(allowed)}`
			}`,
		);
	}

	const written: string[] = [];
	for (const [key, value] of Object.entries(extraProps)) {
		if (value === undefined) {
			continue;
		}
		target[key] = value;
		written.push(key);
	}
	return written;
};
