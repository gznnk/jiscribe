// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import {
	rectOf,
	registriesOf,
	stateOf,
} from "../../../style/__tests__/support/styleFixtures";
import { readSelectionStyle } from "../../../style/walk/readSelectionStyle";
import type { SelectionStyleReader } from "../SelectionStyleReaderContext";
import {
	SelectionStyleReaderContext,
	useSelectionStyle,
} from "../SelectionStyleReaderContext";

/**
 * The read API a row of either surface is given when it is handed no controller
 * state. What matters is that it answers what `readSelectionStyle` does for the
 * state the surface provided, and that a row rendered outside both surfaces
 * fails loudly rather than reporting a value of its own.
 */

// Without this React treats every `act` below as unsupported and warns, the
// flushes being correct all the same.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const roots: { unmount: () => void }[] = [];

afterEach(() => {
	for (const root of roots.splice(0)) {
		act(() => {
			root.unmount();
		});
	}
});

/**
 * Renders a row reading one kind, under `reader` when one is given and under no
 * provider otherwise.
 *
 * @param kind - The style property the row reads
 * @param reader - What the surface provides; omitted renders the row bare
 * @returns What the row read, as JSON, or the error the render threw
 */
const renderRowReading = (
	kind: string,
	reader?: SelectionStyleReader,
): { read: string } | { error: unknown } => {
	const Row = () => <>{JSON.stringify(useSelectionStyle(kind))}</>;
	const host = document.createElement("div");
	const root = createRoot(host);
	roots.push(root);
	try {
		act(() => {
			root.render(
				reader === undefined ? (
					<Row />
				) : (
					<SelectionStyleReaderContext.Provider value={reader}>
						<Row />
					</SelectionStyleReaderContext.Provider>
				),
			);
		});
	} catch (error) {
		return { error };
	}
	return { read: host.textContent ?? "" };
};

describe("useSelectionStyle", () => {
	it("reads the provided state through readSelectionStyle", () => {
		const registries = registriesOf();
		const state = stateOf(["a"], { a: rectOf("a", { fill: "#f00" }) });
		expect(
			renderRowReading("fill", (kind) =>
				readSelectionStyle(state, kind, registries),
			),
		).toEqual({
			read: JSON.stringify(readSelectionStyle(state, "fill", registries)),
		});
	});

	it("a property nothing the selection reaches takes → none", () => {
		const registries = registriesOf();
		const state = stateOf([], {});
		expect(
			renderRowReading("fill", (kind) =>
				readSelectionStyle(state, kind, registries),
			),
		).toEqual({ read: JSON.stringify({ kind: "none" }) });
	});

	it("outside both surfaces → throws, rather than reporting a value of its own", () => {
		const result = renderRowReading("fill");
		expect(result).toMatchObject({
			error: expect.objectContaining({
				message: expect.stringContaining("useSelectionStyle"),
			}),
		});
	});
});
