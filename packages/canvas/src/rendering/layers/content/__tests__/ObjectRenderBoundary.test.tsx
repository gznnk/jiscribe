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

/** How many times Probe has drawn, per object id. */
const probeRenders = new Map<string, number>();

/** Stands in for a shape's component: draws its text, or throws on "boom". */
const Probe = ({
	id,
	text,
	isEditing,
	editingTextSlotId,
}: ProbeState & {
	isEditing: boolean;
	editingTextSlotId: string | undefined;
}) => {
	probeRenders.set(id, (probeRenders.get(id) ?? 0) + 1);
	if (text === "boom") {
		throw new Error(
			'The "textSlot" part kind of type "table" answers no region for text slot "r9c9" (it answers r0c0, r0c1)',
		);
	}
	return (
		<g
			data-drawn={id}
			data-editing={String(isEditing)}
			data-slot={editingTextSlotId ?? ""}
		/>
	);
};

type SceneProps = {
	states: ProbeState[];
	editingId?: string;
	editingTextSlotId?: string;
};

const Scene = ({ states, editingId, editingTextSlotId }: SceneProps) => (
	<svg>
		{states.map((state) => (
			<ObjectRenderBoundary
				key={state.id}
				objectId={state.id}
				objectType={state.type}
				objectState={state}
				component={Probe}
				isEditing={state.id === editingId}
				editingTextSlotId={
					state.id === editingId ? editingTextSlotId : undefined
				}
			/>
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
	probeRenders.clear();
	warn = vi.spyOn(console, "warn").mockImplementation(() => {});
	// React reports every caught error on its own; that noise is not under test.
	vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
	act(() => root.unmount());
	container.remove();
	vi.restoreAllMocks();
});

const render = (
	states: ProbeState[],
	editing: Partial<SceneProps> = {},
): void => {
	act(() => root.render(<Scene states={states} {...editing} />));
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

	it("skips an object whose state and editing props are unchanged", () => {
		const a = { id: "a", type: "rect", text: "fine" };
		render([a, { id: "b", type: "rect", text: "fine" }]);
		render([a, { id: "b", type: "rect", text: "moved" }]);

		expect(probeRenders.get("a")).toBe(1);
		expect(probeRenders.get("b")).toBe(2);
	});

	it("draws an object again when the editor opens on it or moves to another slot", () => {
		const a = { id: "a", type: "rect", text: "fine" };
		render([a]);
		render([a], { editingId: "a", editingTextSlotId: "r0c0" });
		render([a], { editingId: "a", editingTextSlotId: "r0c1" });

		expect(probeRenders.get("a")).toBe(3);
		const drawn = container.querySelector('[data-drawn="a"]');
		expect(drawn?.getAttribute("data-editing")).toBe("true");
		expect(drawn?.getAttribute("data-slot")).toBe("r0c1");
	});
});
