// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ObjectMenuSlider } from "../ObjectMenuSlider";

// Without this React treats every `act` below as unsupported and warns, the
// flushes being correct all the same.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let container: HTMLDivElement | null = null;
let root: ReturnType<typeof createRoot> | null = null;

const render = (element: React.ReactElement): void => {
	if (!container) {
		container = document.createElement("div");
		document.body.appendChild(container);
		root = createRoot(container);
	}
	const mounted = root;
	act(() => {
		mounted?.render(element);
	});
};

const numberInput = (): HTMLInputElement => {
	const input = container?.querySelector('input[type="number"]');
	if (!(input instanceof HTMLInputElement)) {
		throw new Error("the slider did not render its number input");
	}
	return input;
};

const rangeInput = (): HTMLInputElement => {
	const input = container?.querySelector('input[type="range"]');
	if (!(input instanceof HTMLInputElement)) {
		throw new Error("the slider did not render its track");
	}
	return input;
};

/** React listens for `focusout`, the bubbling twin of blur, so that is what a blur is here. */
const blur = (input: HTMLInputElement): void => {
	act(() => {
		input.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
	});
};

const pressEnter = (input: HTMLInputElement): void => {
	act(() => {
		input.dispatchEvent(
			new KeyboardEvent("keydown", { bubbles: true, key: "Enter" }),
		);
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

afterEach(() => {
	act(() => {
		root?.unmount();
	});
	container?.remove();
	container = null;
	root = null;
});

describe("ObjectMenuSlider", () => {
	it("states the value the selection agrees on", () => {
		render(<ObjectMenuSlider value={4} property="strokeWidth" max={20} />);

		expect(numberInput().value).toBe("4");
		expect(numberInput().placeholder).toBe("");
		expect(rangeInput().value).toBe("4");
	});

	it("is drawn empty behind the dash while the selection disagrees, the thumb at the value given", () => {
		render(
			<ObjectMenuSlider value={4} isMixed property="strokeWidth" max={20} />,
		);

		expect(numberInput().value).toBe("");
		expect(numberInput().placeholder).toBe("—");
		expect(rangeInput().value).toBe("4");
	});

	it("writes nothing when a mixed field is left empty", () => {
		const onPropertyUpdate = vi.fn();
		render(
			<ObjectMenuSlider
				value={4}
				isMixed
				property="strokeWidth"
				max={20}
				onPropertyUpdate={onPropertyUpdate}
			/>,
		);

		blur(numberInput());
		pressEnter(numberInput());

		expect(onPropertyUpdate).not.toHaveBeenCalled();
		expect(numberInput().value).toBe("");
	});

	it("writes a number typed into a mixed field to the whole selection", () => {
		const onPropertyUpdate = vi.fn();
		render(
			<ObjectMenuSlider
				value={4}
				isMixed
				property="strokeWidth"
				max={20}
				onPropertyUpdate={onPropertyUpdate}
			/>,
		);

		type(numberInput(), "7");
		blur(numberInput());

		expect(onPropertyUpdate).toHaveBeenNthCalledWith(
			1,
			"strokeWidth",
			"7",
			false,
		);
		expect(onPropertyUpdate).toHaveBeenLastCalledWith("strokeWidth", "7", true);
	});

	it("puts the value back when the selection comes to agree", () => {
		render(
			<ObjectMenuSlider value={4} isMixed property="strokeWidth" max={20} />,
		);

		render(<ObjectMenuSlider value={9} property="strokeWidth" max={20} />);

		expect(numberInput().value).toBe("9");
		expect(rangeInput().value).toBe("9");
	});
});
