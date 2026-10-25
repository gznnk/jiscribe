// @vitest-environment jsdom

import { act, type RefObject, useEffect, useLayoutEffect } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";

import { useLatestRef } from "../useLatestRef";

/**
 * The timing the hook documents: a passive effect of the same commit already
 * reads the new value, while render and layout effects still see the previous
 * commit's — which is why the readers that run that early keep a layout mirror
 * of their own.
 */

// Without this React treats every `act` below as unsupported and warns.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

type Reads = { render: number; layout: number; passive: number };

const mountProbe = (initialValue: number) => {
	const reads: Reads[] = [];
	const refs: RefObject<number>[] = [];
	const Probe = ({ value }: { value: number }) => {
		const latestRef = useLatestRef(value);
		refs.push(latestRef);
		const read: Reads = { render: latestRef.current, layout: -1, passive: -1 };
		reads.push(read);
		useLayoutEffect(() => {
			read.layout = latestRef.current;
		});
		// Declared after useLatestRef, so it runs after the hook's own effect.
		useEffect(() => {
			read.passive = latestRef.current;
		});
		return null;
	};
	const root = createRoot(document.createElement("div"));
	const render = (value: number) =>
		act(() => {
			root.render(<Probe value={value} />);
		});
	render(initialValue);
	return { reads, refs, render, unmount: () => act(() => root.unmount()) };
};

describe("useLatestRef", () => {
	it("hands the new value to the commit's passive effects, but not to its render or layout effects", () => {
		const { reads, render, unmount } = mountProbe(1);
		render(2);
		expect(reads.at(-1)).toEqual({ render: 1, layout: 1, passive: 2 });
		unmount();
	});

	it("keeps returning the same ref across renders", () => {
		const { refs, render, unmount } = mountProbe(1);
		render(2);
		render(3);
		expect(new Set(refs).size).toBe(1);
		expect(refs[0].current).toBe(3);
		unmount();
	});
});
