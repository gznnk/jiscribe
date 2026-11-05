import type { ObjectDoc } from "@jiscribe/doc";

/**
 * The whole document's objects, group children included, in drawing order: each
 * group followed straight away by what it holds. Only a group is walked into:
 * what an object of an unknown type holds is kept unread
 * (`OpaqueObjectDoc`), so it is not checked either. Package-internal.
 *
 * @param objects - The document's `root`, or a group's `children`
 */
export const flattenObjects = (objects: readonly ObjectDoc[]): ObjectDoc[] =>
	objects.flatMap((object) => {
		const children = (object as { children?: ObjectDoc[] }).children;
		return object.type === "group" && Array.isArray(children)
			? [object, ...flattenObjects(children)]
			: [object];
	});
