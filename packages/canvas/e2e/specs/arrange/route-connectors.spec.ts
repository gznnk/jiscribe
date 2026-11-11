import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";
import { selectors } from "../../support/selectors";

/**
 * The command redrawing the lines without moving a shape, from the three places a
 * person reaches it: the sidebar's Canvas section, its Arrange section and the
 * context menu, opened on the background since a right click on a shape selects it.
 */

/** Empty canvas, clear of the three shapes. */
const BACKGROUND = { x: 300, y: 600 };

/** The middle shape, in content coordinates: the line from left to right runs through it. */
const OBSTACLE = { left: 450, top: 200, right: 570, bottom: 260 };

/** How finely a stretch of line is walked to see whether it enters the obstacle. */
const SAMPLES_PER_STRETCH = 64;

const REDRAW_BUTTON = selectors.propertyPanelCommand("routeConnectors");

/** How long the heavy drawing's run must keep the indicator fully up. */
const MIN_SHOWN_MS = 500;

/** Three rectangles in a row, the outer two joined; returns the ids and the connector's. */
async function drawLineThroughShape(
	canvas: CanvasDriver,
): Promise<{ shapeIds: string[]; connectorId: string }> {
	const shapeIds: string[] = [];
	for (const left of [200, 450, 700]) {
		shapeIds.push(
			await canvas.drawShape(
				"Rectangle",
				{ x: left, y: 200 },
				{ x: left + 120, y: 260 },
			),
		);
		await canvas.deselect();
	}
	await canvas.selectAt({ x: 260, y: 230 });
	const connectorId = await canvas.createConnector("rightCenter", {
		x: 760,
		y: 230,
	});
	await canvas.deselect();
	return { shapeIds, connectorId };
}

async function runsThroughObstacle(
	canvas: CanvasDriver,
	connectorId: string,
): Promise<boolean> {
	const points = await canvas.connectorPoints(connectorId);
	return points.slice(1).some((end, index) => {
		const start = points[index];
		return Array.from({ length: SAMPLES_PER_STRETCH + 1 }, (_, step) => {
			const ratio = step / SAMPLES_PER_STRETCH;
			return {
				x: start.x + (end.x - start.x) * ratio,
				y: start.y + (end.y - start.y) * ratio,
			};
		}).some(
			({ x, y }) =>
				x > OBSTACLE.left &&
				x < OBSTACLE.right &&
				y > OBSTACLE.top &&
				y < OBSTACLE.bottom,
		);
	});
}

async function boxesOf(canvas: CanvasDriver, ids: readonly string[]) {
	return Promise.all(ids.map((id) => canvas.objectById(id).boundingBox()));
}

/** The redraw row stands directly after the row holding the auto layout buttons. */
async function expectRowDirectlyAfterAutoLayout(
	canvas: CanvasDriver,
): Promise<void> {
	const isDirectlyAfter = await canvas.page
		.locator(REDRAW_BUTTON)
		.evaluate(
			(button, autoLayoutButton) =>
				button.parentElement?.parentElement?.previousElementSibling?.querySelector(
					autoLayoutButton,
				) != null,
			'[data-action="command:layoutLeftToRight"]',
		);
	expect(isDirectlyAfter).toBe(true);
}

/** A grid of rectangles with lines to far cells: enough for the run to take over a second. */
function buildHeavyDocText(): string {
	const COLUMNS = 16;
	const ROWS = 12;
	const idOf = (column: number, row: number) => `rect-${column}-${row}`;
	const rects = [];
	const connectors = [];
	for (let column = 0; column < COLUMNS; column += 1) {
		for (let row = 0; row < ROWS; row += 1) {
			rects.push({
				id: idOf(column, row),
				type: "rect",
				x: column * 180,
				y: row * 120,
				width: 100,
				height: 60,
			});
			connectors.push({
				id: `line-${column}-${row}`,
				type: "connector",
				points: [],
				source: {
					owner: { id: idOf(column, row) },
					anchor: { kind: "connectPoint", id: "rightCenter" },
				},
				target: {
					owner: { id: idOf((column + 7) % COLUMNS, (row + 5) % ROWS) },
					anchor: { kind: "connectPoint", id: "leftCenter" },
				},
			});
		}
	}
	return JSON.stringify({ version: 1, root: [...rects, ...connectors] });
}

