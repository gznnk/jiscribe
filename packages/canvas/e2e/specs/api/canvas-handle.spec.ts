import type * as CanvasModule from "@jiscribe/canvas";
import type { JSHandle, Page } from "@playwright/test";

import { expect, test } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";
import { selectors } from "../../support/selectors";

/**
 * The imperative handle (`ref.current`), which is how every host outside this
 * repository drives a mounted canvas. Nothing it answers is readable off the
 * DOM and it exists only while a canvas is mounted, so an e2e run is the only
 * place its behaviour can be exercised at all.
 *
 * What is verified here is what the handle itself decides: the identity test
 * behind a history mark, the zoom clamp, the fallbacks that yield null, which
 * channel a connector selection lands in. Undo and redo as commands belong to
 * arrange/history.spec and are not repeated.
 *
 * The handle never crosses into node — it is React state behind closures — so
 * a spec holds it as a JSHandle and asserts on what each page-side call gives
 * back. A history mark is held the same way: it is compared by identity, and a
 * serialized copy would match no entry on the stack.
 */

/** The global mountPluginHarness publishes the default page's handle on. */
type HarnessWindow = { __canvasHandle?: CanvasModule.CanvasHandle | null };

/** The live handle of the mounted canvas, for the page-side calls to run on. */
const readCanvasHandle = (
	page: Page,
): Promise<JSHandle<CanvasModule.CanvasHandle>> =>
	page.evaluateHandle(() => {
		const handle = (window as unknown as HarnessWindow).__canvasHandle;
		if (!handle) {
			throw new Error(
				"__canvasHandle is undefined (harness hook not installed)",
			);
		}
		return handle;
	});

/** Two rectangles side by side joined by a connector, the setup a connector needs. */
const drawConnectedPair = async (
	canvas: CanvasDriver,
	handle: JSHandle<CanvasModule.CanvasHandle>,
): Promise<{ source: string; target: string; connector: string }> => {
	const target = await canvas.drawShape(
		"Rectangle",
		{ x: 700, y: 200 },
		{ x: 860, y: 300 },
	);
	// Between two draws with the same tool, so the second click on the button is
	// not read as a double click on the first (e2e/README.md, "Gotchas" 1).
	await canvas.deselect();
	// Drawn last so it is the selected shape the connector is pulled out of.
	const source = await canvas.drawShape(
		"Rectangle",
		{ x: 300, y: 200 },
		{ x: 460, y: 300 },
	);
	const connector = await canvas.createConnector("rightCenter", {
		x: 710,
		y: 250,
	});
	// The driver takes the new id off the DOM, where the connector is already
	// drawn as a draft while the pointer is down, so it can hand one back before
	// the release commits it into the document. Everything below names the
	// connector by id, and an id the document does not hold yet is simply
	// ignored, so wait for the commit rather than race it.
	await expect
		.poll(
			() =>
				handle.evaluate(
					(h, id) => h.measure.connectorPath(id) !== null,
					connector,
				),
			{ message: "the connector is committed into the document" },
		)
		.toBe(true);
	return { source, target, connector };
};

