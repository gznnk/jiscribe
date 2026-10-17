import { DocOperationError } from "./errors";
import { requireObject } from "./utils/objectAccess";
import type { CanvasDoc } from "../model/canvas/CanvasDoc";
import type { ObjectDoc } from "../model/objects/base/ObjectDoc";
import { GroupFeatures } from "../model/objects/primitives/group/GroupDoc";
import { validateMetaFields } from "../model/objects/validators/validateMetaFields";
import { isSemanticError } from "../model/types/SemanticDiagnostic";
import type { SemanticDiagnostic } from "../model/types/SemanticDiagnostic";
import { validateDocKeys } from "../parse/validateDocKeys";
import type { ObjectDocValidatorRegistry } from "../registries/ObjectDocValidatorRegistry";

/**
 * Swap one object for a whole new doc of the same id and type, refusing anything the
 * parser would not keep as written: a value the type's `validateDoc` rejects, a malformed
 * `meta`, and a name the type does not hold (which the parser would only warn about and
 * then drop on the next save, so here it is an error instead).
 *
 * @param doc - Mutated in place, and only once every check has passed
 * @param id - The object to replace; group children are reached too
 * @param replacement - The new doc. Copied before it goes in, so the caller keeps no
 *   handle on the document's own object. References to other objects (a connector's
 *   endpoints) are not checked against the document
 * @param validatorRegistry - Built from the same definitions as the rest of the ops
 * @throws {@link DocOperationError} for a missing id, a replacement whose id or type
 *   differs, a group (whose children carry ids of their own), a type the definitions do
 *   not know, or any diagnostic the checks above raise
 */
export const replaceObject = (
	doc: CanvasDoc,
	id: string,
	replacement: ObjectDoc,
	validatorRegistry: ObjectDocValidatorRegistry,
): void => {
	const { object, siblings, index } = requireObject(doc, id);
	if (replacement.id !== id) {
		throw new DocOperationError(
			`cannot replace "${id}" with an object whose id is "${replacement.id}": the id stays as it is`,
		);
	}
	if (replacement.type !== object.type) {
		throw new DocOperationError(
			`cannot replace "${id}" with an object of type "${replacement.type}": it is a "${object.type}", and the type stays as it is`,
		);
	}
	if (object.type === GroupFeatures.type) {
		throw new DocOperationError(
			`cannot replace group "${id}" wholesale: its children carry ids of their own, so rework it through the grouping ops`,
		);
	}
	const keyDeclaration = validatorRegistry.getKeyDeclaration(object.type);
	if (keyDeclaration === undefined) {
		throw new DocOperationError(
			`object "${id}" has type "${object.type}", which is not registered`,
		);
	}

	const candidate = structuredClone(replacement) as ObjectDoc &
		Record<string, unknown>;
	const typeDiagnostics = validatorRegistry.validate(
		object.type,
		candidate,
		id,
	);
	const problems: SemanticDiagnostic[] = [
		...typeDiagnostics.filter(isSemanticError),
		...validateMetaFields(candidate, id).filter(isSemanticError),
		// Every key diagnostic counts, the unknown-name warnings included
		...validateDocKeys(candidate, id, keyDeclaration, typeDiagnostics),
	];
	if (problems.length > 0) {
		throw new DocOperationError(
			`cannot replace "${id}": ${problems
				.map((problem) => `${problem.path} ${problem.message}`)
				.join("; ")}`,
		);
	}

	siblings[index] = candidate;
};
