import type { ObjectMigration } from "./ObjectMigration";
import {
	isStyledRichText,
	richTextToPlain,
} from "../../model/objects/types/text/RichText";

/**
 * A source body written as styled runs, from before a `"source"` text was held to
 * a plain string (validateSourceTextStyleFields): read as the characters the runs
 * hold, which is what the shape draws from anyway — the emphasis belongs to the
 * source language's own syntax.
 *
 * An empty list of runs is left to `migrateEmptyRunList`, and an array
 * holding anything but runs is left in place for the type's validator to reject:
 * it is corruption rather than the old form.
 */
export const migrateSourceRuns: ObjectMigration = (node, path, features) => {
	if (features.text !== "source" || !isStyledRichText(node.text)) {
		return { node, warnings: [] };
	}
	return {
		node: { ...node, text: richTextToPlain(node.text) },
		warnings: [
			{
				path: `${path}.text`,
				message: `text was written as styled runs, which a "${features.type}" body does not take: it is read as the plain text and rewritten so on save.`,
				severity: "warning",
			},
		],
	};
};
