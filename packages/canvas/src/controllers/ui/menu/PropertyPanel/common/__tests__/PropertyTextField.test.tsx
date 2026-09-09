// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PropertyTextField } from "../PropertyTextField";

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

afterEach(() => {
	act(() => {
		root?.unmount();
	});
	container?.remove();
	container = null;
	root = null;
});

describe("PropertyTextField", () => {
	it("previews while typing and commits on blur", () => {
		const onUpdate = vi.fn();
		const input = render(
			<PropertyTextField
				value=""
				ariaLabel="Name"
				testId="property-field:metaName"
				onUpdate={onUpdate}
			/>,
		);

		type(input, "Server");
		expect(onUpdate).toHaveBeenCalledWith("Server", false);

		blur(input);
		expect(onUpdate).toHaveBeenLastCalledWith("Server", true);
	});

	it("commits nothing on a blur with nothing typed", () => {
		const onUpdate = vi.fn();
		const input = render(
			<PropertyTextField
				value="Server"
				ariaLabel="Name"
				testId="property-field:metaName"
				onUpdate={onUpdate}
			/>,
		);

		blur(input);

		expect(onUpdate).not.toHaveBeenCalled();
	});

	it("puts the given text back on Escape, previewing it rather than recording it", () => {
		const onUpdate = vi.fn();
		const input = render(
			<PropertyTextField
				value="Server"
				ariaLabel="Name"
				testId="property-field:metaName"
				onUpdate={onUpdate}
			/>,
		);

		type(input, "Serverless");
		act(() => {
			input.dispatchEvent(
				new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
			);
		});

		expect(input.value).toBe("Server");
		expect(onUpdate).toHaveBeenLastCalledWith("Server", false);
		expect(onUpdate).not.toHaveBeenCalledWith(expect.anything(), true);
	});

	it("follows the value it is given when it changes from outside", () => {
		const onUpdate = vi.fn();
		const input = render(
			<PropertyTextField
				value="Server"
				ariaLabel="Name"
				testId="property-field:metaName"
				onUpdate={onUpdate}
			/>,
		);
		expect(input.value).toBe("Server");

		render(
			<PropertyTextField
				value="Gateway"
				ariaLabel="Name"
				testId="property-field:metaName"
				onUpdate={onUpdate}
			/>,
		);

		expect(input.value).toBe("Gateway");
	});
});
