import type { Brand } from "@jiscribe/utility-types";

import type { ObjectDoc } from "./ObjectDoc";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const OpaqueObjectDocBrand: unique symbol;

/**
 * An object held without being understood: its `type` is one the reader does not
 * know (a plugin shape the host does not ship, a shape from a newer version), so
 * it is kept exactly as the document wrote it and written back unchanged, in the
 * same place among its siblings. Nothing reads or edits the fields beyond `id`
 * and `type`.
 *
 * Which objects are opaque depends on who is reading — a parser, a DocOps
 * instance and a canvas each judge by the types they were given — so the brand
 * marks the reader's verdict at the point it was made, and is not in the JSON.
 */
export type OpaqueObjectDoc = ObjectDoc &
	Readonly<Record<string, unknown>> &
	Brand<typeof OpaqueObjectDocBrand>;