async function loadDoc(canvas: CanvasDriver, docText: string): Promise<void> {
	await canvas.page.evaluate((text) => {
		const hook = (
			window as unknown as { __setHarnessDoc?: (docText: string) => void }
		).__setHarnessDoc;
		if (!hook) {
			throw new Error(
				"__setHarnessDoc is undefined (harness hook not installed)",
			);
		}
		hook(text);
	}, docText);
}

type IndicatorLog = {
	addedAt?: number;
	removedAt?: number;
	text?: string | null;
	initialOpacity?: string;
	fadeDelay?: string;
	fadeDuration?: string;
};

/** A computed `animation-delay` or `animation-duration` (`"0.3s"`) in ms. */
function cssSecondsToMs(seconds: string | undefined): number {
	return Number.parseFloat(seconds as string) * 1000;
}

/**
 * Logs when the indicator enters and leaves the DOM, in epoch ms. The redraw blocks
 * the main thread, so nothing in the page can read it during the run; the two
 * timestamps bracket the run instead.
 */
async function watchIndicator(
	canvas: CanvasDriver,
	canvasArea: string,
): Promise<void> {
	await canvas.page.evaluate((area) => {
		const log: IndicatorLog = {};
		(window as unknown as { __indicatorLog: IndicatorLog }).__indicatorLog =
			log;
		const root = document.querySelector(area) as Element;
		new MutationObserver(() => {
			const indicator = root.querySelector('[role="status"]');
			if (indicator !== null && log.addedAt === undefined) {
				log.addedAt = Date.now();
				log.text = indicator.textContent;
				const pillStyle = getComputedStyle(indicator);
				log.initialOpacity = pillStyle.opacity;
				log.fadeDelay = pillStyle.animationDelay;
				log.fadeDuration = pillStyle.animationDuration;
			}
			if (
				indicator === null &&
				log.addedAt !== undefined &&
				log.removedAt === undefined
			) {
				log.removedAt = Date.now();
			}
		}).observe(root, { childList: true, subtree: true });
	}, canvasArea);
}

function readIndicatorLog(canvas: CanvasDriver): Promise<IndicatorLog> {
	return canvas.page.evaluate(
		() =>
			(window as unknown as { __indicatorLog: IndicatorLog }).__indicatorLog,
	);
}

/** Runs `press`, then checks the line left the obstacle, the shapes stayed and Undo restores it. */
async function expectRedrawnAroundObstacle(
	canvas: CanvasDriver,
	shapeIds: readonly string[],
	connectorId: string,
	press: () => Promise<void>,
): Promise<void> {
	expect(await runsThroughObstacle(canvas, connectorId)).toBe(true);
	const boxesBefore = await boxesOf(canvas, shapeIds);
	const pointsBefore = await canvas.connectorPoints(connectorId);

	await press();

	await expect.poll(() => runsThroughObstacle(canvas, connectorId)).toBe(false);
	expect(await boxesOf(canvas, shapeIds)).toEqual(boxesBefore);

	await canvas.undo();
	await expect
		.poll(() => canvas.connectorPoints(connectorId))
		.toEqual(pointsBefore);
	expect(await runsThroughObstacle(canvas, connectorId)).toBe(true);
}