test.describe("canvas handle / history", () => {
	test("rolls every edit since the mark back in one call", async ({
		canvas,
	}) => {
		const handle = await readCanvasHandle(canvas.page);
		const kept = await canvas.drawShape(
			"Rectangle",
			{ x: 300, y: 200 },
			{ x: 460, y: 300 },
		);

		const mark = await handle.evaluateHandle((h) => h.history.mark());

		await canvas.deselect();
		await canvas.drawShape("Rectangle", { x: 560, y: 200 }, { x: 720, y: 300 });
		await canvas.deselect();
		await canvas.drawShape("Rectangle", { x: 300, y: 400 }, { x: 460, y: 500 });
		expect(await canvas.captureObjects()).toHaveLength(3);

		expect(
			await handle.evaluate((h, held) => h.history.revertTo(held), mark),
		).toBe(true);
		await expect
			.poll(async () => (await canvas.captureObjects()).map((obj) => obj.id), {
				message: "both shapes drawn after the mark are gone",
			})
			.toEqual([kept]);

		// Everything the revert undid stays redoable, one entry at a time.
		expect(await handle.evaluate((h) => h.history.canRedo())).toBe(true);
		expect(await handle.evaluate((h) => h.history.redo())).toBe(true);
		await expect
			.poll(async () => (await canvas.captureObjects()).length, {
				message: "redo brings back one of the two, not both",
			})
			.toBe(2);
	});

	test("reports a mark it is already at as reached, without undoing anything", async ({
		canvas,
	}) => {
		const handle = await readCanvasHandle(canvas.page);
		await canvas.drawShape("Rectangle", { x: 300, y: 200 }, { x: 460, y: 300 });

		const result = await handle.evaluate((h) => {
			const mark = h.history.mark();
			return {
				reverted: h.history.revertTo(mark),
				canRedo: h.history.canRedo(),
			};
		});

		expect(result.reverted).toBe(true);
		// The early return is not an undo, so nothing moved onto the redo stack.
		expect(result.canRedo).toBe(false);
		expect(await canvas.captureObjects()).toHaveLength(1);
	});

	test("refuses a mark undo has already passed", async ({ canvas }) => {
		const handle = await readCanvasHandle(canvas.page);
		await canvas.drawShape("Rectangle", { x: 300, y: 200 }, { x: 460, y: 300 });
		const mark = await handle.evaluateHandle((h) => h.history.mark());
		await canvas.deselect();
		await canvas.drawShape("Rectangle", { x: 560, y: 200 }, { x: 720, y: 300 });

		await canvas.undo();
		await expect
			.poll(async () => (await canvas.captureObjects()).length, {
				message: "the first undo lands on the marked entry",
			})
			.toBe(1);
		await canvas.undo();
		await expect
			.poll(async () => (await canvas.captureObjects()).length, {
				message: "the second undo carries past it, onto the redo stack",
			})
			.toBe(0);

		expect(
			await handle.evaluate((h, held) => h.history.revertTo(held), mark),
		).toBe(false);
		expect(await canvas.captureObjects()).toHaveLength(0);
	});

	test("gates undo and redo on there being an entry to move to", async ({
		canvas,
	}) => {
		const handle = await readCanvasHandle(canvas.page);
		expect(
			await handle.evaluate((h) => ({
				canUndo: h.history.canUndo(),
				canRedo: h.history.canRedo(),
				undone: h.history.undo(),
			})),
		).toEqual({ canUndo: false, canRedo: false, undone: false });

		await canvas.drawShape("Rectangle", { x: 300, y: 200 }, { x: 460, y: 300 });
		expect(
			await handle.evaluate((h) => [h.history.canUndo(), h.history.canRedo()]),
		).toEqual([true, false]);

		expect(await handle.evaluate((h) => h.history.undo())).toBe(true);
		await expect
			.poll(async () => (await canvas.captureObjects()).length)
			.toBe(0);
		expect(
			await handle.evaluate((h) => [h.history.canUndo(), h.history.canRedo()]),
		).toEqual([false, true]);

		expect(await handle.evaluate((h) => h.history.redo())).toBe(true);
		await expect
			.poll(async () => (await canvas.captureObjects()).length)
			.toBe(1);
	});

	test("holds undo unavailable while a text edit is open", async ({
		canvas,
	}) => {
		const handle = await readCanvasHandle(canvas.page);
		await canvas.drawShape("Rectangle", { x: 300, y: 200 }, { x: 460, y: 300 });
		await canvas.typeTextAt({ x: 380, y: 250 }, "uncommitted");

		expect(
			await handle.evaluate((h) => ({
				canUndo: h.history.canUndo(),
				undone: h.history.undo(),
			})),
		).toEqual({ canUndo: false, undone: false });

		await canvas.cancelText();
		expect(await handle.evaluate((h) => h.history.canUndo())).toBe(true);
	});
});

