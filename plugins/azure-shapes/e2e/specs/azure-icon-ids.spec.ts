import { test, expect, selectors } from "@jiscribe/canvas-sdk/testing/e2e";
import type { CanvasDriver } from "@jiscribe/canvas-sdk/testing/e2e";

/**
 * An Azure icon filled with gradients, as most of the set is. Drawn twice, and
 * once more as the library's glyph, it is the case canvas-sdk's IconSetArt
 * suffixes ids per instance for: `url(#id)` resolves to the first element in
 * the document carrying the id, wherever that is.
 */
const VM_PRESET = "azureIconVirtualMachine";

/** Places the icon from the shape library's search and answers the new shape's id. */
const placeFromLibrarySearch = async (
	canvas: CanvasDriver,
	query: string,
	presetId: string,
): Promise<string> => {
	await canvas.page.fill(selectors.stencilLibrarySearch, query);
	const item = canvas.page.locator(selectors.stencilLibraryPanelItem(presetId));
	await expect(item).toBeVisible();

	const before = await canvas.captureObjects();
	await item.click();
	await expect
		.poll(async () => (await canvas.captureObjects()).length)
		.toBe(before.length + 1);
	const created = (await canvas.captureObjects()).find(
		(object) => !before.some((old) => old.id === object.id),
	);
	if (!created?.id) {
		throw new Error("cannot read the data-id of the placed icon");
	}
	return created.id;
};

/**
 * Inside one shape: the ids it defines, and for every reference it makes
 * (`url(#…)` in any attribute, `href="#…"`) the `data-id` of the shape the
 * element `getElementById` finds sits in, or null when it finds none.
 */
const readIdsAndReferences = (
	canvas: CanvasDriver,
	shapeId: string,
): Promise<{
	defined: string[];
	references: { id: string; ownerShapeId: string | null }[];
}> =>
	canvas.page.evaluate((targetId) => {
		const shape = document.querySelector(`[data-id="${targetId}"]`);
		if (shape === null) {
			throw new Error(`no shape ${targetId}`);
		}
		const elements = [...shape.querySelectorAll("*")];
		const defined = elements.flatMap((element) =>
			element.id === "" ? [] : [element.id],
		);
		const referencedIds = elements.flatMap((element) =>
			[...element.attributes].flatMap((attribute) => {
				if (attribute.name === "href" && attribute.value.startsWith("#")) {
					return [attribute.value.slice(1)];
				}
				return [...attribute.value.matchAll(/url\(#([^)]+)\)/g)].map(
					(match) => match[1],
				);
			}),
		);
		return {
			defined,
			references: referencedIds.map((id) => ({
				id,
				ownerShapeId:
					document
						.getElementById(id)
						?.closest("[data-id]")
						?.getAttribute("data-id") ?? null,
			})),
		};
	}, shapeId);

test.describe("an Azure icon whose gradients are referred to by id", () => {
	test("drawn twice, each shape's references resolve inside that shape", async ({
		canvas,
	}) => {
		await canvas.openStencilLibrary();
		const firstId = await placeFromLibrarySearch(
			canvas,
			"virtual machine",
			VM_PRESET,
		);
		await canvas.deselect();
		const secondId = await placeFromLibrarySearch(
			canvas,
			"virtual machine",
			VM_PRESET,
		);

		const first = await readIdsAndReferences(canvas, firstId);
		const second = await readIdsAndReferences(canvas, secondId);

		// The drawing defines gradients and fills with them, so an
		// empty list means the picture is not what this spec is about.
		expect(first.defined.length).toBeGreaterThan(0);
		expect(first.references.length).toBeGreaterThan(0);
		expect(first.defined.filter((id) => second.defined.includes(id))).toEqual(
			[],
		);
		for (const [shapeId, { references }] of [
			[firstId, first],
			[secondId, second],
		] as const) {
			expect(
				references.filter(({ ownerShapeId }) => ownerShapeId !== shapeId),
			).toEqual([]);
		}
	});
});
