// @vitest-environment jsdom

import type { CanvasDoc } from "@jiscribe/doc/model/canvas/CanvasDoc";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { canvasToState } from "../../../../../states/canvas/CanvasMapper";
import { createTestRegistries } from "../../../../registries/createCanvasRegistries";
import {
	EXPORT_FIT_PADDING,
	resolveExportOptions,
} from "../../../../utils/resolveExportOptions";
import { ExportDialog } from "../ExportDialog";
import type { ExportSubmitValues } from "../ExportDialog";

/**
 * What the export dialog does to a document that declared its own framing:
 * nothing of it survives.
 *
 * `resolveExportOptions` prefers a caller's `margin` over `view.padding`, and
 * the dialog's submit always carries one — the field is required on
 * `ExportSubmitValues` and starts at the canvas-wide default rather than at
 * whatever the document declared. So the CLI honours a document's padding while
 * the dialog overrules it with 16 on every side, which is the opposite of each
 * other and easy to "unify" by accident in either direction.
 *
 * Pinned as the current behaviour, not endorsed as the intended one: the UI
 * question (how four declared sides would be shown in a single number field) is
 * open. What this fixes is that changing it has to be a decision.
 */

const registries = createTestRegistries();

const roots: { unmount: () => void }[] = [];
const hosts: HTMLElement[] = [];

/** Mounts the dialog and hands back the spy its submit lands on. */
const mountDialog = (defaultMargin: number) => {
	const onSubmit = vi.fn<(values: ExportSubmitValues) => void>();
	const host = document.createElement("div");
	document.body.append(host);
	hosts.push(host);
	const root = createRoot(host);
	roots.push(root);
	act(() => {
		root.render(
			<ExportDialog
				defaultMargin={defaultMargin}
				onClose={() => {}}
				onSubmit={onSubmit}
			/>,
		);
	});
	return {
		onSubmit,
		marginInput: host.querySelector<HTMLInputElement>(
			'[data-testid="export-dialog:margin"]',
		),
		/** Confirms the dialog as it stands, without touching a single field. */
		submit: () => {
			const form = host.querySelector("form");
			if (form === null) {
				throw new Error("the dialog rendered no form");
			}
			act(() => {
				form.dispatchEvent(
					new Event("submit", { bubbles: true, cancelable: true }),
				);
			});
		},
	};
};

afterEach(() => {
	act(() => {
		roots.splice(0).forEach((root) => {
			root.unmount();
		});
	});
	hosts.splice(0).forEach((host) => {
		host.remove();
	});
});

/** A one-rect document (0,0..10,10) declaring a different padding on every side. */
const docWithViewPadding: CanvasDoc = {
	version: 1,
	view: { padding: { top: 10, right: 20, bottom: 30, left: 40 } },
	root: [{ id: "rect-1", type: "rect", x: 0, y: 0, width: 10, height: 10 }],
} as unknown as CanvasDoc;

describe("the export dialog against a document that declared its own padding", () => {
	it("starts at the margin the canvas hands it, which is the canvas-wide default", () => {
		// Canvas.tsx passes EXPORT_FIT_PADDING here; the document is never consulted.
		const { marginInput } = mountDialog(EXPORT_FIT_PADDING);
		expect(marginInput?.value).toBe(String(EXPORT_FIT_PADDING));
	});

	it("submits that margin even when nothing in the dialog was touched", () => {
		const { onSubmit, submit } = mountDialog(EXPORT_FIT_PADDING);
		submit();
		expect(onSubmit).toHaveBeenCalledTimes(1);
		expect(onSubmit.mock.calls[0][0].margin).toBe(EXPORT_FIT_PADDING);
	});

	it("exports at 16 on every side, the document's four sides playing no part", () => {
		const { onSubmit, submit } = mountDialog(EXPORT_FIT_PADDING);
		submit();
		const state = canvasToState(
			docWithViewPadding,
			registries.objectMapper,
			registries.objectContentResizer,
		);
		expect(state.view?.padding).toEqual({
			top: 10,
			right: 20,
			bottom: 30,
			left: 40,
		});

		// The same call useExportDialog makes: the submitted values are the options.
		const options = resolveExportOptions(
			{
				...state,
				viewport: { minX: 0, minY: 0, width: 800, height: 600, zoom: 1 },
			},
			registries.objectMapper,
			registries.objectVisualBounds,
			onSubmit.mock.calls[0][0],
		);
		expect(options.viewBox).toEqual({
			x: -EXPORT_FIT_PADDING,
			y: -EXPORT_FIT_PADDING,
			width: 10 + EXPORT_FIT_PADDING * 2,
			height: 10 + EXPORT_FIT_PADDING * 2,
		});
	});
});
