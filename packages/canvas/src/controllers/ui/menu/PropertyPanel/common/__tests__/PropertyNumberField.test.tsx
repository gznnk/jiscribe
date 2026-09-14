// @vitest-environment jsdom

import { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { PropertyNumberUpdater } from "../PropertyNumberField";
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

/**
 * The field under the row that owns the value, which is what a preview comes
 * back through: `state` is what the row makes of the previewed number — the
 * number itself for a position, the whole percent an opacity row rounds it to.
 */
const LiveField: React.FC<{
	initialValue: number;
	state?: (value: number) => number;
	onUpdate?: PropertyNumberUpdater;
}> = ({ initialValue, state = (value) => value, onUpdate }) => {
	const [value, setValue] = useState(initialValue);
	return (
		<PropertyNumberField
			value={value}
			prefix="X"
			ariaLabel="X"
			testId="property-field:x"
			onUpdate={(next, commit, coalesceHistory) => {
				setValue(state(next));
				onUpdate?.(next, commit, coalesceHistory);
			}}
		/>
	);
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

	it("keeps the digits typed past the one decimal it displays", () => {
		const input = render(<LiveField initialValue={0} />);

		// One keystroke at a time: the preview of 12.75 comes back displayed as
		// 12.8, which is not what is being typed into.
		for (const typed of ["1", "12", "12.", "12.7", "12.75"]) {
			type(input, typed);
		}

		expect(input.value).toBe("12.75");
	});

	it("keeps the digits typed into a row that rounds what it is given", () => {
		// What an opacity row states: whole percent over the document's 0..1.
		const input = render(<LiveField initialValue={50} state={Math.round} />);

		for (const typed of ["5", "50", "50.", "50.5"]) {
			type(input, typed);
		}

		expect(input.value).toBe("50.5");
	});

	it("states the value the row settled on once the edit is committed", () => {
		const input = render(<LiveField initialValue={50} state={Math.round} />);

		type(input, "50.5");
		blur(input);

		expect(input.value).toBe("51");
	});

	it("takes over what is typed when the value changes from outside", () => {
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

		type(input, "12.75");
		// A handle drag, an undo or a host sync landing while the edit is open.
		render(
			<PropertyNumberField
				value={42}
				prefix="W"
				ariaLabel="Width"
				testId="property-field:width"
				onUpdate={onUpdate}
			/>,
		);

		expect(input.value).toBe("42");
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