test.describe("canvas handle / viewport", () => {
	test("clamps the zoom centerOn is given to the canvas zoom range", async ({
		canvas,
	}) => {
		const handle = await readCanvasHandle(canvas.page);

		expect(
			await handle.evaluate((h) => ({
				tooFar: h.viewport.centerOn({ x: 0, y: 0 }, { zoom: 99 }).zoom,
				tooClose: h.viewport.centerOn({ x: 0, y: 0 }, { zoom: 0.0001 }).zoom,
			})),
		).toEqual({ tooFar: 10, tooClose: 0.1 });

		await expect
			.poll(() => handle.evaluate((h) => h.viewport.getViewport().zoom), {
				message: "the clamped zoom is the one the view ends up at",
			})
			.toBe(0.1);
	});

	test("puts the world point centerOn is given at the middle of the view", async ({
		canvas,
	}) => {
		const handle = await readCanvasHandle(canvas.page);
		const target = { x: 1234, y: -567 };

		await handle.evaluate(
			(h, point) => h.viewport.centerOn(point, { zoom: 2 }),
			target,
		);
		await expect
			.poll(() => handle.evaluate((h) => h.viewport.getViewport().zoom))
			.toBe(2);

		const middle = await handle.evaluate((h) => {
			const view = h.viewport.getVisibleWorldRect();
			return { x: view.x + view.width / 2, y: view.y + view.height / 2 };
		});
		expect(middle.x).toBeCloseTo(target.x, 2);
		expect(middle.y).toBeCloseTo(target.y, 2);
	});

	test("round-trips a point between world and client coordinates", async ({
		canvas,
	}) => {
		const handle = await readCanvasHandle(canvas.page);
		await handle.evaluate((h) =>
			h.viewport.centerOn({ x: 200, y: 120 }, { zoom: 2.5 }),
		);
		await expect
			.poll(() => handle.evaluate((h) => h.viewport.getViewport().zoom), {
				message: "the camera is on screen before the CTM is read through it",
			})
			.toBe(2.5);

		const roundTrip = await handle.evaluate((h) => {
			const fromClient = { x: 700, y: 400 };
			const world = h.viewport.toWorld(fromClient);
			const fromWorld = { x: 260, y: 150 };
			const client = h.viewport.toClient(fromWorld);
			return {
				world,
				backToClient: world === null ? null : h.viewport.toClient(world),
				backToWorld: client === null ? null : h.viewport.toWorld(client),
				view: h.viewport.getVisibleWorldRect(),
			};
		});

		expect(roundTrip.backToClient).not.toBeNull();
		expect(roundTrip.backToClient?.x).toBeCloseTo(700, 3);
		expect(roundTrip.backToClient?.y).toBeCloseTo(400, 3);
		expect(roundTrip.backToWorld).not.toBeNull();
		expect(roundTrip.backToWorld?.x).toBeCloseTo(260, 3);
		expect(roundTrip.backToWorld?.y).toBeCloseTo(150, 3);
		// A client point over the canvas maps into what the view says it shows.
		const { world, view } = roundTrip;
		expect(world).not.toBeNull();
		expect(world!.x).toBeGreaterThan(view.x);
		expect(world!.x).toBeLessThan(view.x + view.width);
		expect(world!.y).toBeGreaterThan(view.y);
		expect(world!.y).toBeLessThan(view.y + view.height);
	});

	test("fits a selection holding nothing but a connector", async ({
		canvas,
	}) => {
		const handle = await readCanvasHandle(canvas.page);
		const { connector } = await drawConnectedPair(canvas, handle);

		await handle.evaluate((h, id) => h.selection.select([id]), connector);
		await expect
			.poll(() => handle.evaluate((h) => h.selection.getSelectedIds()), {
				message: "the connector is selected before the fit is asked for",
			})
			.toEqual([connector]);

		expect(
			await handle.evaluate((h) => h.viewport.fitToSelection()),
		).not.toBeNull();

		// The connector is what the view now shows, so the fit read the connector
		// channel rather than the (empty) shape selection.
		await expect
			.poll(
				() =>
					handle.evaluate((h, id) => {
						const bounds = h.measure.visualBounds([id]);
						const view = h.viewport.getVisibleWorldRect();
						return (
							bounds !== null &&
							bounds.x >= view.x &&
							bounds.y >= view.y &&
							bounds.x + bounds.width <= view.x + view.width &&
							bounds.y + bounds.height <= view.y + view.height
						);
					}, connector),
				{ message: "the connector is inside the fitted view" },
			)
			.toBe(true);
	});

	test("returns null and leaves the view alone when there is nothing to fit", async ({
		canvas,
	}) => {
		const handle = await readCanvasHandle(canvas.page);
		const before = await handle.evaluate((h) => h.viewport.getViewport());

		expect(
			await handle.evaluate((h) => ({
				content: h.viewport.fitToContent(),
				selection: h.viewport.fitToSelection(),
			})),
		).toEqual({ content: null, selection: null });

		expect(await handle.evaluate((h) => h.viewport.getViewport())).toEqual(
			before,
		);
	});
});

