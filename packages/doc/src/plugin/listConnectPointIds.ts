import type { ObjectDocDefinition } from "./ObjectDocDefinition";
import type { ObjectDoc } from "../model/objects/base/ObjectDoc";
import { ConnectPointIds } from "../model/objects/types/EndpointRef";

/**
 * What {@link listConnectPointIds} reads off a type: only its connect point
 * declaration. A whole `ObjectDocDefinition` is one, and so is `{}` for a type
 * declaring nothing beyond the built-ins.
 */
export type ConnectPointDeclaration = Pick<
	ObjectDocDefinition,
	"extraConnectPointIds"
>;

/**
 * The connect point ids a connector end may name on one object: the built-in
 * four (`ConnectPointIds`) followed by the ones its type declares for it
 * (`ObjectDocDefinition.extraConnectPointIds`).
 *
 * The single statement of which ids are valid, so the doc ops refusing to write
 * an unknown id and `diagnoseDoc` (`@jiscribe/doc-tools`) reporting one already
 * stored cannot disagree.
 *
 * @param object - The doc the end is attached to; a type whose set follows its content (an ER entity's columns) answers for this doc as it stands
 * @param definition - The object's type's declarations (see {@link ConnectPointDeclaration}); `{}` for a type declaring no extra ids
 * @returns The built-ins in `ConnectPointIds` order, then the declared ids in the order the type gives them; never includes `"center"`, which is an anchor kind of its own
 */
export const listConnectPointIds = (
	object: ObjectDoc,
	definition: ConnectPointDeclaration,
): readonly string[] => [
	...ConnectPointIds,
	...(definition.extraConnectPointIds?.(object) ?? []),
];
