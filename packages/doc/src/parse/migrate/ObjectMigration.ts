import type { ObjectFeatures } from "../../model/objects/types/ObjectFeatures";
import type { SemanticDiagnostic } from "../../model/types/SemanticDiagnostic";
import type { ObjectTreeNode } from "../utils/mapObjectTree";

/** What one migration hands back: the node to keep, and what it rewrote. */
export type ObjectMigrationResult = {
	/** The rewritten node, or the input itself when the old form was not there. */
	node: ObjectTreeNode;
	/**
	 * One warning per rewrite, carrying no `id`: migrateDoc adds the object's,
	 * which is the node's business rather than the migration's.
	 */
	warnings: SemanticDiagnostic[];
};

/**
 * One rewrite of an old form into the current one. Pure: it reads the node and
 * returns what to keep, so the order in the table is the only thing that couples
 * two migrations, and applying one twice is the same as applying it once (the
 * rewritten form no longer has the shape it recognizes).
 *
 * @param node - The object as the file wrote it, not yet known to be a valid doc
 * @param path - Diagnostic path of `node` itself, which a warning's field name is appended to
 * @param features - The descriptor of the node's type, read off the registry; a
 *   type the registry does not know never reaches a migration
 */
export type ObjectMigration = (
	node: ObjectTreeNode,
	path: string,
	features: ObjectFeatures,
) => ObjectMigrationResult;