test.describe("canvas handle / measure", () => {
	test("answers null for what it cannot measure", async ({ canvas }) => {
		const handle = await readCanvasHandle(canvas.page);
		const rect = await canvas.drawShape(
			"Rectangle",
			{ x: 300, y: 200 },
			{ x: 460, y: 300 },
		);

		expect(
			await handle.evaluate(
				(h, id) => ({
					missingBounds: h.measure.visualBounds(["no-such-id"]),
					missingSlot: h.measure.textSlot("no-such-id"),
					missingPath: h.measure.connectorPath("no-such-id"),
					// A shape is not a connector, however drawable its outline is.
					shapePath: h.measure.connectorPath(id),
					// A missing id among present ones is skipped, not fatal.
					mixedBounds: h.measure.visualBounds([id, "no-such-id"]) !== null,
				}),
				rect,
			),
		).toEqual({
			missingBounds: null,
			missingSlot: null,
			missingPath: null,
			shapePath: null,
			mixedBounds: true,
		});
	});

	test("measures the first text slot when none is named", async ({
		canvas,
	}) => {
		const handle = await readCanvasHandle(canvas.page);
		const rect = await canvas.drawShape(
			"Rectangle",
			{ x: 300, y: 200 },
			{ x: 460, y: 300 },
		);
		await canvas.typeTextAt({ x: 380, y: 250 }, "one two three four five");
		await canvas.commitText();

		const measured = await handle.evaluate((h, id) => {
			const fallback = h.measure.textSlot(id);
			return fallback === null
				? null
				: {
						fallback,
						named: h.measure.textSlot(id, fallback.slotId),
						unknown: h.measure.textSlot(id, "no-such-slot"),
					};
		}, rect);

		expect(measured).not.toBeNull();
		expect(measured!.named).toEqual(measured!.fallback);
		expect(measured!.unknown).toBeNull();
		expect(measured!.fallback.lineCount).toBeGreaterThanOrEqual(1);
		expect(measured!.fallback.textSize.width).toBeGreaterThan(0);
		expect(measured!.fallback.regionSize.width).toBeGreaterThan(0);
	});

	test("widens what counts as a hit on a connector by the tolerance", async ({
		canvas,
	}) => {
		const handle = await readCanvasHandle(canvas.page);
		const { connector } = await drawConnectedPair(canvas, handle);

		const probe = await handle.evaluate((h, id) => {
			const path = h.measure.connectorPath(id);
			if (path === null || path.length < 2) {
				return null;
			}
			// Perpendicular to the first segment, so the offset point leaves the
			// route whichever way the router bent it.
			const [start, next] = path;
			const length = Math.hypot(next.x - start.x, next.y - start.y);
			const onPath = {
				x: (start.x + next.x) / 2,
				y: (start.y + next.y) / 2,
			};
			const beside = {
				x: onPath.x - ((next.y - start.y) / length) * 12,
				y: onPath.y + ((next.x - start.x) / length) * 12,
			};
			return {
				onPath: h.measure.hitTest(onPath),
				besideDefault: h.measure.hitTest(beside),
				besideWide: h.measure.hitTest(beside, { tolerance: 24 }),
			};
		}, connector);

		expect(probe, "the connector resolves to a drawn path").not.toBeNull();
		expect(probe!.onPath).toContain(connector);
		expect(probe!.besideDefault).not.toContain(connector);
		expect(probe!.besideWide).toContain(connector);
	});

	test("reports overlapping shapes and hit-tests them front-most first", async ({
		canvas,
	}) => {
		const handle = await readCanvasHandle(canvas.page);
		const back = await canvas.drawShape(
			"Rectangle",
			{ x: 300, y: 200 },
			{ x: 500, y: 340 },
		);
		await canvas.deselect();
		const front = await canvas.drawShape(
			"Rectangle",
			{ x: 420, y: 260 },
			{ x: 620, y: 400 },
		);
		await canvas.deselect();
		const apart = await canvas.drawShape(
			"Rectangle",
			{ x: 800, y: 200 },
			{ x: 900, y: 280 },
		);

		const result = await handle.evaluate(
			(h, ids) => {
				const overlaps = h.measure.findOverlaps();
				const shared = overlaps[0]?.overlap ?? null;
				return {
					pairs: overlaps.map((overlap) => [...overlap.ids].sort()),
					covers: overlaps.map((overlap) => overlap.covers),
					shared,
					hit:
						shared === null
							? []
							: h.measure.hitTest({
									x: shared.x + shared.width / 2,
									y: shared.y + shared.height / 2,
								}),
					apartOnly: h.measure.findOverlaps([ids.back, ids.apart]),
				};
			},
			{ back, front, apart },
		);

		expect(result.pairs).toEqual([[back, front].sort()]);
		// Neither box contains the other, so this is the partial overlap a layout
		// check is looking for.
		expect(result.covers).toEqual([null]);
		expect(result.shared?.width).toBeGreaterThan(0);
		expect(result.shared?.height).toBeGreaterThan(0);
		expect(result.hit[0]).toBe(front);
		expect(result.apartOnly).toEqual([]);
	});
});

