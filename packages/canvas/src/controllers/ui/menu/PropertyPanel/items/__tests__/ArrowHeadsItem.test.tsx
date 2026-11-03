// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { defaultCanvasMessages } from "../../../../../../foundation/i18n/CanvasMessages";
import type { ObjectState } from "../../../../../../states/objects/base/ObjectState";
import type { CanvasControllerState } from "../../../../../CanvasTypes";
import { defaultCanvasRegistries } from "../../../../../registries/createCanvasRegistries";
import { selectionOf } from "../../../../../selection/__tests__/support/selectionOf";
import { readSelectionStyle } from "../../../../../style/walk/readSelectionStyle";
import { SelectionStyleReaderContext } from "../../../SelectionStyleReaderContext";
import { ArrowHeadsItem } from "../ArrowHeadsItem";
import type { BuiltinItemProps } from "../BuiltinItemProps";

// Without this React treats every `act` below as unsupported and warns, the
// flushes being correct all the same.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

/** A polyline as its type declares it, with whatever arrow fields it sets. */
const polyline = (id: string, fields: Record<string, unknown>): ObjectState =>
	({
		id,
		type: "polyline",
		features: {
			type: "polyline",
			geometry: "poly",
			stroke: true,
			arrow: true,
		},
		points: [
			{ x: 0, y: 0 },
			{ x: 100, y: 0 },
		],
		...fields,
	}) as unknown as ObjectState;

const stateOf = (...shapes: ObjectState[]): CanvasControllerState =>
	({
		mode: { kind: "normal" },
		selection: selectionOf(shapes.map((shape) => shape.id)),
		objects: Object.fromEntries(shapes.map((shape) => [shape.id, shape])),
	}) as unknown as CanvasControllerState;

let container: HTMLDivElement | null = null;
let root: ReturnType<typeof createRoot> | null = null;

/** Renders the item for `canvasState`, under the reader the sidebar provides. */
const render = (
	canvasState: CanvasControllerState,
	onStyleIntent: BuiltinItemProps["onStyleIntent"] = vi.fn(),
): HTMLDivElement => {
	container = document.createElement("div");
	document.body.appendChild(container);
	root = createRoot(container);
	const mounted = root;
	act(() => {
		mounted.render(
			<SelectionStyleReaderContext.Provider
				value={(kind) =>
					readSelectionStyle(canvasState, kind, defaultCanvasRegistries)
				}
			>
				<ArrowHeadsItem
					canvasState={canvasState}
					onStyleIntent={onStyleIntent}
					onTransformUpdate={vi.fn()}
				/>
			</SelectionStyleReaderContext.Provider>,
		);
	});
	return container;
};

const arrowScaleInput = (): HTMLInputElement => {
	const input = container?.querySelector(
		'[data-testid="property-field:arrowScale"]',
	);
	if (!(input instanceof HTMLInputElement)) {
		throw new Error("the item did not render the arrowScale field");
	}
	return input;
};

afterEach(() => {
	act(() => {
		root?.unmount();
	});
	container?.remove();
	container = null;
	root = null;
});

describe("ArrowHeadsItem size row", () => {
	it("states the scale in percent under its own label", () => {
		render(stateOf(polyline("a", { endArrow: "OpenArrow", arrowScale: 1.5 })));

		expect(arrowScaleInput().value).toBe("150");
		expect(arrowScaleInput().getAttribute("aria-label")).toBe(
			defaultCanvasMessages.menuArrowScale,
		);
		expect(container?.textContent).toContain(
			defaultCanvasMessages.propertyPanelRowArrowScale,
		);
	});

	it("reads an unset scale as 100%, agreeing with one set to 1", () => {
		render(
			stateOf(
				polyline("a", { endArrow: "OpenArrow" }),
				polyline("b", { endArrow: "OpenArrow", arrowScale: 1 }),
			),
		);

		expect(arrowScaleInput().value).toBe("100");
	});

	it("is mixed while the selection's scales disagree", () => {
		render(
			stateOf(
				polyline("a", { arrowScale: 1.5 }),
				polyline("b", { arrowScale: 2 }),
			),
		);

		expect(arrowScaleInput().value).toBe("");
	});

	it("stays while both ends are None", () => {
		render(stateOf(polyline("a", { startArrow: "None", endArrow: "None" })));

		expect(arrowScaleInput().disabled).toBe(false);
	});

	it("writes the typed percent as an arrowScale intent", () => {
		const onStyleIntent = vi.fn();
		render(stateOf(polyline("a", { endArrow: "OpenArrow" })), onStyleIntent);
		const input = arrowScaleInput();

		act(() => {
			input.focus();
			const setValue = Object.getOwnPropertyDescriptor(
				HTMLInputElement.prototype,
				"value",
			)?.set;
			setValue?.call(input, "250");
			input.dispatchEvent(new Event("input", { bubbles: true }));
		});
		act(() => {
			input.dispatchEvent(
				new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
			);
		});

		expect(onStyleIntent).toHaveBeenLastCalledWith(
			{ kind: "arrowScale", scale: 2.5 },
			true,
			undefined,
		);
	});
});
