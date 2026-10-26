// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ExportDialog } from "../ExportDialog";
import type { ExportSubmitValues } from "../ExportDialog";

const roots: { unmount: () => void }[] = [];
const hosts: HTMLElement[] = [];

/** Mounts the dialog and hands back its scope radios and the spy its submit lands on. */
const mountDialog = (canExportSelection: boolean) => {
	const onSubmit = vi.fn<(values: ExportSubmitValues) => void>();
	const host = document.createElement("div");
	document.body.append(host);
	hosts.push(host);
	const root = createRoot(host);
	roots.push(root);
	act(() => {
		root.render(
			<ExportDialog
				defaultMargin={16}
				canExportSelection={canExportSelection}
				onClose={() => {}}
				onSubmit={onSubmit}
			/>,
		);
	});
	const queryRadio = (testId: string) => {
		const radio = host.querySelector<HTMLInputElement>(
			`[data-testid="${testId}"]`,
		);
		if (radio === null) {
			throw new Error(`the dialog rendered no ${testId}`);
		}
		return radio;
	};
	return {
		onSubmit,
		host,
		allRadio: queryRadio("export-dialog:scope-all"),
		selectionRadio: queryRadio("export-dialog:scope-selection"),
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

describe("the export dialog's scope", () => {
	it("is the first field, a radio group of whole drawing and selection", () => {
		const { host, allRadio, selectionRadio } = mountDialog(true);
		const firstGroup = host.querySelector('[role="radiogroup"]');
		expect(firstGroup?.contains(allRadio)).toBe(true);
		expect(firstGroup?.contains(selectionRadio)).toBe(true);
		expect(allRadio.name).toBe("export-scope");
		expect(selectionRadio.name).toBe("export-scope");
	});

	it("starts at the selection when something is selected", () => {
		const { allRadio, selectionRadio, onSubmit, submit } = mountDialog(true);
		expect(selectionRadio.checked).toBe(true);
		expect(allRadio.checked).toBe(false);
		submit();
		expect(onSubmit.mock.calls[0][0].scope).toBe("selection");
	});

	it("disables the selection scope when nothing is selected", () => {
		const { allRadio, selectionRadio } = mountDialog(false);
		expect(selectionRadio.disabled).toBe(true);
		expect(allRadio.disabled).toBe(false);
		expect(allRadio.checked).toBe(true);
	});

	it("submits the whole drawing once it is chosen over the selection", () => {
		const { allRadio, onSubmit, submit } = mountDialog(true);
		act(() => {
			allRadio.click();
		});
		expect(allRadio.checked).toBe(true);
		submit();
		expect(onSubmit).toHaveBeenCalledTimes(1);
		expect(onSubmit.mock.calls[0][0]).toEqual({
			scope: "all",
			format: "png",
			margin: 16,
			includeSource: true,
			transparentBackground: false,
		});
	});
});
