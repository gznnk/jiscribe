import { isObject } from "@jiscribe/basic-validators";

/**
 * A node of the object tree as the parse stages see it: a plain record, not yet
 * known to be a valid ObjectDoc.
 */
export type ObjectTreeNode = Record<string, unknown>;

/**
 * What a stage does at each node of the tree. Every hook returns the node to keep
 * — the input itself when it changed nothing, so the walk can tell — or undefined
 * to drop the node from its parent.
 */
export type ObjectTreeVisitor = {
	/** Called on a node before its children; what it returns is what the children are read from. */
	enter: (node: ObjectTreeNode, path: string) => ObjectTreeNode | undefined;
	/**
	 * Whether to walk the `children` of the node `enter` returned. Omitted means
	 * a `group` holding at least one child, the one structural container the
	 * format has; an object of a type the stage does not know is never descended
	 * into, its contents being no one's to read (OpaqueObjectDoc).
	 */
	descend?: (node: ObjectTreeNode) => boolean;
	/**
	 * Called after the children were walked, on the node holding the walked
	 * children. Not called on a node that was not descended into, so a stage
	 * reading an empty `children` here knows the walk is what emptied it.
	 */
	leave?: (node: ObjectTreeNode, path: string) => ObjectTreeNode | undefined;
};

const isGroupWithChildren = (node: ObjectTreeNode): boolean =>
	node.type === "group" &&
	Array.isArray(node.children) &&
	node.children.length > 0;

/**
 * Walks one level of entries — `root`, or a group's `children` — applying the
 * visitor to every object among them and recursing into the children of the
 * ones it descends into. Entries that are not objects are passed through as they
 * are: they are corruption, and checkStructure is what reports them.
 *
 * Copy-on-write: the array comes back as the very same reference when no entry
 * changed, and an entry whose subtree changed is copied along that path only,
 * so a stage that finds nothing to do costs a read and no allocation.
 *
 * @param entries - The array to walk; anything else comes back unchanged
 * @param path - Diagnostic path of `entries` itself (`root`), which each index is appended to
 * @param visitor - The stage's hooks; see {@link ObjectTreeVisitor} for what each returns
 * @returns The walked array, or `entries` itself when nothing changed
 */
export const mapObjectTree = (
	entries: unknown,
	path: string,
	visitor: ObjectTreeVisitor,
): unknown => {
	if (!Array.isArray(entries)) {
		return entries;
	}
	let changed = false;
	const walked: unknown[] = [];
	entries.forEach((entry, index) => {
		const mapped = mapObjectTreeNode(entry, `${path}[${index}]`, visitor);
		if (mapped !== entry) {
			changed = true;
		}
		if (mapped !== undefined) {
			walked.push(mapped);
		}
	});
	return changed ? walked : entries;
};

/** One node: enter, its children if the visitor descends, then leave. */
const mapObjectTreeNode = (
	entry: unknown,
	path: string,
	visitor: ObjectTreeVisitor,
): unknown => {
	if (!isObject(entry)) {
		return entry;
	}
	const entered = visitor.enter(entry, path);
	if (entered === undefined) {
		return undefined;
	}
	const descend = visitor.descend ?? isGroupWithChildren;
	if (!descend(entered)) {
		return entered;
	}
	const children = mapObjectTree(entered.children, `${path}.children`, visitor);
	const withChildren =
		children === entered.children ? entered : { ...entered, children };
	return visitor.leave === undefined
		? withChildren
		: visitor.leave(withChildren, path);
};
