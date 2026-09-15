import { useEffect, useMemo, useRef, useState } from "react";

import type {
	ResolvedImage,
	ResolvedImageLookup,
} from "../../rendering/objects/ResolvedImagesContext";
import { UNRESOLVED_IMAGE } from "../../rendering/objects/ResolvedImagesContext";
import type { ObjectState } from "../../states/objects/base/ObjectState";
import { collectStateImageSources } from "../utils/collectStateImageSources";

/**
 * Host implementation that turns an image object's `src` into its bytes.
 *
 * The canvas neither resolves nor validates the string: reading a file is the
 * host's business, the way opening a `meta.reference` is (`onOpenReference`).
 *
 * @param src - The `src` exactly as the document stores it — a path relative to the directory the `.jis` lives in (`splitDocRelativePath` is the shared reading of it)
 * @returns The file's bytes; reject (with anything) for a file that is missing, unreadable or outside the document's directory, and the image draws as a placeholder — throwing synchronously is read the same way as rejecting
 */
export type ResolveImage = (src: string) => Promise<Blob>;

/**
 * The image side of a canvas: the files a document names, fetched once each and
 * handed to the rendering layer as one lookup.
 *
 * An object component is a synchronous `FC`, so a shape cannot await its own
 * file. This is where the awaiting happens instead: every `src` the document
 * draws is asked of the host once, and a new lookup identity published on every
 * arrival is what pierces the memo of the shapes drawing it.
 *
 * The resolver is read through a ref, so a host passing a new arrow each render
 * re-fetches nothing — the resolutions are keyed by `src` alone. Which means a
 * host that has to re-resolve the same `src` (the file changed on disk) has to
 * say so by changing the `src`, not the function.
 *
 * @param objects - The state's object map, re-read on every change so an image added or removed after mount is picked up
 * @param resolveImage - The host's resolver, or undefined to resolve nothing at all — every image then stays `loading`, i.e. draws its placeholder
 * @returns The lookup to publish through `ResolvedImagesContext`; its identity changes on every resolution, and only then
 */
export const useDocImages = (
	objects: Record<string, ObjectState>,
	resolveImage: ResolveImage | undefined,
): ResolvedImageLookup => {
	// Read only from the effects below, so the callback does not have to hold its
	// identity across renders.
	const resolveImageRef = useRef(resolveImage);
	useEffect(() => {
		resolveImageRef.current = resolveImage;
	});

	// Mutable rather than state: the entries outlive every render and are keyed
	// by src alone, and the counter below is what announces a change to them.
	const resolvedBySrcRef = useRef(new Map<string, ResolvedImage>());
	const [resolvedNonce, setResolvedNonce] = useState(0);

	// Declared before the resolving effect so that a remount (StrictMode, a
	// re-keyed canvas) has cleared the entries before the next resolution starts.
	useEffect(
		() => () => {
			for (const resolved of resolvedBySrcRef.current.values()) {
				if (resolved.status === "ready") {
					URL.revokeObjectURL(resolved.objectUrl);
				}
			}
			resolvedBySrcRef.current.clear();
		},
		[],
	);

	const hasResolver = resolveImage !== undefined;
	useEffect(() => {
		const resolvedBySrc = resolvedBySrcRef.current;
		const sources = collectStateImageSources(objects);
		const wantedSources = new Set(sources);

		// A src the document no longer draws takes its blob URL with it; nothing
		// can reach the bytes again without asking for them afresh.
		for (const [src, resolved] of resolvedBySrc) {
			if (!wantedSources.has(src)) {
				if (resolved.status === "ready") {
					URL.revokeObjectURL(resolved.objectUrl);
				}
				resolvedBySrc.delete(src);
			}
		}

		const resolveImageNow = resolveImageRef.current;
		if (resolveImageNow === undefined) {
			return;
		}
		for (const src of sources) {
			if (resolvedBySrc.has(src)) {
				continue;
			}
			// The entry claims the slot by identity: a settlement whose claim is no
			// longer the current entry (the src was dropped, the canvas remounted)
			// is discarded rather than written, so nothing revives a revoked URL.
			const claim: ResolvedImage = { status: "loading" };
			resolvedBySrc.set(src, claim);
			const settle = (resolved: ResolvedImage): void => {
				if (resolvedBySrc.get(src) !== claim) {
					if (resolved.status === "ready") {
						URL.revokeObjectURL(resolved.objectUrl);
					}
					return;
				}
				resolvedBySrc.set(src, resolved);
				setResolvedNonce((previous) => previous + 1);
			};
			// Called from inside the promise so that a host resolver throwing
			// synchronously becomes the same error state as a rejection; thrown
			// out here it would escape the effect and unmount the canvas.
			void Promise.resolve()
				.then(async (): Promise<ResolvedImage> => {
					const blob = await resolveImageNow(src);
					// The blob is kept beside its URL because an export carries the
					// bytes themselves (inlineExportImages), not a URL of this tab's.
					return {
						status: "ready",
						objectUrl: URL.createObjectURL(blob),
						blob,
					};
				})
				.then(settle, () => {
					settle({ status: "error" });
				});
		}
		// A resolver arriving after the document (a host that learns the file's
		// directory late) has to start the fetches the earlier run skipped; a
		// change of function alone does not, hence the boolean rather than the ref.
	}, [objects, hasResolver]);

	return useMemo(
		() => (src: string) =>
			resolvedBySrcRef.current.get(src) ?? UNRESOLVED_IMAGE,
		// The counter is an invalidation signal, not an argument: a fresh identity
		// per arrival is what re-renders the shapes reading through the context.
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[resolvedNonce],
	);
};
