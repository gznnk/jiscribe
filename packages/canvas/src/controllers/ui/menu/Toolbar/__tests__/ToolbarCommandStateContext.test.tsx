// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";

import type { ResolvedCommandState } from "../../../../hooks/useCommandState";
import {
	ToolbarCommandStateContext,
	useToolbarCommandState,
} from "../ToolbarCommandStateContext";

/**
 * Mounts a component reading the hook, with the provider only when a resolver
 * is given. A render that throws throws out of here, so the mount is torn down
 * in a `finally`.
 */
const renderProbe = (
	resolveCommand?: (commandId: string) => ResolvedCommandState | null,
): (ResolvedCommandState | null)[] => {
	const seen: (ResolvedCommandState | null)[] = [];
	const Probe = () => {
		seen.push(useToolbarCommandState()("undo"));
		return null;
	};
	const container = document.createElement("div");
	const root = createRoot(container);
	// React reports a failed render through console.error before rethrowing it.
	const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
	try {
		act(() =>
			root.render(
				resolveCommand ? (
					<ToolbarCommandStateContext value={resolveCommand}>
						<Probe />
					</ToolbarCommandStateContext>
				) : (
					<Probe />
				),
			),
		);
	} finally {
		consoleError.mockRestore();
		act(() => root.unmount());
	}
	return seen;
};

describe("useToolbarCommandState", () => {
	/**
	 * A default resolver would answer without the canvas's state, and a button
	 * drawn with the wrong enabled look fails silently. Better to not render.
	 */
	it("throws when no provider stands above it", () => {
		expect(() => renderProbe()).toThrow(/ToolbarCommandStateContext/);
	});

	it("hands the provided resolver through untouched", () => {
		const resolved: ResolvedCommandState | null = null;
		const resolveCommand = vi.fn(() => resolved);

		const seen = renderProbe(resolveCommand);

		expect(resolveCommand).toHaveBeenCalledWith("undo");
		expect(seen).toEqual([resolved]);
	});
});
