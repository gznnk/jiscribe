import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";
import { selectors } from "../../support/selectors";

/**
 * What the properties sidebar offers for a selected connector beyond the line
 * and arrow rows its features imply: the routing row at the end of the Line
 * section, and the Label and Label border sections, which appear only once the
 * connector carries label text.
 *
 * The routing assertions read the rendered route the way
 * `specs/shapes/connector-routing-switch.spec.ts` does — straight is a single
 * diagonal, orthogonal a right-angled polyline — since a segment that lights up
 * without redrawing the line would otherwise pass.
 */

type Vec = { x: number; y: number };

/** Tolerance a segment is still called horizontal or vertical within. */
const EPS = 1.5;

function parsePoints(attr: string | null): Vec[] {
	if (!attr) {
		throw new Error("points attribute is missing");
	}
	return attr
		.trim()
		.split(/\s+/)
		.map((pair) => {
			const [x, y] = pair.split(",").map(Number);
			return { x, y };
		});
}

/** Reads the currently rendered points of the connector. */
async function readPoints(
	canvas: CanvasDriver,
	connectorId: string,
): Promise<Vec[]> {
	return parsePoints(
		await canvas.objectById(connectorId).getAttribute("points"),
	);
}

/** Every pair of adjacent vertices is horizontal or vertical (no diagonal, no duplicate). */
function assertOrthogonalSegments(points: Vec[]) {
	for (let i = 1; i < points.length; i++) {
		const prev = points[i - 1];
		const cur = points[i];
		const horizontal = Math.abs(prev.y - cur.y) <= EPS;
		const vertical = Math.abs(prev.x - cur.x) <= EPS;
		expect(
			horizontal !== vertical,
			`segment ${i - 1}->${i} is not at a right angle: ${JSON.stringify(prev)} -> ${JSON.stringify(cur)}`,
		).toBe(true);
	}
}

/** Midpoint of the connector's longest segment, which is always a point on the line. */
async function pointOnLongestSegment(
	canvas: CanvasDriver,
	connectorId: string,
): Promise<Vec> {
	const points = await readPoints(canvas, connectorId);
	let best = { mid: points[0], length: -1 };
	for (let i = 1; i < points.length; i++) {
		const from = points[i - 1];
		const to = points[i];
		const length = Math.hypot(to.x - from.x, to.y - from.y);
		if (length > best.length) {
			best = {
				mid: { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 },
				length,
			};
		}
	}
	return best.mid;
}

/**
 * Clicks a point on the connector and waits for the sidebar to hold its
 * sections. A connector puts up no control handles, so `selectAt` cannot be
 * used; the Line section appearing is what says the selection landed.
 */
async function selectConnectorAt(canvas: CanvasDriver, point: Vec) {
	await canvas.clickAt(point);
	await expect(
		canvas.page.locator(selectors.propertyPanelSection("line")),
	).toBeVisible();
}

/**
 * Joins two rectangles placed diagonally apart, from the source's rightCenter to
 * the target's leftCenter, and returns the connector id. Both ends being edge
 * anchors is what makes the default routing orthogonal, which the routing test
 * starts from.
 */
async function buildDiagonalConnector(canvas: CanvasDriver): Promise<string> {
	await canvas.drawShape("Rectangle", { x: 200, y: 150 }, { x: 340, y: 250 });
	await canvas.deselect();
	await canvas.drawShape("Rectangle", { x: 600, y: 400 }, { x: 740, y: 500 });
	await canvas.deselect();

	await canvas.selectAt({ x: 270, y: 200 });
	// Dropped on the target's left edge center, so the end is a leftCenter anchor.
	const connectorId = await canvas.createConnector("rightCenter", {
		x: 600,
		y: 450,
	});
	await canvas.deselect();
	return connectorId;
}

/** The label box of a connector: the single div inside its foreignObject. */
function labelBoxOf(canvas: CanvasDriver, connectorId: string) {
	return canvas.page
		.locator(`foreignObject[data-kind=connector][data-id="${connectorId}"]`)
		.locator("div")
		.first();
}

/**
 * Builds the diagonal connector, gives it a label at a point on the line, opens
 * the sidebar and leaves the connector selected.
 */
async function setupLabelledConnector(canvas: CanvasDriver): Promise<string> {
	const connectorId = await buildDiagonalConnector(canvas);
	const onLine = await pointOnLongestSegment(canvas, connectorId);
	await canvas.typeTextAt(onLine, "Yes");
	await canvas.commitText();

	await canvas.openPropertyPanel();
	// The label is created where it was double clicked, so that point now hits it.
	await selectConnectorAt(canvas, onLine);
	return connectorId;
}

