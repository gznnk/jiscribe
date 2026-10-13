// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ObjectRenderBoundary } from "../ObjectRenderBoundary";

// Without this React treats every `act` below as unsupported and warns, the
// flushes being correct all the same.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

type ProbeState = { id: string; type: string; text: string };

/** Stands in for a shape's component: draws its text, or throws on "boom". */
const Probe = ({ state }: { state: ProbeState }) => {
	if (state.text === "boom") {
		throw new Error(
			'The "textSlot" part kind of type "table" answers no region for text slot "r9c9" (it answers r0c0, r0c1)',
		);
	}
	return <g data-drawn={state.id} />;
};

const Scene = ({ states }: { states: ProbeState[] }) => (
	<svg>
		{states.map((state) => (
			<ObjectRenderBoundary
				key={state.id}
				objectId={state.id}
				objectType={state.type}
				objectState={state}
			>
				<Probe state={state} />
			</ObjectRenderBoundary>
		))}
	</svg>
);

const drawnIds = (container: HTMLElement): string[] =>
	[...container.querySelectorAll("[data-drawn]")].map(
		(element) => element.getAttribute("data-drawn") ?? "",
	);

let container: HTMLElement;
let root: Root;
let warn: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
	container = document.createElement("div");
	document.body.appendChild(container);
	root = createRoot(container);
	warn = vi.spyOn(console, "warn").mockImplementation(() => {});
	// React reports every caught error on its own; that noise is not under test.
	vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
	act(() => root.unmount());
	container.remove();
	vi.restoreAllMocks();
});

const render = (states: ProbeState[]): void => {
	act(() => root.render(<Scene states={states} />));
};

describe("ObjectRenderBoundary", () => {
	it("draws nothing for the object that threw and leaves the others drawn", () => {
		render([
			{ id: "a", type: "rect", text: "fine" },
			{ id: "t-1", type: "table", text: "boom" },
			{ id: "b", type: "rect", text: "fine" },
		]);

		expect(drawnIds(container)).toEqual(["a", "b"]);
	});

	it("names the object and the reason in one warning", () => {
		render([{ id: "t-1", type: "table", text: "boom" }]);

		expect(warn).toHaveBeenCalledTimes(1);
		expect(warn).toHaveBeenCalledWith(
			'[Canvas] table t-1 could not be drawn: The "textSlot" part kind of type "table" answers no region for text slot "r9c9" (it answers r0c0, r0c1)',
		);
	});

	it("draws the object again once its state is replaced", () => {
		render([{ id: "t-1", type: "table", text: "boom" }]);
		expect(drawnIds(container)).toEqual([]);

		render([{ id: "t-1", type: "table", text: "fixed" }]);

		expect(drawnIds(container)).toEqual(["t-1"]);
	});

	it("stays empty while the same state is rendered again", () => {
		const broken = { id: "t-1", type: "table", text: "boom" };
		render([broken]);
		render([broken]);

		expect(drawnIds(container)).toEqual([]);
		expect(warn).toHaveBeenCalledTimes(1);
	});
});
