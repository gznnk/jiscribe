import type { ObjectRecord } from "./objectAccess";
import type { ObjectDocDefinition } from "../../schemas/plugin/ObjectDocDefinition";
import { DocOperationError } from "../errors";

/**
 * Copies a type's own properties — the ones no parameter of the call covers, such as
 * the lucide icon's `icon` or the callout's `tail` — onto an object.
 *
 * Two names are refused, for different reasons. One the call already spells out itself
 * would be silently overwritten by the dedicated parameter, so writing it here can only
 * lose a value. One the type does not declare cannot mean anything to it: nothing
 * downstream reads it, the mapper drops it on the way to the state, and the value would
 * sit in the document looking as though it had taken effect. That second case is the
 * whole point of asking the definition rather than writing what it is handed.
 *
 * @param target - The object being built or edited, mutated in place
 * @param props - Property names and values as given; a value of `undefined` is dropped,
 *   so an optional argument that was never filled in reads as absent
 * @param definition - The type's doc definition, whose `extraKeys` says which names it
 *   has; a type declaring none accepts no props at all
 * @param reserved - Names the call takes as parameters of its own, which differ per op
 *   (a creation call owns the geometry, an edit call does not)
 * @param subjectName - What to call the offender in the error: the object type when
 *   creating, its id when editing
 * @returns The names written, in the order `props` lists them
 * @throws {@link DocOperationError} for a reserved name, or one the type does not have
 */
export const applyExtraProps = (
	target: ObjectRecord,
	props: Readonly<Record<string, unknown>>,
	definition: ObjectDocDefinition,
	reserved: ReadonlySet<string>,
	subjectName: string,
): string[] => {
	const names = Object.keys(props);

	const shadowed = names.filter((key) => reserved.has(key));
	if (shadowed.length > 0) {
		throw new DocOperationError(
			`props on "${subjectName}" must not carry ${quote(shadowed)}: ${
				shadowed.length === 1 ? "that name is" : "those names are"
			} a parameter of the call itself, so pass ${shadowed.length === 1 ? "it" : "them"} there`,
		);
	}

	const allowed = definition.extraKeys ?? [];
	const unknown = names.filter((key) => !allowed.includes(key));
	if (unknown.length > 0) {
		throw new DocOperationError(
			`props on "${subjectName}" must not carry ${quote(unknown)}: ${
				allowed.length === 0
					? "this type has no properties of its own"
					: `this type's own properties are ${quote(allowed)}`
			}`,
		);
	}

	const written: string[] = [];
	for (const [key, value] of Object.entries(props)) {
		if (value === undefined) {
			continue;
		}
		target[key] = value;
		written.push(key);
	}
	return written;
};

const quote = (names: readonly string[]): string =>
	names.map((name) => `"${name}"`).join(", ");