/**
 * The mark drawn at each end of the connector, fingerprinted by the `points` of
 * the arrow polygon that end carries; null for an end carrying none. Each
 * polygon is assigned to whichever endpoint it sits nearer to, so a connector
 * marked on one end alone leaves the other end null.
 */
async function arrowMarksByEnd(
	canvas: CanvasDriver,
	connectorId: string,
): Promise<{ start: string | null; end: string | null }> {
	const points = await readPoints(canvas, connectorId);
	return canvas.page.evaluate(
		({ cid, start, end }) => {
			const marks = [
				...document.querySelectorAll(
					`polygon[data-kind="connector"][data-id="${cid}"]`,
				),
			].map((polygon) => {
				const matched = (polygon.getAttribute("transform") ?? "").match(
					/matrix\(([^)]+)\)/,
				);
				const numbers = matched ? matched[1].split(",").map(Number) : [];
				return {
					points: polygon.getAttribute("points"),
					x: numbers[4],
					y: numbers[5],
				};
			});
			const distanceTo = (
				mark: { x: number; y: number },
				point: { x: number; y: number },
			) => Math.hypot(mark.x - point.x, mark.y - point.y);
			const markAt = (
				point: { x: number; y: number },
				otherEnd: { x: number; y: number },
			) =>
				marks.find(
					(mark) => distanceTo(mark, point) <= distanceTo(mark, otherEnd),
				)?.points ?? null;
			return { start: markAt(start, end), end: markAt(end, start) };
		},
		{ cid: connectorId, start: points[0], end: points[points.length - 1] },
	);
}

