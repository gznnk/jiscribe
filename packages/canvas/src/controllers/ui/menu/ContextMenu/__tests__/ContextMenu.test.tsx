// @vitest-environment jsdom

import type { CanvasDoc } from "@jiscribe/doc/model/canvas/CanvasDoc";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import type { CanvasPlugin } from "../../../../../plugin/CanvasPlugin";
import type { ObjectState } from "../../../../../states/objects/base/ObjectState";
import type {
	CanvasControllerState,
	PressTarget,
} from "../../../../CanvasTypes";
import { createInitialControllerState } from "../../../../reducer/createInitialControllerState";
import type { CanvasRegistries } from "../../../../registries/CanvasRegistries";
import { CanvasRegistriesContext } from "../../../../registries/CanvasRegistriesContext";
import { createCanvasRegistries } from "../../../../registries/createCanvasRegistries";
import { ContextMenu } from "../ContextMenu";

// Without this React treats every `act` below as unsupported and warns, the
// flushes being correct all the same.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

/**
 * A type contributing two rows, one of which names a command nothing registers:
 * the pair a plugin can produce by shipping a stale id, and the case the menu
 * has to draw no dead row for.
 */
const gridPlugin: CanvasPlugin = {
	id: "grid-plugin",
	objects: {
		grid: {
			features: { type: "grid", geometry: "rect" },
			validateDoc: () => [],
			mapper: {
				toDoc: (state) => ({ id: state.id, type: "grid" }),
				toState: (doc) => ({ id: doc.id, type: "grid" }),
			},
			stateValidator: () => true,
			component: () => null,
			behavior: {
				moveByDelta: (state) => state,
				transformByGroup: (state) => state,
				rotateByGroup: (state) => state,
			},
			contextMenu: {
				placement: "after",
				items: [
					{ type: "separator" },
					{ type: "command", commandId: "insertRow" },
					{ type: "command", commandId: "unregisteredRowCommand" },
				],
			},
		},
	},
	commands: [
		{
			id: "insertRow",
			label: "Insert row",
			canExecute: () => true,
			execute: (state) => state,
		},
	],
};

const registries: CanvasRegistries = createCanvasRegistries({
	plugins: [gridPlugin],
});

const emptyDoc: CanvasDoc = { version: 1, root: [] } as unknown as CanvasDoc;

/** The canvas holding one grid and one rect, with the menu opened over what `target` names. */
const stateOf = (target: PressTarget | null): CanvasControllerState => {
	const base = createInitialControllerState(emptyDoc, registries);
	return {
		...base,
		objects: {
			...base.objects,
			g1: { id: "g1", type: "grid" } as unknown as ObjectState,
			r1: { id: "r1", type: "rect" } as unknown as ObjectState,
		},
		rootIds: [...base.rootIds, "g1", "r1"],
		contextMenuPosition: { clientX: 10, clientY: 20, target },
	};
};

let container: HTMLDivElement | null = null;
let root: ReturnType<typeof createRoot> | null = null;

const render = (state: CanvasControllerState): HTMLDivElement => {
	if (!container) {
		container = document.createElement("div");
		document.body.appendChild(container);
		root = createRoot(container);
	}
	const mounted = root;
	act(() => {
		mounted?.render(
			<CanvasRegistriesContext.Provider value={registries}>
				<ContextMenu
					position={state.contextMenuPosition}
					canvasState={state}
					callbacks={{}}
				/>
			</CanvasRegistriesContext.Provider>,
		);
	});
	return container;
};

/** The command each row dispatches, in the order the rows are drawn. */
const rowCommandIds = (): string[] =>
	Array.from(container?.querySelectorAll("[data-part]") ?? []).map(
		(element) =>
			element.getAttribute("data-part")?.replace("command:", "") ?? "",
	);

afterEach(() => {
	act(() => {
		root?.unmount();
	});
	container?.remove();
	container = null;
	root = null;
});

describe("ContextMenu", () => {
	it("draws the built-in rows alone over the background", () => {
		render(stateOf(null));

		expect(rowCommandIds()).not.toContain("insertRow");
		expect(rowCommandIds()).toContain("copy");
	});

	it("draws the built-in rows alone over an object of a type contributing nothing", () => {
		render(stateOf({ kind: "object", id: "r1" }));

		expect(rowCommandIds()).not.toContain("insertRow");
	});

	it("adds the pressed type's rows after the built-in ones", () => {
		render(stateOf({ kind: "object", id: "g1" }));

		const ids = rowCommandIds();
		expect(ids).toContain("insertRow");
		expect(ids.indexOf("insertRow")).toBeGreaterThan(ids.indexOf("export"));
	});

	it("adds them for a press on a control drawn over one of its objects", () => {
		render(stateOf({ kind: "control", id: "g1", part: "anchor:rightCenter" }));

		expect(rowCommandIds()).toContain("insertRow");
	});

	// A dead row would look pressable and do nothing; an unresolvable id draws
	// none at all, the same way a command switched off by CanvasConfig does.
	it("draws no row for a contributed item naming an unregistered command", () => {
		render(stateOf({ kind: "object", id: "g1" }));

		expect(rowCommandIds()).not.toContain("unregisteredRowCommand");
		expect(
			container?.querySelectorAll(
				'[data-part="command:unregisteredRowCommand"]',
			),
		).toHaveLength(0);
	});
});
