import { expect, type Page } from "@playwright/test";

import {
	selectors,
	type AnchorId,
	type ColorSectionId,
	type ToolTitle,
} from "./selectors";

/**
 * Shape data used for snapshot comparison of canvas state.
 * The `e` and `f` components of `transform` are the shape's center coordinates.
 */
export type ObjectSnapshot = {
	id: string | null;
	tag: string;
	transform: string | null;
	fill: string | null;
	stroke: string | null;
};

/**
 * Dragging within 20px of a viewport edge triggers canvas auto-scroll
 * (AUTO_SCROLL_THRESHOLD). Keep test coordinates inside this margin.
 */
export const AUTO_SCROLL_MARGIN = 25;

/** Empty spot in content coordinates, clicked to deselect or commit text. */
const EMPTY_SPOT = { x: 70, y: 820 };

/**
 * Drives the canvas through the same UI operations a real user performs.
 *
 * No retries that would hide a failure: synchronization waits on state (an element appearing,
 * a count changing) rather than on time (waitForTimeout), so an operation that did not take
 * effect fails the test and surfaces as a product problem.
 */
export class CanvasDriver {
	/**
	 * Screen origin (top-left) of the canvas area (the SVG).
	 *
	 * Every test is written in content coordinates, which are screen coordinates minus this
	 * origin. The toolbar occupies layout space above, so the canvas starts at screen
	 * y = toolbar height. Pan and zoom only change the viewBox and never move the SVG element
	 * itself, so this origin is measured once and stays valid.
	 *
	 * Coordinates from boundingBox() are screen coordinates — pass them through toContent()
	 * before handing them to the driver.
	 */
	private originX = 0;
	private originY = 0;

	constructor(readonly page: Page) {}

	async goto() {
		await this.page.goto("/", { waitUntil: "networkidle" });
		await expect(
			this.page.locator(selectors.toolButton("Rectangle")),
		).toBeVisible();
		// Measure the screen offset of the canvas area. As a flex child it has real size from
		// mount, and its top-left sits one toolbar height down.
		const origin = await this.page.evaluate(() => {
			const el = document.querySelector('[data-kind="canvas"]');
			const rect = el?.getBoundingClientRect();
			return { x: rect?.left ?? 0, y: rect?.top ?? 0 };
		});
		this.originX = origin.x;
		this.originY = origin.y;
	}

	/**
	 * Content coordinates to screen coordinates. Used by the driver's own input methods, and by
	 * tests that send raw screen coordinates over CDP (multi-touch and the like).
	 */
	toScreen(point: { x: number; y: number }): { x: number; y: number } {
		return { x: point.x + this.originX, y: point.y + this.originY };
	}

	/** Screen coordinates to content coordinates; apply to anything from boundingBox(). */
	toContent(point: { x: number; y: number }): { x: number; y: number } {
		return { x: point.x - this.originX, y: point.y - this.originY };
	}

	/** Drag in screen coordinates with intermediate events; internal, applies no conversion. */
	private async dragScreen(
		fromScreen: { x: number; y: number },
		toScreen: { x: number; y: number },
		steps = 8,
	) {
		await this.page.mouse.move(fromScreen.x, fromScreen.y);
		await this.page.mouse.down();
		await this.page.mouse.move(toScreen.x, toScreen.y, { steps });
		await this.page.mouse.up();
	}

	/** Snapshot every shape and connector. */
	async captureObjects(): Promise<ObjectSnapshot[]> {
		return this.page.evaluate(
			({ objectSelector, connectorSelector, previewSelector }) =>
				[
					...document.querySelectorAll(
						`${objectSelector}, ${connectorSelector}`,
					),
				]
					// The drag-drawing ghost carries data-kind=object but is uncommitted, so drop it.
					.filter((el) => !el.closest(previewSelector))
					.map((el) => {
						// Colors come from emotion CSS rather than SVG attributes, so they
						// must be read from computed style (#38 / theme following). Values
						// are browser-normalized rgb(...).
						const style = getComputedStyle(el);
						return {
							id: el.getAttribute("data-id"),
							tag: el.tagName.toLowerCase(),
							transform: el.getAttribute("transform"),
							fill: style.fill,
							stroke: style.stroke,
						};
					}),
			{
				objectSelector: selectors.object,
				connectorSelector: selectors.connectorPolyline,
				previewSelector: selectors.drawingPreview,
			},
		);
	}

	/**
	 * Drag in content coordinates with intermediate events; gesture recognition needs the steps.
	 * Convert boundingBox-derived coordinates with toContent() first.
	 */
	async drag(
		from: { x: number; y: number },
		to: { x: number; y: number },
		steps = 8,
	) {
		await this.dragScreen(this.toScreen(from), this.toScreen(to), steps);
	}

