// @vitest-environment jsdom

import type { ConnectorLabel } from "@jiscribe/doc/model/objects/connector/ConnectorDoc";
import { act } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import type { ConnectorState } from "../../../../states/objects/connector/ConnectorState";
import { createObjectComponentRegistry } from "../../../objects/registry/ObjectComponentRegistry";
import { ObjectComponentRegistryContext } from "../../../objects/registry/ObjectComponentRegistryContext";
import { ObjectsRenderer } from "../ObjectsRenderer";

/**
 * Which connector the label draft reaches, and that handing it over leaves the
 * other connectors' elements alone. ConnectorRenderer is replaced by a probe
 * recording what each connector was drawn with.
 */

// Without this React treats every `act` below as unsupported and warns, the
// flushes being correct all the same.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

/** Every render of a connector, in order, with the label draft it was handed. */
const connectorRenders = vi.hoisted(
	() => [] as { id: string; labelDraft: ConnectorLabel | undefined }[],
);

vi.mock("../ConnectorRenderer", () => ({
	ConnectorRenderer: ({
		connectorState,
		labelDraft,
	}: {
		connectorState: ConnectorState;
		labelDraft?: ConnectorLabel;
	}) => {
		connectorRenders.push({ id: connectorState.id, labelDraft });
		return null;
	},
}));

const makeRect = (id: string, cx: number): ObjectState =>
	({ id, type: "rect", cx, cy: 0, width: 20, height: 20 }) as ObjectState;

const makeConnector = (id: string): ObjectState =>
	({
		id,
		type: "connector",
		source: { owner: { id: "r1" }, anchor: { kind: "center" } },
		target: { owner: { id: "r2" }, anchor: { kind: "center" } },
		routing: "straight",
		points: [],
	}) as unknown as ObjectState;

const OBJECTS = {
	r1: makeRect("r1", 0),
	r2: makeRect("r2", 200),
	c1: makeConnector("c1"),
	c2: makeConnector("c2"),
};

const registry = createObjectComponentRegistry();
registry.register("rect", () => null);

let root: Root;

beforeEach(() => {
	root = createRoot(document.createElement("div"));
	connectorRenders.length = 0;
});

afterEach(() => {
	act(() => root.unmount());
});

const draw = (
	textEditObjectId?: string,
	connectorLabelDraft?: ConnectorLabel,
): void => {
	act(() =>
		root.render(
			<ObjectComponentRegistryContext value={registry}>
				<svg>
					<ObjectsRenderer
						objects={OBJECTS}
						rootIds={Object.keys(OBJECTS)}
						textEditObjectId={textEditObjectId}
						connectorLabelDraft={connectorLabelDraft}
					/>
				</svg>
			</ObjectComponentRegistryContext>,
		),
	);
};

/** The renders since `from`, as `id: draft text` (`-` for no draft). */
const rendersSince = (from: number): string[] =>
	connectorRenders
		.slice(from)
		.map(({ id, labelDraft }) => `${id}: ${labelDraft?.text ?? "-"}`);

describe("ObjectsRenderer - connector label draft", () => {
	it("hands the draft to the edited connector alone, leaving the others undrawn", () => {
		draw();
		expect(rendersSince(0)).toEqual(["c1: -", "c2: -"]);

		const opened = connectorRenders.length;
		draw("c1", { text: "" });
		expect(rendersSince(opened)).toEqual(["c1: "]);

		const typed = connectorRenders.length;
		draw("c1", { text: "a" });
		expect(rendersSince(typed)).toEqual(["c1: a"]);

		const closed = connectorRenders.length;
		draw();
		expect(rendersSince(closed)).toEqual(["c1: -"]);
	});
});
