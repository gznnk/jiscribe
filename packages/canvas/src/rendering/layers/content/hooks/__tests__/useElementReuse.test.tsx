// @vitest-environment jsdom

import { act, StrictMode, useLayoutEffect } from "react";
import type { ReactElement } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { useElementReuse } from "../useElementReuse";

// Without this React treats every `act` below as unsupported and warns, the
// flushes being correct all the same.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

/** The elements the last committed render handed out, per id. */
let drawnElements = new Map<string, ReactElement>();

/** Draws one `<g>` per entry, built from its label. */
const List = ({
	entries,
}: {
	entries: readonly (readonly [string, string])[];
}) => {
	const reuseElement = useElementReuse();
	const elements = entries.map(([id, label]) =>
		reuseElement(id, [label], () => <g key={id} data-label={label} />),
	);
	useLayoutEffect(() => {
		drawnElements = new Map(
			entries.map(([id], index) => [id, elements[index]]),
		);
	});
	return <svg>{elements}</svg>;
};

let container: HTMLElement;
let root: Root;

beforeEach(() => {
	container = document.createElement("div");
	document.body.appendChild(container);
	root = createRoot(container);
});

afterEach(() => {
	act(() => root.unmount());
	container.remove();
});

const draw = (entries: readonly (readonly [string, string])[]) => {
	act(() =>
		root.render(
			<StrictMode>
				<List entries={entries} />
			</StrictMode>,
		),
	);
	return new Map(drawnElements);
};

describe("useElementReuse", () => {
	it("hands back the same element while its inputs hold, and a new one once they change", () => {
		const first = draw([
			["a", "one"],
			["b", "two"],
		]);
		const second = draw([
			["a", "one"],
			["b", "three"],
		]);

		expect(second.get("a")).toBe(first.get("a"));
		expect(second.get("b")).not.toBe(first.get("b"));
		expect(container.querySelector('[data-label="three"]')).not.toBeNull();
	});

	it("drops an id a render leaves out, so it is built again when it returns", () => {
		const first = draw([
			["a", "one"],
			["b", "two"],
		]);
		draw([["a", "one"]]);
		const third = draw([
			["a", "one"],
			["b", "two"],
		]);

		expect(third.get("a")).toBe(first.get("a"));
		expect(third.get("b")).not.toBe(first.get("b"));
	});
});