	/**
	 * Turn the wheel at a point: ctrl zooms the canvas, otherwise it scrolls. The pointer is
	 * moved into place first so the wheel event's target is settled.
	 */
	async wheel(
		point: { x: number; y: number },
		{
			deltaX = 0,
			deltaY = 0,
			ctrl = false,
		}: { deltaX?: number; deltaY?: number; ctrl?: boolean },
	) {
		const screen = this.toScreen(point);
		await this.page.mouse.move(screen.x, screen.y);
		if (ctrl) {
			await this.page.keyboard.down("Control");
		}
		await this.page.mouse.wheel(deltaX, deltaY);
		if (ctrl) {
			await this.page.keyboard.up("Control");
		}
	}

	/**
	 * Drag as far as press-then-move, run `inspect` while still held, then release. Snap guides
	 * exist in the DOM only during the drag and are cleared on dragEnd, so guide assertions have
	 * to happen inside this callback.
	 *
	 * @param from - Start point in content coordinates, not screen coordinates
	 * @param to - End point in content coordinates; the pointer is left held here
	 * @param inspect - Runs with the button still down; the release happens even if it throws
	 * @param options.steps - Intermediate pointer moves, which gesture recognition needs
	 * @param options.ctrl - Hold Control through the drag, for verifying snap suppression
	 * @param options.shift - Hold Shift through the drag, for verifying axis lock
	 */
	async dragInspecting(
		from: { x: number; y: number },
		to: { x: number; y: number },
		inspect: () => Promise<void>,
		{
			steps = 10,
			ctrl = false,
			shift = false,
		}: { steps?: number; ctrl?: boolean; shift?: boolean } = {},
	) {
		const fromScreen = this.toScreen(from);
		const toScreen = this.toScreen(to);
		await this.page.mouse.move(fromScreen.x, fromScreen.y);
		await this.page.mouse.down();
		if (ctrl) {
			await this.page.keyboard.down("Control");
		}
		if (shift) {
			await this.page.keyboard.down("Shift");
		}
		await this.page.mouse.move(toScreen.x, toScreen.y, { steps });
		try {
			await inspect();
		} finally {
			await this.page.mouse.up();
			if (ctrl) {
				await this.page.keyboard.up("Control");
			}
			if (shift) {
				await this.page.keyboard.up("Shift");
			}
		}
	}

	/** Locator for the visible snap guides on an axis: x is vertical, y is horizontal. */
	snapGuides(axis: "x" | "y") {
		return this.page.getByTestId(`snap-guide:${axis}`);
	}

	/**
	 * Alignment coordinates of the visible snap guides on an axis: x1 for a vertical x-axis
	 * guide, y1 for a horizontal y-axis guide. At the default viewport (zoom 1, no pan) SVG
	 * coordinates equal screen coordinates.
	 */
	async snapGuideCoordinates(axis: "x" | "y"): Promise<number[]> {
		return this.page.evaluate((targetAxis) => {
			const attr = targetAxis === "x" ? "x1" : "y1";
			return [
				...document.querySelectorAll(
					`[data-testid="snap-guide:${targetAxis}"]`,
				),
			].map((el) => Number(el.getAttribute(attr)));
		}, axis);
	}

	/** Locator for the visible axis-lock guides on an axis: x is vertical, y is horizontal. */
	axisLockGuides(axis: "x" | "y") {
		return this.page.getByTestId(`axis-lock-guide:${axis}`);
	}

	/**
	 * Locked-axis coordinates of the visible axis-lock guides: x1 for a vertical x-axis guide,
	 * y1 for a horizontal y-axis guide. At the default viewport (zoom 1, no pan) SVG coordinates
	 * equal screen coordinates.
	 */
	async axisLockGuideCoordinates(axis: "x" | "y"): Promise<number[]> {
		return this.page.evaluate((targetAxis) => {
			const attr = targetAxis === "x" ? "x1" : "y1";
			return [
				...document.querySelectorAll(
					`[data-testid="axis-lock-guide:${targetAxis}"]`,
				),
			].map((el) => Number(el.getAttribute(attr)));
		}, axis);
	}

	/** Right-button drag, used to pan the viewport. */
	async rightDrag(
		from: { x: number; y: number },
		to: { x: number; y: number },
		steps = 8,
	) {
		const fromScreen = this.toScreen(from);
		const toScreen = this.toScreen(to);
		await this.page.mouse.move(fromScreen.x, fromScreen.y);
		await this.page.mouse.down({ button: "right" });
		await this.page.mouse.move(toScreen.x, toScreen.y, { steps });
		await this.page.mouse.up({ button: "right" });
	}

