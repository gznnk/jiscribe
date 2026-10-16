/**
 * How a type reports content of its own that its box cannot hold: the part it
 * lays out itself, which the shared typesetting a checker measures single bodies
 * with cannot see — a record's compartments, stacked by the record's own rule.
 * Answerable with no rendering layer present, so a headless check
 * (`@jiscribe/doc-tools` `diagnoseDoc`) reports it against a saved document.
 *
 * Not a validator: `validateDoc` decides whether a document may be parsed at
 * all, while a document this flags opens fine and is drawn with its content
 * past the edge.
 *
 * The caller attaches the object's id and the severity (an error), so a message
 * names neither. Write each one as a single English line stating what overflows,
 * by how many pixels, and how to fix it — the tool or the size that makes it
 * fit — since it reaches an AI that has not seen the rendering.
 *
 * Text measurement is offered by the caller before it asks.
 *
 * @param doc - The object as a parsed document holds it (it has passed `validateDoc`), as a plain record: a field may still be absent where the type leaves it optional
 * @returns One message per overflow found, in the order the type lays its content out; empty when everything fits
 */
export type ObjectDocOverflowDiagnoser = (
	doc: Readonly<Record<string, unknown>>,
) => readonly string[];
