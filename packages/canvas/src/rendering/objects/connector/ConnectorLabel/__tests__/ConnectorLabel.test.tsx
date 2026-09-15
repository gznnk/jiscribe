// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { FontsLoadedNonceContext } from "../../../FontsLoadedNonceContext";
import { ConnectorLabel } from "../ConnectorLabel";
import type * as ConnectorLabelLayoutModule from "../utils/connectorLabelLayout";

/**
 * The label box is measured while the label renders, so nothing in the state
 * changes when a face lands — FontsLoadedNonceContext is the only thing that can
 * invalidate the memo holding that measurement.
 */

// Without this React treats every `act` below as unsupported and warns, the
// flushes being correct all the same.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const boxCalls = vi.hoisted(() => ({ count: 0 }));

vi.mock("../utils/connectorLabelLayout", async (importOriginal) => {
	const actual = await importOriginal<typeof ConnectorLabelLayoutModule>();
	return {
		...actual,
		resolveConnectorLabelBox: (
			...args: Parameters<typeof actual.resolveConnectorLabelBox>
		) => {
			boxCalls.count += 1;
			return actual.resolveConnectorLabelBox(...args);
		},
	};
});

// Held outside the render so the props are identical between renders: without
// that, the label's own memo never bails out and the second test would pass on a
// re-render rather than on the memo it means to check.
const LABEL_ANCHOR = { x: 10, y: 20 };

/** Mounts one label and lets the test drive the nonce the tree is given. */
const renderConnectorLabel = () => {
	const container = document.createElement("div");
	const root = createRoot(container);
	return {
		render: (nonce: number): void => {
			act(() =>
				root.render(
					<FontsLoadedNonceContext value={nonce}>
						<svg>
							<ConnectorLabel
								id="connector-1"
								anchor={LABEL_ANCHOR}
								text="label"
							/>
						</svg>
					</FontsLoadedNonceContext>,
				),
			);
		},
		unmount: () => act(() => root.unmount()),
	};
};

describe("ConnectorLabel", () => {
	beforeEach(() => {
		boxCalls.count = 0;
	});

	it("re-measures its box when the fonts-loaded nonce moves", () => {
		const label = renderConnectorLabel();
		label.render(0);
		const measuredBefore = boxCalls.count;

		label.render(1);

		expect(boxCalls.count).toBe(measuredBefore + 1);
		label.unmount();
	});

	it("keeps the measured box while the nonce stands still", () => {
		const label = renderConnectorLabel();
		label.render(0);
		const measuredBefore = boxCalls.count;

		label.render(0);
		label.render(0);

		expect(boxCalls.count).toBe(measuredBefore);
		label.unmount();
	});
});