	/**
	 * Middle-button drag, used to pan the viewport (#159). Like the right button it routes to
	 * CanvasEventHandler, so it pans even when started over a shape.
	 */
	async middleDrag(
		from: { x: number; y: number },
		to: { x: number; y: number },
		steps = 8,
	) {
		const fromScreen = this.toScreen(from);
		const toScreen = this.toScreen(to);
		await this.page.mouse.move(fromScreen.x, fromScreen.y);
		await this.page.mouse.down({ button: "middle" });
		await this.page.mouse.move(toScreen.x, toScreen.y, { steps });
		await this.page.mouse.up({ button: "middle" });
	}

	/** Middle-click a content coordinate (#159); asserts nothing about the selection. */
	async middleClickAt(point: { x: number; y: number }) {
		const screen = this.toScreen(point);
		await this.page.mouse.click(screen.x, screen.y, { button: "middle" });
	}

	/**
	 * data-id list of the currently shown controls (selection handles, connection anchors).
	 * Controls are mounted only while visible, so this is exactly the visible set.
	 */
	async visibleControlIds(): Promise<string[]> {
		return this.page.evaluate(
			(controlSelector) =>
				[...document.querySelectorAll(controlSelector)]
					.map((el) => {
						const id = el.getAttribute("data-id");
						const part = el.getAttribute("data-part");
						return id === null ? null : part === null ? id : `${id}/${part}`;
					})
					.filter((descriptor): descriptor is string => descriptor !== null),
			selectors.control,
		);
	}

	/** Whether a specific control is shown; the descriptor is "<data-id>/<data-part>". */
	async isControlVisible(controlDescriptor: string): Promise<boolean> {
		return (await this.visibleControlIds()).includes(controlDescriptor);
	}

	/** Whether any control is shown; a cheap check for something being selected. */
	async hasAnyControl(): Promise<boolean> {
		return (await this.visibleControlIds()).length > 0;
	}

	/**
	 * Pick a tool, drag to draw a shape, and return the new shape's data-id. The shape is
	 * auto-selected right after drawing and the ObjectMenu appears.
	 */
	async drawShape(
		tool: ToolTitle,
		from: { x: number; y: number },
		to: { x: number; y: number },
	): Promise<string> {
		const before = await this.captureObjects();
		const beforeIds = new Set(before.map((obj) => obj.id));

		await this.page.click(selectors.toolButton(tool));

		// Clicking the tool sets drawing mode (state.shapeDrawing), but that is an async React
		// update: dragging the canvas before it arms leaves CanvasEventHandler seeing
		// shapeDrawing=null, giving area selection instead of drawing. An armed tool button
		// takes cursor: crosshair (grab when not armed), so wait on that before dragging.
		await expect
			.poll(
				() =>
					this.page
						.locator(selectors.toolButton(tool))
						.evaluate((el) => getComputedStyle(el).cursor),
				{ message: `${tool} tool enters drawing mode` },
			)
			.toBe("crosshair");

		await this.drag(from, to);

		// Wait for the new object to appear; if it does not, the operation had no effect.
		await expect
			.poll(async () => (await this.captureObjects()).length, {
				message: `${tool} creates a new shape`,
			})
			.toBe(before.length + 1);

		const after = await this.captureObjects();
		const created = after.find((obj) => !beforeIds.has(obj.id));
		if (!created?.id) {
			throw new Error(
				`cannot read the data-id of the shape created by ${tool}`,
			);
		}
		return created.id;
	}

	/**
	 * Pick a shape from a category flyout (a plugin-provided record, say), drag to draw it, and
	 * return the new shape's data-id. Use drawShape for top-level tools.
	 */
	async drawShapeFromFlyout(
		categoryId: string,
		presetId: string,
		from: { x: number; y: number },
		to: { x: number; y: number },
	): Promise<string> {
		const before = await this.captureObjects();
		const beforeIds = new Set(before.map((obj) => obj.id));

		await this.page.click(selectors.categoryButton(categoryId));
		const item = this.page.locator(selectors.shapeItem(presetId));
		await expect(item).toBeVisible();
		await item.click();

		// Unlike a tool button a flyout item has no armed cursor of its own, so the canvas's
		// cursor: crosshair is the signal that drawing mode was entered.
		await expect
			.poll(
				() =>
					this.page
						.locator('[data-kind="canvas"]')
						.evaluate((el) => getComputedStyle(el).cursor),
				{ message: `clicking ${presetId} enters drawing mode` },
			)
			.toBe("crosshair");

		await this.drag(from, to);

		// Wait for the new object to appear; if it does not, the operation had no effect.
		await expect
			.poll(async () => (await this.captureObjects()).length, {
				message: `${presetId} creates a new shape`,
			})
			.toBe(before.length + 1);

		const after = await this.captureObjects();
		const created = after.find((obj) => !beforeIds.has(obj.id));
		if (!created?.id) {
			throw new Error(
				`cannot read the data-id of the shape created by ${presetId}`,
			);
		}
		return created.id;
	}