test.describe("canvas handle / export", () => {
	test("builds an SVG document out of what is drawn", async ({ canvas }) => {
		const handle = await readCanvasHandle(canvas.page);
		await canvas.drawShape("Rectangle", { x: 300, y: 200 }, { x: 460, y: 300 });

		const exported = await handle.evaluate((h) => {
			const text = h.export.toSvgString();
			if (text === null) {
				return null;
			}
			const root = new DOMParser().parseFromString(
				text,
				"image/svg+xml",
			).documentElement;
			return {
				rootTag: root.tagName,
				viewBox: root.getAttribute("viewBox"),
				rectCount: root.getElementsByTagName("rect").length,
			};
		});

		expect(
			exported,
			"a mounted canvas exports rather than yielding null",
		).not.toBeNull();
		expect(exported!.rootTag).toBe("svg");
		expect(exported!.viewBox).not.toBeNull();
		expect(exported!.rectCount).toBeGreaterThan(0);
	});

	test("captures the visible world when the region has nothing to measure", async ({
		canvas,
	}) => {
		const handle = await readCanvasHandle(canvas.page);
		await canvas.drawShape("Rectangle", { x: 300, y: 200 }, { x: 460, y: 300 });

		// The image is not brought back: only the frame of reference it came with,
		// which is what turns a position in the image into a world coordinate.
		const capture = await handle.evaluate(async (h) => {
			const result = await h.export.capturePng({
				region: { ids: ["no-such-id"] },
			});
			return result === null
				? null
				: {
						region: result.region,
						visible: h.viewport.getVisibleWorldRect(),
						pixelWidth: result.pixelWidth,
						pixelHeight: result.pixelHeight,
						blobType: result.blob.type,
						blobSize: result.blob.size,
					};
		});

		expect(
			capture,
			"a mounted canvas captures rather than yielding null",
		).not.toBeNull();
		expect(capture!.region).toEqual(capture!.visible);
		expect(capture!.blobType).toBe("image/png");
		expect(capture!.blobSize).toBeGreaterThan(0);
		expect(capture!.pixelWidth).toBeGreaterThan(0);
		expect(capture!.pixelHeight).toBeGreaterThan(0);
	});
});

