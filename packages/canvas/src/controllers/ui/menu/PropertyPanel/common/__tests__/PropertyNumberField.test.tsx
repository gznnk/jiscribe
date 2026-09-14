// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PropertyNumberField } from "../PropertyNumberField";

// Without this React treats every `act` below as unsupported and warns, the
// flushes being correct all the same.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let container: HTMLDivElement | null = null;
let root: ReturnType<typeof createRoot> | null = null;

const render = (element: React.ReactElement): HTMLInputElement => {
	if (!container) {
		container = document.createElement("div");
		document.body.appendChild(container);
		root = createRoot(container);
	}
	const mounted = root;
	act(() => {
		mounted?.render(element);
	});
	const input = container.querySelector("input");
	if (!input) {
		throw new Error("the field did not render an input");
	}
	return input;
};

/** React listens for `focusout`, the bubbling twin of blur, so that is what a blur is here. */
const blur = (input: HTMLInputElement): void => {
	act(() => {
		input.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
	});
};

/** What React's own change handler needs: the value set through the native setter it tracks. */
const type = (input: HTMLInputElement, text: string): void => {
	const setValue = Object.getOwnPropertyDescriptor(
		HTMLInputElement.prototype,
		"value",
	)?.set;
	act(() => {
		setValue?.call(input, text);
		input.dispatchEvent(new Event("input", { bubbles: true }));
	});
};

/**
 * A press landing somewhere else on the page. jsdom has no PointerEvent, and a
 * MouseEvent carries the `button` the spin buttons read anyway.
 */
const pressOn = (target: EventTarget): void => {
	act(() => {
		target.dispatchEvent(
			new MouseEvent("pointerdown", { bubbles: true, button: 0 }),
		);
	});
};

const spinButton = (direction: "up" | "down"): HTMLButtonElement => {
	const buttons = container?.querySelectorAll("button");
	const button = buttons?.[direction === "up" ? 0 : 1];
	if (!(button instanceof HTMLButtonElement)) {
		throw new Error("the field did not render its spin buttons");
	}
	return button;
};

afterEach(() => {
	act(() => {
		root?.unmount();
	});
	container?.remove();
	container = null;
	root = null;
});

describe("PropertyNumberField", () => {
	it("previews while typing and commits on blur", () => {
		const onUpdate = vi.fn();
		const input = render(
			<PropertyNumberField
				value={100}
				prefix="W"
				ariaLabel="Width"
				testId="property-field:width"
				onUpdate={onUpdate}
			/>,
		);

		type(input, "300");
		expect(onUpdate).toHaveBeenCalledWith(300, false);

		blur(input);
		expect(onUpdate).toHaveBeenLastCalledWith(300, true);
	});

	it("commits the preview on a press outside, which is all a deselect leaves it", () => {
		const onUpdate = vi.fn();
		const input = render(
			<PropertyNumberField
				value={100}
				prefix="W"
				ariaLabel="Width"
				testId="property-field:width"
				onUpdate={onUpdate}
			/>,
		);

		type(input, "300");
		// The canvas keeps the focus where it is, so the row can go away without
		// ever seeing a blur: the press itself is the last chance to record it.
		pressOn(document.body);

		expect(onUpdate).toHaveBeenLastCalledWith(300, true);
	});

	it("commits once, the blur after an outside press adding nothing", () => {
		const onUpdate = vi.fn();
		const input = render(
			<PropertyNumberField
				value={100}
				prefix="W"
				ariaLabel="Width"
				testId="property-field:width"
				onUpdate={onUpdate}
			/>,
		);

		type(input, "300");
		pressOn(document.body);
		blur(input);

		expect(onUpdate.mock.calls.filter(([, commit]) => commit === true)).toEqual(
			[[300, true]],
		);
	});

	it("leaves a press inside the field to the field's own handlers", () => {
		const onUpdate = vi.fn();
		const input = render(
			<PropertyNumberField
				value={100}
				prefix="W"
				ariaLabel="Width"
				testId="property-field:width"
				onUpdate={onUpdate}
			/>,
		);

		type(input, "300");
		pressOn(input);

		expect(onUpdate).toHaveBeenLastCalledWith(300, false);
	});

	it("records nothing after Escape, which gave the edit up", () => {
		const onUpdate = vi.fn();
		const input = render(
			<PropertyNumberField
				value={100}
				prefix="W"
				ariaLabel="Width"
				testId="property-field:width"
				onUpdate={onUpdate}
			/>,
		);

		type(input, "300");
		act(() => {
			input.dispatchEvent(
				new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
			);
		});
		pressOn(document.body);

		expect(input.value).toBe("100");
		expect(onUpdate).not.toHaveBeenCalledWith(expect.anything(), true);
	});

	it("steps from the value it is given while the selection disagrees", () => {
		const onUpdate = vi.fn();
		render(
			<PropertyNumberField
				value={4}
				isMixed
				ariaLabel="Stroke width"
				testId="property-field:strokeWidth"
				onUpdate={onUpdate}
			/>,
		);

		pressOn(spinButton("up"));

		// One object's own width plus the step — not a row constant, which is what
		// `value` has to be for a mixed selection (selectionValueOrFirst).
		expect(onUpdate).toHaveBeenLastCalledWith(5, true, true);
	});
});