	/**
	 * Add a click-placed shape (Sticky) at the canvas center from its tool button and return the
	 * new data-id. StencilLibraryItemHandler places these outright rather than by diagonal drag,
	 * so they need this instead of drawShape's crosshair-wait-then-drag.
	 */
	async placeShape(tool: ToolTitle): Promise<string> {
		const before = await this.captureObjects();
		const beforeIds = new Set(before.map((obj) => obj.id));

		await this.page.click(selectors.toolButton(tool));

		await expect
			.poll(async () => (await this.captureObjects()).length, {
				message: `${tool} places a new shape`,
			})
			.toBe(before.length + 1);

		const created = (await this.captureObjects()).find(
			(obj) => !beforeIds.has(obj.id),
		);
		if (!created?.id) {
			throw new Error(`cannot read the data-id of the shape placed by ${tool}`);
		}
		return created.id;
	}

	/** Click a shape to select it and wait for the ObjectMenu. */
	async selectAt(point: { x: number; y: number }) {
		const screen = this.toScreen(point);
		await this.page.mouse.click(screen.x, screen.y);
		await expect(this.page.locator(selectors.control).first()).toBeVisible();
	}

	/**
	 * Left-click a content coordinate, asserting nothing about the selection. For targets where
	 * selectAt's assumption of a control handle does not hold, such as connectors.
	 */
	async clickAt(point: { x: number; y: number }) {
		const screen = this.toScreen(point);
		await this.page.mouse.click(screen.x, screen.y);
	}

	/**
	 * Ctrl-click a content coordinate to add to or toggle the selection. A raw page.mouse.click
	 * skips the coordinate conversion, so additive selection must go through this.
	 */
	async ctrlClickAt(point: { x: number; y: number }) {
		const screen = this.toScreen(point);
		await this.page.keyboard.down("Control");
		await this.page.mouse.click(screen.x, screen.y);
		await this.page.keyboard.up("Control");
	}

	/** Click empty space to deselect, committing any text edit in progress. */
	async deselect() {
		const screen = this.toScreen(EMPTY_SPOT);
		await this.page.mouse.click(screen.x, screen.y);
		await expect(this.page.locator(selectors.control)).toHaveCount(0);
	}

	/**
	 * Wait until the text editor is open and the textarea can accept input. Keystrokes sent
	 * before then fall through to the canvas, and a newline among them restarts editing, so the
	 * value ends up confusingly partial rather than empty (#237). Always call this before typing.
	 */
	async waitForTextEditor() {
		await expect(this.page.locator(selectors.textEditor)).toBeVisible();
		await expect(this.textArea()).toBeFocused();
	}

	/** Double-click to open the text editor and type; commit with commitText(). */
	async typeTextAt(point: { x: number; y: number }, text: string) {
		const screen = this.toScreen(point);
		await this.page.mouse.dblclick(screen.x, screen.y);
		await this.waitForTextEditor();
		await this.page.keyboard.type(text);
	}

	/**
	 * Open the text editor and put `text` in place of what the slot already holds.
	 * The editor opens with the caret at the end of the existing value, so
	 * typeTextAt would append to a stencil that drops its shape in pre-filled.
	 */
	async replaceTextAt(point: { x: number; y: number }, text: string) {
		await this.typeTextAt(point, "");
		await this.textArea().fill(text);
	}

	/** Commit a text edit by clicking outside; Escape cancels, so it is not used here. */
	async commitText() {
		const screen = this.toScreen(EMPTY_SPOT);
		await this.page.mouse.click(screen.x, screen.y);
		await expect(this.page.locator(selectors.textEditor)).toHaveCount(0);
	}

	/** Cancel a text edit with Escape. */
	async cancelText() {
		await this.page.keyboard.press("Escape");
		await expect(this.page.locator(selectors.textEditor)).toHaveCount(0);
	}

	/** Locator for the textarea being edited, inside the data-kind wrapper. */
	textArea() {
		return this.page.locator(`${selectors.textEditor} textarea`);
	}

	/** Whether the textarea being edited has focus. */
	async isTextEditorFocused(): Promise<boolean> {
		return this.page.evaluate((sel) => {
			const textarea = document.querySelector(`${sel} textarea`);
			return textarea !== null && document.activeElement === textarea;
		}, selectors.textEditor);
	}

	/**
	 * Vertical alignment of the editor being edited, derived from the flex wrapper's computed
	 * align-items.
	 */
	async textEditorVerticalAlign(): Promise<"top" | "middle" | "bottom" | null> {
		return this.page.evaluate((sel) => {
			const wrapper = document.querySelector(sel);
			if (!wrapper) {
				return null;
			}
			const align = getComputedStyle(wrapper).alignItems;
			if (align === "flex-start") {
				return "top";
			}
			if (align === "flex-end") {
				return "bottom";
			}
			if (align === "center") {
				return "middle";
			}
			return null;
		}, selectors.textEditor);
	}