test.describe("canvas handle / selection", () => {
	test("round-trips ids through select and getSelectedIds", async ({
		canvas,
	}) => {
		const handle = await readCanvasHandle(canvas.page);
		const first = await canvas.drawShape(
			"Rectangle",
			{ x: 300, y: 200 },
			{ x: 460, y: 300 },
		);
		await canvas.deselect();
		const second = await canvas.drawShape(
			"Rectangle",
			{ x: 560, y: 200 },
			{ x: 720, y: 300 },
		);

		expect(
			await handle.evaluate(
				(h, ids) => h.selection.select(ids),
				[first, second],
			),
		).toEqual({
			selectedIds: [first, second],
			selectedConnectorId: null,
			ignoredIds: [],
		});
		await expect
			.poll(() => handle.evaluate((h) => h.selection.getSelectedIds()))
			.toEqual([first, second]);

		await handle.evaluate((h) => h.selection.select([]));
		await expect
			.poll(() => handle.evaluate((h) => h.selection.getSelectedIds()), {
				message: "an empty list clears the selection",
			})
			.toEqual([]);
	});

	test("drops the ids it cannot select and names them", async ({ canvas }) => {
		const handle = await readCanvasHandle(canvas.page);
		const { source, connector } = await drawConnectedPair(canvas, handle);

		expect(
			await handle.evaluate(
				(h, id) => h.selection.select([id, "no-such-id"]),
				source,
			),
		).toEqual({
			selectedIds: [source],
			selectedConnectorId: null,
			ignoredIds: ["no-such-id"],
		});

		// A connector is selectable on its own and no other way.
		expect(
			await handle.evaluate(
				(h, ids) => h.selection.select(ids),
				[source, connector],
			),
		).toEqual({
			selectedIds: [source],
			selectedConnectorId: null,
			ignoredIds: [connector],
		});
		await expect
			.poll(() => handle.evaluate((h) => h.selection.getSelectedIds()))
			.toEqual([source]);

		expect(
			await handle.evaluate((h, id) => h.selection.select([id]), connector),
		).toEqual({
			selectedIds: [],
			selectedConnectorId: connector,
			ignoredIds: [],
		});
		await expect
			.poll(() => handle.evaluate((h) => h.selection.getSelectedIds()), {
				message: "the connector channel is read back out with the shapes",
			})
			.toEqual([connector]);
	});
});

test.describe("canvas handle / interaction", () => {
	test("reports the canvas busy while a drag is under way", async ({
		canvas,
	}) => {
		const handle = await readCanvasHandle(canvas.page);
		await canvas.drawShape("Rectangle", { x: 300, y: 200 }, { x: 460, y: 300 });
		expect(
			await handle.evaluate((h) => h.interaction.getStatus()),
		).toMatchObject({ drag: null, isBusy: false, editingTextId: null });

		await canvas.dragInspecting(
			{ x: 380, y: 250 },
			{ x: 520, y: 340 },
			async () => {
				const status = await handle.evaluate((h) => h.interaction.getStatus());
				expect(status.drag).not.toBeNull();
				expect(status.isBusy).toBe(true);
			},
		);

		await expect
			.poll(() => handle.evaluate((h) => h.interaction.getStatus().isBusy), {
				message: "releasing the drag ends the busy state",
			})
			.toBe(false);
	});

	test("counts an open text editor as busy and an armed tool as not", async ({
		canvas,
	}) => {
		const handle = await readCanvasHandle(canvas.page);
		const rect = await canvas.drawShape(
			"Rectangle",
			{ x: 300, y: 200 },
			{ x: 460, y: 300 },
		);

		await canvas.typeTextAt({ x: 380, y: 250 }, "uncommitted");
		expect(
			await handle.evaluate((h) => h.interaction.getStatus()),
		).toMatchObject({ editingTextId: rect, isBusy: true });
		await canvas.cancelText();

		// An armed tool waits for the user indefinitely, so it is deliberately
		// left out of isBusy — a host blocking on it would never write.
		await canvas.page.click(selectors.toolButton("Ellipse"));
		await expect.poll(() => canvas.isDrawingMode()).toBe(true);
		expect(
			await handle.evaluate((h) => h.interaction.getStatus()),
		).toMatchObject({ drawingShapeType: "ellipse", drag: null, isBusy: false });
	});
});
