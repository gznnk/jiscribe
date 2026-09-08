import { standardObjectDocDefinitions } from "@jiscribe/standard-shapes/doc";

/**
 * Whether the type draws its body with a renderer of its own
 * (`ObjectDocDefinition.textLayout: "own"` — the `markdown` card, whose
 * headings, lists and fenced blocks each take a size the shared plain-text
 * layout knows nothing of). Nothing in this package describes such a body: a
 * measurement of it is not wrong by a little, it answers a different question.
 *
 * False for a type outside the shipped set as well as for one laid out the
 * shared way, the two being told apart by `resolveContentBox`'s `unknown`.
 *
 * @param type - Object type name as a document spells it (`"markdown"`), not a definition
 */
export const hasOwnTextLayout = (type: string): boolean =>
	standardObjectDocDefinitions.get(type)?.textLayout === "own";