	/** Scroll position of the textarea being edited. */
	async textEditorScrollTop(): Promise<number> {
		return this.page.evaluate((sel) => {
			const textarea = document.querySelector(`${sel} textarea`);
			return textarea instanceof HTMLTextAreaElement ? textarea.scrollTop : 0;
		}, selectors.textEditor);
	}

	/** Selection range (selectionStart / selectionEnd) of the textarea being edited. */
	async textEditorSelection(): Promise<{ start: number; end: number } | null> {
		return this.page.evaluate((sel) => {
			const textarea = document.querySelector(`${sel} textarea`);
			if (!(textarea instanceof HTMLTextAreaElement)) {
				return null;
			}
			return { start: textarea.selectionStart, end: textarea.selectionEnd };
		}, selectors.textEditor);
	}

	/** Toggle an ObjectMenu dropdown section open. */
	async openObjectMenu(sectionId: string) {
		await this.page.click(selectors.objectMenuToggle(sectionId));
	}

	/**
	 * Open the color picker from the selected shape's ObjectMenu and set a CSS color. Colors
	 * outside the presets can be given as hex or "transparent".
	 */
	async setColor(sectionId: ColorSectionId, cssColor: string) {
		await this.openObjectMenu(sectionId);
		const input = this.page.locator(selectors.cssColorInput);
		await input.fill(cssColor);
		await input.press("Enter");
	}

	/**
	 * Set a color by clicking a preset swatch in the color picker.
	 *
	 * @param sectionId - Color section to open, ignored when `open` is false
	 * @param property - Style property the swatch writes, as it appears in the `set:` data-part
	 * @param value - Swatch value to click, matched exactly against the `set:` data-part
	 * @param open - Open the section first; pass false when it is already open
	 */
	async pickColorSwatch(
		sectionId: ColorSectionId,
		property: string,
		value: string,
		open = true,
	) {
		if (open) {
			await this.openObjectMenu(sectionId);
		}
		await this.page.click(selectors.objectMenuSet(property, value));
	}

	/**
	 * Change an ObjectMenu slider by dragging it horizontally. The section must already be open.
	 * A real pointer drag is used because the slider has to fire drag/dragEnd through the
	 * native-pointer gesture path.
	 *
	 * @param property - Style property the slider writes, as it appears in the `slider:` data-part
	 * @param dx - Screen-pixel distance from the slider's center; positive moves right, raising
	 *   the value
	 */
	async dragSliderBy(property: string, dx: number) {
		const slider = this.page.locator(selectors.objectMenuSlider(property));
		await expect(slider).toBeVisible();
		const box = await slider.boundingBox();
		if (!box) {
			throw new Error(`cannot read the position of slider ${property}`);
		}
		// box is in screen coordinates, and dragScreen keeps them that way.
		const startX = box.x + box.width / 2;
		const y = box.y + box.height / 2;
		await this.dragScreen({ x: startX, y }, { x: startX + dx, y }, 10);
	}

	/**
	 * Click an ObjectMenu slider track without dragging, the way a user jumps the thumb to a
	 * position. The section must already be open.
	 *
	 * @param property - Style property the slider writes, as it appears in the `slider:` data-part
	 * @param ratio - Horizontal position on the track, 0 (left end / lowest value) to 1 (right end)
	 */
	async clickSliderAt(property: string, ratio: number) {
		const slider = this.page.locator(selectors.objectMenuSlider(property));
		await expect(slider).toBeVisible();
		const box = await slider.boundingBox();
		if (!box) {
			throw new Error(`cannot read the position of slider ${property}`);
		}
		await this.page.mouse.click(
			box.x + box.width * ratio,
			box.y + box.height / 2,
		);
	}

	/**
	 * Focus an ObjectMenu slider and nudge it from the keyboard. The section must already be open.
	 * Each press is its own keydown/keyup pair, so presses within the history coalesce window
	 * collapse into a single undo entry, just like a held key.
	 *
	 * @param property - Style property the slider writes, as it appears in the `slider:` data-part
	 * @param key - Key name to press, e.g. "ArrowRight" / "Home" / "PageUp"
	 * @param repeat - Number of presses, defaults to 1
	 */
	async pressSliderKey(property: string, key: string, repeat = 1) {
		const slider = this.page.locator(selectors.objectMenuSlider(property));
		await expect(slider).toBeVisible();
		await slider.focus();
		for (let i = 0; i < repeat; i++) {
			await slider.press(key);
		}
	}

	/**
	 * Type a value into the number input beside an ObjectMenu slider and commit with Enter. The
	 * section must already be open; the input is found by its test-only data-testid hook.
	 */
	async setNumberInput(property: string, value: number) {
		const input = this.page.getByTestId(`menu-number-input:${property}`);
		await input.fill(String(value));
		await input.press("Enter");
	}

