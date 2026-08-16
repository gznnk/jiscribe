import { expect } from "vitest";

import type { CanvasDoc } from "../../../schemas/canvas/CanvasDoc";
import { createCanvasParser } from "../../../schemas/canvas/validators";
import type { ObjectDoc } from "../../../schemas/objects/base/ObjectDoc";
import { createDocOps } from "../../createDocOps";

/**
 * Doc-ops over the built-in definitions, shared by every suite: an instance closes over its
 * resolved definitions and writes only to the doc it is handed, so it carries nothing between
 * tests. A suite that needs plugin types builds its own instance instead.
 */
export const docOps = createDocOps();

/** Fresh empty CanvasDoc per call, never shared between tests. */
export const emptyDoc = (): CanvasDoc => ({ version: 1, root: [] });

/**
 * Serialize the doc, run it through validation, and assert it is valid.
 *
 * @param doc - Mutated in place by the ops under test, so pass it after the edit
 */
export const expectValid = (doc: CanvasDoc) => {
	const result = createCanvasParser().parse(
		`${JSON.stringify(doc, null, "\t")}\n`,
	);
	expect(result.kind).toBe("ok");
};

/**
 * Read one object back as a plain record, failing the test when the id is gone.
 *
 * @param doc - Searched depth-first, group children included
 * @param id - The object id; a miss fails the assertion rather than returning undefined
 */
export const readObject = (
	doc: CanvasDoc,
	id: string,
): Record<string, unknown> => {
	const find = (
		objects: readonly ObjectDoc[],
	): Record<string, unknown> | undefined => {
		for (const object of objects) {
			if (object.id === id) {
				return object as Record<string, unknown>;
			}
			const children = (object as { children?: ObjectDoc[] }).children;
			const found = Array.isArray(children) ? find(children) : undefined;
			if (found !== undefined) {
				return found;
			}
		}
		return undefined;
	};
	const found = find(doc.root);
	expect(found, `object ${id} should exist`).toBeDefined();
	return found as Record<string, unknown>;
};

/**
 * The ids at the root, in drawing order.
 *
 * @param doc - Only the top level is read; group children are not flattened in
 */
export const rootIds = (doc: CanvasDoc): string[] =>
	doc.root.map((object) => object.id);

/** Two 100x100 rects side by side, `rect-1` at the origin and `rect-2` 300px to its right. */
export const twoRects = (): CanvasDoc => {
	const doc = emptyDoc();
	docOps.addObject(doc, "rect", { x: 0, y: 0, width: 100, height: 100 });
	docOps.addObject(doc, "rect", { x: 300, y: 0, width: 100, height: 100 });
	return doc;
};

/** {@link twoRects} with `connector-1` joining them centre to centre. */
export const twoConnectedRects = (): CanvasDoc => {
	const doc = twoRects();
	docOps.connect(doc, { sourceId: "rect-1", targetId: "rect-2" });
	return doc;
};
