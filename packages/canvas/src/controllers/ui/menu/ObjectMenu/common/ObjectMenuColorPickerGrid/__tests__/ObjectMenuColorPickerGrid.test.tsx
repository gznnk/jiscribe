// @vitest-environment jsdom

import { AUTO_COLOR } from "@jiscribe/doc/model/objects/utils/autoColor";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { isGestureOptedOut } from "../../../../../../gestures/recognizer/targeting";
import { ObjectMenuColorPickerGrid } from "../ObjectMenuColorPickerGrid";

// Without this React treats every `act` below as unsupported and warns, the
// flushes being correct all the same.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const GREEN = "#22c55e";
const BLUE = "#3b82f6";

let container: HTMLDivElement | null = null;
let root: ReturnType<typeof createRoot> | null = null;

const render = (element: React.ReactElement): HTMLDivElement => {
	if (!container) {
		container = document.createElement("div");
		document.body.appendChild(container);
		root = createRoot(container);
	}
	const mounted = root;
	act(() => {
		mounted?.render(element);
	});
	return container;
};

/** The swatch (or the Auto button) writing `value`, found the way e2e finds it. */
const pick = (value: string): HTMLElement => {
	const element = container?.querySelector(`[data-part="set:fill:${value}"]`);
	if (!(element instanceof HTMLElement)) {
		throw new Error(`the picker did not render a swatch for ${value}`);
	}
	return element;
};

const click = (target: EventTarget): void => {
	act(() => {
		target.dispatchEvent(new MouseEvent("click", { bubbles: true }));
	});
};

afterEach(() => {
	act(() => {
		root?.unmount();
	});
	container?.remove();
	container = null;
	root = null;
});

describe("ObjectMenuColorPickerGrid", () => {
	describe("writing through the callback (the document's own color)", () => {
		it("writes nothing when the color picked is the one already set", () => {
			const onPropertyUpdate = vi.fn();
			render(
				<ObjectMenuColorPickerGrid
					currentColor={GREEN}
					property="fill"
					writesThroughCallback
					currentColorIsShared
					onPropertyUpdate={onPropertyUpdate}
				/>,
			);

			// A commit is recorded whatever it carries, so the entry this would push
			// changes nothing and drops the redo stack with it.
			click(pick(GREEN));

			expect(onPropertyUpdate).not.toHaveBeenCalled();
		});

		it("commits once when the color picked is another one", () => {
			const onPropertyUpdate = vi.fn();
			render(
				<ObjectMenuColorPickerGrid
					currentColor={GREEN}
					property="fill"
					writesThroughCallback
					currentColorIsShared
					onPropertyUpdate={onPropertyUpdate}
				/>,
			);

			click(pick(BLUE));

			expect(onPropertyUpdate.mock.calls).toEqual([["fill", BLUE, true]]);
		});

		it("writes nothing when Auto is picked while the color is already unset", () => {
			const onPropertyUpdate = vi.fn();
			render(
				<ObjectMenuColorPickerGrid
					currentColor={AUTO_COLOR}
					property="fill"
					writesThroughCallback
					currentColorIsShared
					onPropertyUpdate={onPropertyUpdate}
				/>,
			);

			click(pick(AUTO_COLOR));

			expect(onPropertyUpdate).not.toHaveBeenCalled();
		});

		it("commits once when Auto unsets a color that is set", () => {
			const onPropertyUpdate = vi.fn();
			render(
				<ObjectMenuColorPickerGrid
					currentColor={GREEN}
					property="fill"
					writesThroughCallback
					currentColorIsShared
					onPropertyUpdate={onPropertyUpdate}
				/>,
			);

			click(pick(AUTO_COLOR));

			expect(onPropertyUpdate.mock.calls).toEqual([["fill", AUTO_COLOR, true]]);
		});
	});

	describe("writing where the color shown stands for one of several targets", () => {
		it("commits the color already shown, which is how a mixed selection is unified", () => {
			const onPropertyUpdate = vi.fn();
			render(
				<ObjectMenuColorPickerGrid
					currentColor={GREEN}
					property="fill"
					writesThroughCallback
					onPropertyUpdate={onPropertyUpdate}
				/>,
			);

			// Without currentColorIsShared the shown color may be one target's
			// alone, so a pick of it is no proof that the rest carry it.
			click(pick(GREEN));

			expect(onPropertyUpdate.mock.calls).toEqual([["fill", GREEN, true]]);
		});

		it("originates a gesture from the swatch shown as picked", () => {
			render(
				<ObjectMenuColorPickerGrid
					currentColor={GREEN}
					property="fill"
					onPropertyUpdate={vi.fn()}
				/>,
			);

			expect(isGestureOptedOut(pick(GREEN))).toBe(false);
		});
	});

	describe("writing through the gesture route (the selection's style)", () => {
		it("originates no gesture from the swatch already picked, and one from the rest", () => {
			render(
				<ObjectMenuColorPickerGrid
					currentColor={GREEN}
					property="fill"
					currentColorIsShared
					onPropertyUpdate={vi.fn()}
				/>,
			);

			// The `set:` handler applies and raises commitVersion for whatever value
			// reaches it, so the press that would state the color in place is stopped
			// before it becomes a gesture at all.
			expect(isGestureOptedOut(pick(GREEN))).toBe(true);
			expect(isGestureOptedOut(pick(BLUE))).toBe(false);
		});

		it("originates no gesture from Auto while the color is already unset", () => {
			render(
				<ObjectMenuColorPickerGrid
					currentColor={AUTO_COLOR}
					property="fill"
					currentColorIsShared
					onPropertyUpdate={vi.fn()}
				/>,
			);

			expect(isGestureOptedOut(pick(AUTO_COLOR))).toBe(true);
			expect(isGestureOptedOut(pick(GREEN))).toBe(false);
		});
	});
});