test.describe("redrawing the lines only", () => {
	test("takes a line out of the shape it crosses from the Canvas section, and Undo restores it", async ({
		canvas,
	}) => {
		const { shapeIds, connectorId } = await drawLineThroughShape(canvas);
		await canvas.openPropertyPanel();
		await expect(
			canvas.page.locator(selectors.propertyPanelSection("canvas")),
		).toBeVisible();
		await expectRowDirectlyAfterAutoLayout(canvas);

		await expectRedrawnAroundObstacle(canvas, shapeIds, connectorId, () =>
			canvas.page.click(REDRAW_BUTTON),
		);
	});

	test("takes a line out of the shape it crosses from the Arrange section, and Undo restores it", async ({
		canvas,
	}) => {
		const { shapeIds, connectorId } = await drawLineThroughShape(canvas);
		await canvas.openPropertyPanel();
		await canvas.selectAll();
		await expect(
			canvas.page.locator(selectors.propertyPanelSection("arrange")),
		).toBeVisible();
		await expectRowDirectlyAfterAutoLayout(canvas);

		await expectRedrawnAroundObstacle(canvas, shapeIds, connectorId, () =>
			canvas.page.click(REDRAW_BUTTON),
		);
	});

	test("takes a line out of the shape it crosses from the context menu, right after the layout entries", async ({
		canvas,
	}) => {
		const { shapeIds, connectorId } = await drawLineThroughShape(canvas);

		await expectRedrawnAroundObstacle(
			canvas,
			shapeIds,
			connectorId,
			async () => {
				await canvas.openContextMenu(BACKGROUND);
				const entry = canvas.page.locator(
					selectors.contextMenuCommand("routeConnectors"),
				);
				await expect(entry).toHaveText("Redraw lines only (shapes stay put)");
				expect(
					await entry.evaluate(
						(element) =>
							element.previousElementSibling?.getAttribute("data-action") ??
							null,
					),
				).toBe("command:layoutLeftToRight");
				await canvas.clickContextMenuCommand("routeConnectors");
				await expect.poll(() => canvas.contextMenuVisible()).toBe(false);
			},
		);
	});

	test("on a run that takes a while, the indicator shows after a delay and goes when the run ends", async ({
		canvas,
	}) => {
		test.slow();
		await loadDoc(canvas, buildHeavyDocText());
		await canvas.openPropertyPanel();
		const button = canvas.page.locator(REDRAW_BUTTON);
		await expect(button).toBeEnabled();
		await watchIndicator(canvas, selectors.canvasArea);

		const clicked = button.click();
		await expect
			.poll(async () => (await readIndicatorLog(canvas)).removedAt, {
				timeout: 60_000,
			})
			.toBeDefined();
		await clicked;

		const {
			addedAt,
			removedAt,
			text,
			initialOpacity,
			fadeDelay,
			fadeDuration,
		} = await readIndicatorLog(canvas);
		const fadeDelayMs = cssSecondsToMs(fadeDelay);
		const shownFrom =
			(addedAt as number) + fadeDelayMs + cssSecondsToMs(fadeDuration);
		expect(text).toBe("Redrawing lines…");
		expect(initialOpacity).toBe("0");
		expect(fadeDelayMs).toBeGreaterThan(0);
		expect((removedAt as number) - shownFrom).toBeGreaterThan(MIN_SHOWN_MS);
		await expect(canvas.page.getByRole("status")).toHaveCount(0);
	});

	test("is disabled with no line to redraw, the row staying", async ({
		canvas,
	}) => {
		await canvas.drawShape("Rectangle", { x: 200, y: 200 }, { x: 320, y: 260 });
		await canvas.deselect();
		await canvas.openPropertyPanel();

		await expect(canvas.page.locator(REDRAW_BUTTON)).toBeDisabled();
	});

	test("shows its own row, the button filling the control column", async ({
		canvas,
	}) => {
		await drawLineThroughShape(canvas);
		await canvas.openPropertyPanel();

		const button = canvas.page.locator(REDRAW_BUTTON);
		await expect(button).toHaveText("Redraw");
		await expect(button).toHaveAttribute(
			"title",
			"Redraws the lines around the shapes without moving any shape",
		);
		await expect(button).toBeEnabled();
		const { buttonWidth, columnWidth, rowLabel } = await button.evaluate(
			(element) => {
				const column = element.parentElement as HTMLElement;
				return {
					buttonWidth: element.getBoundingClientRect().width,
					columnWidth: column.getBoundingClientRect().width,
					rowLabel: column.previousElementSibling?.textContent ?? "",
				};
			},
		);
		expect(rowLabel).toBe("Lines only");
		expect(buttonWidth).toBe(columnWidth);
	});
});