	/** Set the vertical alignment of the selected shape. */
	async setVerticalAlign(value: "top" | "middle" | "bottom") {
		await this.openObjectMenu("alignment");
		await this.page.click(selectors.objectMenuSet("verticalAlign", value));
	}

	/**
	 * Toggle one text format (bold / italic / underline / strikethrough) of the selected shape.
	 * The submenu stays open after a press, so it is only opened when its buttons are absent.
	 *
	 * @param property - Style property the button writes, as it appears in the `set:` data-part
	 * @param value - Value the button writes; the buttons carry the value the *next* press lands
	 *   on, so a toggle-off names the cleared value ("normal" / "none")
	 */
	async setTextFormat(
		property: "fontWeight" | "fontStyle" | "textDecoration",
		value: string,
	) {
		const italicButton = this.page.locator(
			'[data-id="object-menu"][data-part^="set:fontStyle:"]',
		);
		if ((await italicButton.count()) === 0) {
			await this.openObjectMenu("text-format");
		}
		await this.page.click(selectors.objectMenuSet(property, value));
	}

	/** Set the dash style of the selected line, connector or shape border. */
	async setStrokeDashType(
		menuSectionId: "line-style" | "border-style",
		dashType: "solid" | "dashed" | "dotted",
	) {
		await this.page.click(selectors.objectMenuToggle(menuSectionId));
		await this.page.click(selectors.objectMenuSet("strokeDashType", dashType));
	}

	/**
	 * Create a connector by dragging from the selected shape's connection anchor to a point, and
	 * return the new connector's data-id. The source shape must already be selected.
	 */
	async createConnector(
		sourceAnchorId: AnchorId,
		dropPoint: { x: number; y: number },
	): Promise<string> {
		const beforeIds = new Set(
			(await this.captureObjects()).map((obj) => obj.id),
		);

		const anchor = this.page.locator(selectors.createAnchor(sourceAnchorId));
		await expect(anchor).toBeVisible();
		const box = await anchor.boundingBox();
		if (!box) {
			throw new Error(`cannot read the position of anchor ${sourceAnchorId}`);
		}
		// box is screen coordinates and dropPoint is content coordinates; align on screen for dragScreen.
		await this.dragScreen(
			{ x: box.x + box.width / 2, y: box.y + box.height / 2 },
			this.toScreen(dropPoint),
			12,
		);

		await expect
			.poll(
				async () =>
					(await this.captureObjects()).filter((obj) => !beforeIds.has(obj.id))
						.length,
			)
			.toBeGreaterThan(0);

		const created = (await this.captureObjects()).find(
			(obj) => !beforeIds.has(obj.id),
		);
		if (!created?.id) {
			throw new Error("cannot read the data-id of the created connector");
		}
		return created.id;
	}

	/** Right-click a point to open the canvas's own context menu. */
	async openContextMenu(point: { x: number; y: number }) {
		const screen = this.toScreen(point);
		await this.page.mouse.click(screen.x, screen.y, { button: "right" });
		await expect(
			this.page.locator(selectors.contextMenuAny).first(),
		).toBeVisible();
	}

	/** Whether the canvas's own context menu is shown. */
	async contextMenuVisible(): Promise<boolean> {
		return (await this.page.locator(selectors.contextMenuAny).count()) > 0;
	}

	/** Click a context-menu command item. */
	async clickContextMenuCommand(commandId: string) {
		await this.page.click(selectors.contextMenuCommand(commandId));
	}

	/** Click a context-menu callback item. */
	async clickContextMenuItem(id: string) {
		await this.page.click(selectors.contextMenuCallback(id));
	}

	/**
	 * Drag a transform handle (the eight resize directions or rotation). The target must already
	 * be selected, and `handle` uses the same identifiers as selectors.transformControl.
	 *
	 * @param options.inspect - Runs with the button still down, like dragInspecting; the release
	 *   happens even if it throws
	 */
	async dragTransformHandle(
		handle:
			| "topLeft"
			| "topCenter"
			| "topRight"
			| "leftCenter"
			| "rightCenter"
			| "bottomLeft"
			| "bottomCenter"
			| "bottomRight"
			| "rotation",
		to: { x: number; y: number },
		{
			shift = false,
			ctrl = false,
			inspect,
		}: {
			shift?: boolean;
			ctrl?: boolean;
			inspect?: () => Promise<void>;
		} = {},
	) {
		const control = this.page.locator(selectors.transformControl(handle));
		await expect(control).toBeVisible();
		const box = await control.boundingBox();
		if (!box) {
			throw new Error(`cannot read the position of transform handle ${handle}`);
		}
		// The handle box is screen coordinates and `to` is content coordinates; align on screen.
		const from = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
		const toScreen = this.toScreen(to);
		if (!shift && !ctrl && !inspect) {
			await this.dragScreen(from, toScreen, 10);
			return;
		}
		// Resizing with Shift held keeps the aspect ratio and with Ctrl held suppresses snapping
		// (the event.mods.shift / event.mods.ctrl paths). Press after mouse.down and hold until
		// the release.
		await this.page.mouse.move(from.x, from.y);
		await this.page.mouse.down();
		if (shift) {
			await this.page.keyboard.down("Shift");
		}
		if (ctrl) {
			await this.page.keyboard.down("Control");
		}
		await this.page.mouse.move(toScreen.x, toScreen.y, { steps: 10 });
		try {
			await inspect?.();
		} finally {
			await this.page.mouse.up();
			if (shift) {
				await this.page.keyboard.up("Shift");
			}
			if (ctrl) {
				await this.page.keyboard.up("Control");
			}
		}
	}

