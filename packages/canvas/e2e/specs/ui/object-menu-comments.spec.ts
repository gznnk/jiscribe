import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";
import { selectors } from "../../support/selectors";

/**
 * Comment threads on an object: the ObjectMenu's comment dropdown, the marker
 * drawn over every commented object, and the panel the marker opens for itself
 * while the properties sidebar withholds that menu.
 *
 * Nothing about a thread is drawn on the canvas, so what an op landed in the
 * document is read back the two ways the drawing can show it — the marker over
 * the object and the badge on the menu button, both counting open threads only.
 * That is also what makes them the assertions to trust after an undo or a
 * duplicate, where the panel itself may be gone.
 *
 * Posting needs a `commentAuthor`; the harness names one ("Tester") and
 * ?noCommentAuthor drops it again, which is the read-only panel the last test
 * covers.
 */

/** The rectangle the tests draw: 200 x 130, with room around it for either panel. */
const RECT_FROM = { x: 400, y: 300 };
const RECT_TO = { x: 600, y: 430 };

/** A point inside the drawn rectangle, for selecting it back. */
const RECT_INSIDE = { x: 500, y: 365 };

/**
 * A document the read-only page is seeded with, since a thread cannot be posted
 * there. The rect stands where the drawn one does, so the same coordinates select it.
 */
const seededDocText = JSON.stringify({
	version: 1,
	root: [
		{
			id: "commented-rect",
			type: "rect",
			x: 400,
			y: 300,
			width: 200,
			height: 130,
			meta: {
				comments: [
					{
						id: "seeded-thread",
						comments: [
							{
								id: "seeded-comment",
								author: "Reviewer",
								body: "Seeded question",
								createdAt: "2026-01-01T00:00:00.000Z",
							},
						],
					},
				],
			},
		},
	],
});

/**
 * Open the comment panel on a freshly drawn shape and post the first thread. A
 * panel with no thread opens straight onto the new-thread composer.
 */
const postFirstThread = async (canvas: CanvasDriver, body: string) => {
	await canvas.openComments();
	await canvas.postComment(body);
};

