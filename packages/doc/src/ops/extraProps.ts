import { DocOperationError } from "./errors";
import { applyExtraProps } from "./utils/extraFields";
import { requireObject, type ObjectRecord } from "./utils/objectAccess";
import type { DocDefinitions } from "./utils/objectGeometry";
import type { CanvasDoc } from "../model/canvas/CanvasDoc";

/**
 * The two names that decide what an object *is*, which a props write must never touch
 * however a type declares itself. Shorter than the creation call's reserved set (see
 * `create.ts`), which also owns the geometry and the styling as parameters of its own;
 * here everything else is bounded by the type's `extraKeys`, which names neither.
 */
const IDENTITY_KEYS: ReadonlySet<string> = new Set(["id", "type"]);

/**
 * Set the properties belonging to the type itself on one object — the lucide icon's
 * `icon`, the callout's `tail`, the container's `headerHeight` — mutating `doc` in place.
 *
 * Only one object at a time, unlike {@link import("./style").setStyle}: these names
 * belong to a single type, so a batch over mixed types could only ever half-apply. That
 * is also why an unusable name is an error here rather than something reported as
 * ignored — asking for `tail` on a rect is a mistake, not a partial success.
 *
 * The write is prepared on a copy and validated before it lands, so a value the type
 * rejects leaves the object exactly as it was.
 *
 * @param doc - Mutated in place
 * @param id - Id of the object to change; must exist in the root tree
 * @param extraProps - Property names and values to set; a value of `undefined` is dropped,
 *   and there is no way to unset a property back to its default
 * @param definitions - Type table the accepted names and the validator are read from
 * @returns The property names written, in the order `props` lists them
 * @throws {@link DocOperationError} when the id is missing, when a name is not one the
 *   type declares, or when the result fails the type's own `validateDoc`
 */
export const setExtraProps = (
	doc: CanvasDoc,
	id: string,
	extraProps: Readonly<Record<string, unknown>>,
	definitions: DocDefinitions,
): string[] => {
	const { object } = requireObject(doc, id);
	const definition = definitions.get(object.type);
	if (definition === undefined) {
		throw new DocOperationError(
			`object "${id}" has type "${object.type}", which is not registered`,
		);
	}

	const candidate: ObjectRecord = { ...object };
	const written = applyExtraProps(
		candidate,
		extraProps,
		definition,
		IDENTITY_KEYS,
		id,
	);

	const diagnostics = definition.validateDoc(candidate, id);
	if (diagnostics.length > 0) {
		throw new DocOperationError(
			`cannot set extra props on "${id}": ${diagnostics
				.map((diagnostic) => `${diagnostic.path} ${diagnostic.message}`)
				.join("; ")}`,
		);
	}

	Object.assign(object, candidate);
	return written;
};