	/** Delete the selection with the Delete key. */
	async deleteSelection() {
		await this.page.keyboard.press("Delete");
	}

	/** Undo (Ctrl+Z). */
	async undo() {
		await this.page.keyboard.press("Control+z");
	}

	/** Redo (Ctrl+Shift+Z). */
	async redo() {
		await this.page.keyboard.press("Control+Shift+z");
	}

	/** Copy the selection (Ctrl+C), which lands in the internal clipboard. */
	async copy() {
		await this.page.keyboard.press("Control+c");
	}

	/** Cut the selection (Ctrl+X): copy plus delete. */
	async cut() {
		await this.page.keyboard.press("Control+x");
	}

	/** Paste from the clipboard (Ctrl+V). */
	async paste() {
		await this.page.keyboard.press("Control+v");
	}

	/** Duplicate the selection (Ctrl+D), bypassing the clipboard. */
	async duplicate() {
		await this.page.keyboard.press("Control+d");
	}

	/** Select all (Ctrl+A). */
	async selectAll() {
		await this.page.keyboard.press("Control+a");
	}

	/** Deselect with Escape; must not be called while editing text. */
	async pressEscape() {
		await this.page.keyboard.press("Escape");
	}

	/** Group the selection (Ctrl+G). */
	async group() {
		await this.page.keyboard.press("Control+g");
	}

	/** Ungroup (Ctrl+Shift+G). */
	async ungroup() {
		await this.page.keyboard.press("Control+Shift+g");
	}

	/**
	 * Nudge the selected shapes with an arrow key.
	 *
	 * @param direction - Arrow key to press; the selection must already exist, as this asserts
	 *   nothing about it
	 * @param options.large - Hold Shift for the large step: 10px instead of 1px
	 */
	async nudge(
		direction: "up" | "down" | "left" | "right",
		{ large = false }: { large?: boolean } = {},
	) {
		const arrowKey = {
			up: "ArrowUp",
			down: "ArrowDown",
			left: "ArrowLeft",
			right: "ArrowRight",
		}[direction];
		await this.page.keyboard.press(large ? `Shift+${arrowKey}` : arrowKey);
	}

	/** Fit everything to the view (Ctrl+0). */
	async zoomToFit() {
		await this.page.keyboard.press("Control+0");
	}

	/** Fit the selection to the view (Ctrl+2). */
	async zoomToSelection() {
		await this.page.keyboard.press("Control+2");
	}

	/** Zoom in from the keyboard (Ctrl+=), anchored at the viewport center. */
	async zoomIn() {
		await this.page.keyboard.press("Control+Equal");
	}

	/** Zoom out from the keyboard (Ctrl+-), anchored at the viewport center. */
	async zoomOut() {
		await this.page.keyboard.press("Control+Minus");
	}

	/** Open the ObjectMenu z-order section and run an arrange command. */
	async arrange(
		commandId: "bringToFront" | "bringForward" | "sendBackward" | "sendToBack",
	) {
		await this.openObjectMenu("stack-order");
		await this.page.click(selectors.objectMenuCommand(commandId));
	}

	/** DOM-order index among shapes, excluding connectors; later elements are in front in SVG. */
	async objectIndex(id: string): Promise<number> {
		return this.page.evaluate(
			({ objectSelector, previewSelector, targetId }) => {
				const objects = [
					...document.querySelectorAll(objectSelector),
					// The drag-drawing ghost carries data-kind=object but is uncommitted, so drop it.
				].filter((el) => !el.closest(previewSelector));
				return objects.findIndex(
					(el) => el.getAttribute("data-id") === targetId,
				);
			},
			{
				objectSelector: selectors.object,
				previewSelector: selectors.drawingPreview,
				targetId: id,
			},
		);
	}

