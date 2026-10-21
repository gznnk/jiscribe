// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import type { SnapshotRenderScope } from "../../utils/SnapshotRenderScope";
import { useSnapshotRenderScope } from "../useSnapshotRenderScope";

type ScopeProbe = {
	/** The scope on the newest render */
	latestScope: () => SnapshotRenderScope | null;
	withSnapshotRenderScope: <T>(
		renderScope: SnapshotRenderScope,
		snapshot: () => T,
	) => T;
};

let unmount: (() => void) | null = null;

afterEach(() => {
	unmount?.();
	unmount = null;
});

const mountScope = (): ScopeProbe => {
	let scope: SnapshotRenderScope | null = null;
	let runSnapshot: ScopeProbe["withSnapshotRenderScope"] | null = null;
	const Probe = () => {
		const snapshotScope = useSnapshotRenderScope();
		scope = snapshotScope.snapshotRenderScope;
		runSnapshot = snapshotScope.withSnapshotRenderScope;
		return null;
	};
	const root = createRoot(document.createElement("div"));
	act(() => root.render(<Probe />));
	unmount = () => act(() => root.unmount());
	return {
		latestScope: () => scope,
		// Inside act, so the clear the hook schedules has landed when this returns
		withSnapshotRenderScope: (renderScope, snapshot) => {
			const run = runSnapshot;
			if (!run) {
				throw new Error("the probe has not rendered");
			}
			// A throw is carried out of act rather than through it, which would
			// abandon the queued clear
			type Outcome =
				| { threw: false; value: ReturnType<typeof snapshot> }
				| { threw: true; error: unknown };
			// Typed by assertion: an assignment inside the callback is not seen by narrowing
			let outcome = null as Outcome | null;
			act(() => {
				try {
					outcome = { threw: false, value: run(renderScope, snapshot) };
				} catch (error) {
					outcome = { threw: true, error };
				}
			});
			if (outcome === null) {
				throw new Error("the snapshot did not run");
			}
			if (outcome.threw) {
				throw outcome.error;
			}
			return outcome.value;
		},
	};
};

describe("useSnapshotRenderScope", () => {
	it("holds no scope while no snapshot runs", () => {
		const probe = mountScope();
		expect(probe.latestScope()).toBeNull();
	});

	it("has the snapshot's scope rendered before the snapshot runs, and clears it afterwards", () => {
		const probe = mountScope();
		const renderScope = new Set(["off-screen"]);
		const seen = probe.withSnapshotRenderScope(renderScope, () =>
			probe.latestScope(),
		);
		expect(seen).toBe(renderScope);
		expect(probe.latestScope()).toBeNull();
	});

	it("clears the scope when the snapshot throws", () => {
		const probe = mountScope();
		expect(() =>
			probe.withSnapshotRenderScope("all", () => {
				throw new Error("clone failed");
			}),
		).toThrow("clone failed");
		expect(probe.latestScope()).toBeNull();
	});
});
