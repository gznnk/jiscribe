import { isArray, isObject, isString } from "@jiscribe/basic-validators";

import { migrateEmptyRunList } from "./migrateEmptyRunList";
import { migrateSourceRuns } from "./migrateSourceRuns";
import type { ObjectMigration } from "./ObjectMigration";
import type { SemanticDiagnostic } from "../../model/types/SemanticDiagnostic";
import type { ObjectDocValidatorRegistry } from "../../registries/ObjectDocValidatorRegistry";
import { mapObjectTree } from "../utils/mapObjectTree";

export type MigrateDocResult = {
	/** The input with every old form rewritten (the input itself when there was none). */
	data: unknown;
	/** One diagnostic per rewrite, in document order. */
	warnings: SemanticDiagnostic[];
};

/**
 * Every migration, applied to each object in the order written here. A migration
 * recognizes the old form by its shape, so the order matters only where two of
 * them read the same field: `migrateSourceRuns` leaves the empty list of runs to
 * `migrateEmptyRunList`, which has its own answer for it.
 *
 * These are the document-wide ones, which an object of every type passes through.
 * A migration only one type needs would be a hook on its `ObjectDocDefinition`,
 * applied per node after this table; nothing needs one yet, so there is no hook.
 */
const objectMigrations: readonly ObjectMigration[] = [
	migrateSourceRuns,
	migrateEmptyRunList,
];

/**
 * Rewrites the forms the format no longer writes into the ones it does, before
 * anything is validated — so a document written by an older build opens, and the
 * next save writes it in the current form (`ok.doc` is the migrated doc).
 *
 * There is no version gate: the format carries no per-plugin generation to key on,
 * so each migration recognizes the old form by its shape alone and is a no-op
 * otherwise. Migrating a migrated document therefore changes nothing, which is
 * what lets this run on every parse. Every rewrite is reported as a warning, so
 * nothing about the saved document changes silently.
 *
 * An object of a type the registry does not know is opaque and never touched: what
 * it holds is no one's here to read (OpaqueObjectDoc).
 *
 * @param data - The JSON.parse result of a candidate document. Anything without an
 *   object shape and a `root` array is returned unchanged (no warnings).
 * @param registry - Supplies each type's `features`, which is what the migrations
 *   read to know how the type holds its text.
 * @returns The (possibly) rewritten data — the input itself when nothing was — and
 *   a warning per rewrite, carrying the object's `id` when it has a string one.
 *   Warning paths use the input's indices, so they point into the text the user sees.
 */
export const migrateDoc = (
	data: unknown,
	registry: ObjectDocValidatorRegistry,
): MigrateDocResult => {
	if (!isObject(data) || !isArray(data.root)) {
		return { data, warnings: [] };
	}

	const warnings: SemanticDiagnostic[] = [];
	const migratedRoot = mapObjectTree(data.root, "root", {
		enter: (node, path) => {
			const features = isString(node.type)
				? registry.getFeatures(node.type)
				: undefined;
			if (features === undefined) {
				return node;
			}
			const id = isString(node.id) ? node.id : undefined;
			let migrated = node;
			objectMigrations.forEach((migrate) => {
				const result = migrate(migrated, path, features);
				migrated = result.node;
				result.warnings.forEach((warning) => {
					warnings.push(id === undefined ? warning : { ...warning, id });
				});
			});
			return migrated;
		},
	});

	return migratedRoot === data.root
		? { data, warnings }
		: { data: { ...data, root: migratedRoot }, warnings };
};