	/**
	 * DOM-order index across shapes and connectors; later elements are in front in SVG. Use this
	 * rather than objectIndex, which covers only [data-kind=object], when checking a connector's
	 * z-order. A connector drawn from several elements reports its first occurrence.
	 */
	async zOrderIndex(id: string): Promise<number> {
		return this.page.evaluate(
			({ objectSelector, connectorSelector, previewSelector, targetId }) =>
				[
					...document.querySelectorAll(
						`${objectSelector}, ${connectorSelector}`,
					),
				]
					// The drag-drawing ghost carries data-kind=object but is uncommitted, so drop it.
					.filter((el) => !el.closest(previewSelector))
					.findIndex((el) => el.getAttribute("data-id") === targetId),
			{
				objectSelector: selectors.object,
				connectorSelector: selectors.connectorPolyline,
				previewSelector: selectors.drawingPreview,
				targetId: id,
			},
		);
	}

	/** Locator for a shape by data-id. */
	objectById(id: string) {
		return this.page.locator(`[data-id="${id}"]`).first();
	}

	/**
	 * A shape's drawn fill or stroke, read from computed style. Colors come from emotion CSS
	 * rather than SVG presentation attributes, so they must be verified through getComputedStyle
	 * (#38 / theme following).
	 *
	 * @returns Browser-normalized `rgb(...)` or `rgba(...)`
	 */
	async computedColor(id: string, prop: "fill" | "stroke"): Promise<string> {
		return this.objectById(id).evaluate(
			(el, p) => getComputedStyle(el).getPropertyValue(p),
			prop,
		);
	}

	/**
	 * Normalize a CSS color string to the browser's computed form, for comparison against
	 * computedColor while tests keep writing hex.
	 */
	async normalizeColor(cssColor: string): Promise<string> {
		return this.page.evaluate((color) => {
			const probe = document.createElement("span");
			probe.style.color = color;
			document.body.appendChild(probe);
			const resolved = getComputedStyle(probe).color;
			probe.remove();
			return resolved;
		}, cssColor);
	}

	/**
	 * Computed style of the TextOverlay drawn over a shape, which renders as
	 * foreignObject > div(wrapper) > div(text).
	 *
	 * For rect and ellipse the shape element and the foreignObject are siblings within a
	 * fragment, while a Sticky holds the foreignObject as a child of its `<g data-id>`. To cover
	 * both, this looks among the data-id element's descendants first and falls back to its
	 * following siblings. font-size / color / font-weight / font-style / text-decoration /
	 * text-align live on the text element and vertical alignment (align-items) on the wrapper,
	 * so both are read.
	 *
	 * @returns null when there is no text, or when editing has replaced the TextOverlay.
	 *   `textDecoration` is the computed `text-decoration-line` ("none" / "underline" /
	 *   "underline line-through"), not the shorthand, which also carries style and color
	 */
	async textStyleOf(id: string): Promise<{
		fontSize: string;
		color: string;
		fontWeight: string;
		fontStyle: string;
		textDecoration: string;
		textAlign: string;
		verticalAlign: string;
	} | null> {
		return this.page.evaluate((targetId) => {
			const shape = document.querySelector(`[data-id="${targetId}"]`);
			if (!shape) {
				return null;
			}
			// Descendants first (under a Sticky's `<g>`), then following siblings (the
			// rect/ellipse fragment).
			let foreignObject: Element | null = shape.querySelector("foreignObject");
			if (!foreignObject) {
				let sibling = shape.nextElementSibling;
				while (sibling && sibling.tagName.toLowerCase() !== "foreignobject") {
					sibling = sibling.nextElementSibling;
				}
				foreignObject = sibling;
			}
			const wrapper = foreignObject?.firstElementChild as HTMLElement | null;
			const textDiv = wrapper?.firstElementChild as HTMLElement | null;
			if (!wrapper || !textDiv) {
				return null;
			}
			const textStyle = getComputedStyle(textDiv);
			return {
				fontSize: textStyle.fontSize,
				color: textStyle.color,
				fontWeight: textStyle.fontWeight,
				fontStyle: textStyle.fontStyle,
				textDecoration: textStyle.textDecorationLine,
				textAlign: textStyle.textAlign,
				verticalAlign: getComputedStyle(wrapper).alignItems,
			};
		}, id);
	}

	/**
	 * Locator for a polyline's drawn element. A polyline is two elements — a transparent hit
	 * target carrying the data-id and a styled visual — so style assertions must target the
	 * visual one.
	 */
	async visualPolylineFor(id: string) {
		const points = await this.objectById(id).getAttribute("points");
		return this.page.locator(`polyline[points="${points}"]:not([data-kind])`);
	}

	/** The canvas pan/zoom state, as the main svg's viewBox. */
	async getViewBox(): Promise<string | null> {
		return this.page.evaluate(() => {
			const svgs = [...document.querySelectorAll("svg")];
			let canvas: SVGSVGElement | null = null;
			let best = 0;
			for (const svg of svgs) {
				const rect = svg.getBoundingClientRect();
				if (rect.width * rect.height > best) {
					best = rect.width * rect.height;
					canvas = svg;
				}
			}
			return canvas?.getAttribute("viewBox") ?? null;
		});
	}
}