test.describe("comments on a shape", () => {
	test("posts the first thread, which raises the marker and the badge", async ({
		canvas,
	}) => {
		const { page } = canvas;
		const rectId = await canvas.drawShape("Rectangle", RECT_FROM, RECT_TO);

		await expect(
			page.locator(selectors.commentMarker()),
			"an object with no threads is unmarked",
		).toHaveCount(0);
		await expect(page.locator(selectors.commentCount)).toHaveCount(0);

		await canvas.openComments();
		await expect(page.locator(selectors.commentThread)).toHaveCount(0);
		await expect(
			page.locator(selectors.commentComposer),
			"with nothing to read, the panel opens onto the composer",
		).toBeVisible();

		await canvas.postComment("First question");

		await expect(page.locator(selectors.commentThread)).toHaveCount(1);
		await expect(page.locator(selectors.comment)).toHaveCount(1);
		await expect(page.locator(selectors.commentMarker(rectId))).toHaveText("1");
		await expect(page.locator(selectors.commentCount)).toHaveText("1");
		await expect(
			page.locator(selectors.commentPanelPlacement("menu")),
			"posting leaves the panel open for the next one",
		).toBeVisible();
	});

	test("replies to the thread from the composer's Ctrl+Enter", async ({
		canvas,
	}) => {
		const { page } = canvas;
		await canvas.drawShape("Rectangle", RECT_FROM, RECT_TO);
		await postFirstThread(canvas, "First question");

		// fill leaves the caret in the reply box, so the chord goes to it.
		await page.locator(selectors.commentComposer).fill("And the answer");
		await page.keyboard.press("Control+Enter");

		await expect(page.locator(selectors.comment)).toHaveCount(2);
		await expect(page.locator(selectors.commentThread)).toHaveCount(1);
	});

	test("resolves a thread and reopens it", async ({ canvas }) => {
		const { page } = canvas;
		const rectId = await canvas.drawShape("Rectangle", RECT_FROM, RECT_TO);
		await postFirstThread(canvas, "First question");

		await page.click(selectors.commentResolve);
		await expect(page.locator(selectors.commentMarker(rectId))).toHaveAttribute(
			"data-state",
			"resolved",
		);
		await expect(
			page.locator(selectors.commentCount),
			"the badge counts open threads, so a resolved one leaves none",
		).toHaveCount(0);

		// Resolving moves the thread into the collapsed resolved section, where its
		// folded row offers the way back without being opened first.
		await page.click(selectors.commentResolvedToggle);
		const thread = page.locator(selectors.commentThread);
		await expect(thread).toHaveAttribute("data-resolved", "true");
		await page.click(selectors.commentReopen);

		await expect(page.locator(selectors.commentThread)).toHaveAttribute(
			"data-resolved",
			"false",
		);
		await expect(page.locator(selectors.commentMarker(rectId))).toHaveAttribute(
			"data-state",
			"open",
		);
		await expect(page.locator(selectors.commentCount)).toHaveText("1");
	});

	test("takes a posted thread back in one undo", async ({ canvas }) => {
		const { page } = canvas;
		await canvas.drawShape("Rectangle", RECT_FROM, RECT_TO);
		await postFirstThread(canvas, "First question");
		await expect(page.locator(selectors.commentMarker())).toHaveCount(1);

		await canvas.undo();

		// The marker rather than the panel: the panel may go with the op, while the
		// marker stands for as long as the object carries a thread.
		await expect(page.locator(selectors.commentMarker())).toHaveCount(0);
		await expect(page.locator(selectors.commentCount)).toHaveCount(0);
	});

	test("opens the panel beside the marker while the properties sidebar is open", async ({
		canvas,
	}) => {
		const { page } = canvas;
		const rectId = await canvas.drawShape("Rectangle", RECT_FROM, RECT_TO);
		await postFirstThread(canvas, "First question");
		await page.click(selectors.commentClose);

		await canvas.deselect();
		await canvas.openPropertyPanel();
		await expect(
			page.locator(selectors.objectMenu),
			"the sidebar is what withholds the menu the panel normally hangs off",
		).toHaveCount(0);

		await page.click(selectors.commentMarker(rectId));

		await expect(
			page.locator(selectors.propertyPanelSection("meta")),
			"the marker selects the object it sits on",
		).toBeVisible();
		await expect(
			page.locator(selectors.commentPanelPlacement("marker")),
		).toBeVisible();
		await expect(page.locator(selectors.commentBody)).toHaveText(
			"First question",
		);

		await page.click(selectors.commentClose);
		await expect(page.locator(selectors.commentPanel)).toHaveCount(0);
	});

	test("leaves the threads behind when the object is duplicated", async ({
		canvas,
	}) => {
		const { page } = canvas;
		await canvas.drawShape("Rectangle", RECT_FROM, RECT_TO);
		await postFirstThread(canvas, "First question");
		await page.click(selectors.commentClose);

		// Back onto the shape, so the shortcut is not swallowed by whatever the
		// panel left focused.
		await canvas.selectAt(RECT_INSIDE);
		await canvas.duplicate();

		expect(
			(await canvas.captureObjects()).length,
			"the duplicate really landed",
		).toBe(2);
		await expect(page.locator(selectors.commentMarker())).toHaveCount(1);
	});

	test("reads the threads but writes nothing without a comment author", async ({
		canvas,
	}) => {
		const { page } = canvas;
		await canvas.goto("?noCommentAuthor");
		await page.evaluate((docText) => {
			const hook = (
				window as unknown as { __setHarnessDoc?: (docText: string) => void }
			).__setHarnessDoc;
			if (!hook) {
				throw new Error(
					"__setHarnessDoc is undefined (harness hook not installed)",
				);
			}
			hook(docText);
		}, seededDocText);
		await expect(canvas.objectById("commented-rect")).toHaveCount(1);

		await canvas.selectAt(RECT_INSIDE);
		await canvas.openComments();

		await expect(page.locator(selectors.commentBody)).toHaveText(
			"Seeded question",
		);
		await expect(page.locator(selectors.commentReadonly)).toBeVisible();
		await expect(page.locator(selectors.commentComposer)).toHaveCount(0);
		await expect(page.locator(selectors.commentNewThread)).toHaveCount(0);
		await expect(
			page.locator(selectors.commentResolve),
			"resolving is a write too",
		).toHaveCount(0);
	});
});