test.describe("Properties sidebar: connector", () => {
	test("switches the routing from the Line section's segments, and undo puts it back", async ({
		canvas,
	}) => {
		const connectorId = await buildDiagonalConnector(canvas);
		await canvas.openPropertyPanel();
		await selectConnectorAt(
			canvas,
			await pointOnLongestSegment(canvas, connectorId),
		);

		const orthogonal = canvas.page.locator(
			selectors.propertyPanelCommand("setRoutingOrthogonal"),
		);
		const straight = canvas.page.locator(
			selectors.propertyPanelCommand("setRoutingStraight"),
		);

		// An omitted routing draws orthogonal, and the diagonal layout bends, so the
		// route starts as a right-angled polyline with the orthogonal segment lit.
		const initial = await readPoints(canvas, connectorId);
		expect(
			initial.length,
			`the default routing is a right-angled polyline: ${JSON.stringify(initial)}`,
		).toBeGreaterThanOrEqual(3);
		assertOrthogonalSegments(initial);
		await expect(orthogonal).toHaveAttribute("aria-pressed", "true");
		await expect(straight).toHaveAttribute("aria-pressed", "false");

		await straight.click();
		await expect
			.poll(async () => (await readPoints(canvas, connectorId)).length, {
				message: "the straight segment redraws the route as a single diagonal",
			})
			.toBe(2);
		const diagonal = await readPoints(canvas, connectorId);
		expect(
			Math.abs(diagonal[0].x - diagonal[1].x),
			"straight changes x (not vertical)",
		).toBeGreaterThan(EPS);
		expect(
			Math.abs(diagonal[0].y - diagonal[1].y),
			"straight changes y (not horizontal)",
		).toBeGreaterThan(EPS);
		await expect(straight).toHaveAttribute("aria-pressed", "true");
		await expect(orthogonal).toHaveAttribute("aria-pressed", "false");

		// The selection survives the write, so the other segment needs no re-select.
		await orthogonal.click();
		await expect
			.poll(async () => (await readPoints(canvas, connectorId)).length, {
				message: "the orthogonal segment brings the right angles back",
			})
			.toBeGreaterThanOrEqual(3);
		assertOrthogonalSegments(await readPoints(canvas, connectorId));

		await canvas.undo();
		await expect
			.poll(async () => (await readPoints(canvas, connectorId)).length, {
				message:
					"undo takes the route back to the straight it was switched from",
			})
			.toBe(2);
	});

	test("offers the Label and Label border sections only once the connector carries label text", async ({
		canvas,
	}) => {
		const connectorId = await buildDiagonalConnector(canvas);
		await canvas.openPropertyPanel();
		const onLine = await pointOnLongestSegment(canvas, connectorId);
		await selectConnectorAt(canvas, onLine);

		await expect(
			canvas.page.locator(selectors.propertyPanelSection("label")),
			"a connector with no label has nothing to style, heading included",
		).toHaveCount(0);
		await expect(
			canvas.page.locator(selectors.propertyPanelSection("label-border")),
		).toHaveCount(0);
		await expect(
			canvas.page.locator(selectors.propertyPanelSection("arrow")),
			"the sections its features imply are there all along",
		).toBeVisible();

		// A double click on the line starts label editing; committing draws it. The
		// selection is dropped first because a selected connector puts its own
		// handles over the line, and the double click would land on one of them.
		await canvas.deselect();
		await canvas.typeTextAt(onLine, "Yes");
		await canvas.commitText();
		await selectConnectorAt(canvas, onLine);

		await expect(
			canvas.page.locator(selectors.propertyPanelSection("label")),
		).toBeVisible();
		await expect(
			canvas.page.locator(selectors.propertyPanelField("label.fontSize")),
			"and the section's rows come with it",
		).toBeVisible();
		await expect(
			canvas.page.locator(selectors.propertyPanelSection("label-border")),
		).toBeVisible();
		await expect(
			canvas.page.locator(selectors.propertyPanelField("label.strokeWidth")),
		).toBeVisible();
	});

	test("fills the label box from the Label section's background field", async ({
		canvas,
	}) => {
		const connectorId = await setupLabelledConnector(canvas);

		await canvas.page
			.locator(
				`${selectors.propertyPanel} [aria-label="Label Background Color"]`,
			)
			.click();
		await canvas.page.click(
			selectors.propertyPanelSet("label.fill", "#dc2626"),
		);

		await expect(labelBoxOf(canvas, connectorId)).toHaveCSS(
			"background-color",
			"rgb(220, 38, 38)",
		);
	});

	test("makes the label bold from the Label section's style segment", async ({
		canvas,
	}) => {
		const connectorId = await setupLabelledConnector(canvas);

		await canvas.page.click(
			selectors.propertyPanelSet("label.fontWeight", "bold"),
		);

		await expect(labelBoxOf(canvas, connectorId)).toHaveCSS(
			"font-weight",
			"700",
		);
	});

	test("resizes the label text to a size typed into the Label section's field", async ({
		canvas,
	}) => {
		const connectorId = await setupLabelledConnector(canvas);
		const labelBox = labelBoxOf(canvas, connectorId);
		await expect(labelBox).toHaveCSS("font-size", "16px");

		const fontSize = canvas.page.locator(
			selectors.propertyPanelField("label.fontSize"),
		);
		await fontSize.fill("28");
		await fontSize.press("Enter");

		await expect(labelBox).toHaveCSS("font-size", "28px");
	});

	test("swaps the two ends from the Arrow row, and undo puts them back", async ({
		canvas,
	}) => {
		const connectorId = await buildDiagonalConnector(canvas);
		await canvas.openPropertyPanel();
		await selectConnectorAt(
			canvas,
			await pointOnLongestSegment(canvas, connectorId),
		);

		// A new connector is marked on its end alone, so the start is given a mark
		// of its own: two ends that can be told apart once swapped.
		const startArrow = canvas.page.locator(
			`${selectors.propertyPanel} [aria-label="Start Arrow"]`,
		);
		await startArrow.click();
		await canvas.page.click(
			selectors.propertyPanelSet("startArrow", "FilledTriangle"),
		);
		await expect
			.poll(async () => (await arrowMarksByEnd(canvas, connectorId)).start)
			.toBeTruthy();
		// The grid stays up on a pick, and it is the swap button's own row it opens
		// under; a second press on the trigger takes it away.
		await startArrow.click();

		const before = await arrowMarksByEnd(canvas, connectorId);
		expect(before.start).not.toBe(before.end);

		await canvas.page.click(selectors.propertyPanelCommand("swapArrows"));

		await expect
			.poll(async () => (await arrowMarksByEnd(canvas, connectorId)).start)
			.toBe(before.end);
		expect((await arrowMarksByEnd(canvas, connectorId)).end).toBe(before.start);

		await canvas.undo();
		await expect
			.poll(async () => (await arrowMarksByEnd(canvas, connectorId)).start, {
				message: "undo takes the marks back to the ends they were swapped from",
			})
			.toBe(before.start);
		expect((await arrowMarksByEnd(canvas, connectorId)).end).toBe(before.end);
	});
});
