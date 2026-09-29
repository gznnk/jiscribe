import { createContext, useContext } from "react";

/**
 * What a canvas knows about one image file at this moment, keyed by the `src`
 * the document names it with.
 *
 * `loading` covers both halves of "nothing to draw yet": a resolution still in
 * flight, and a `src` nobody has been asked to resolve at all (no `resolveImage`
 * prop). Either way the shape draws its placeholder, so the difference is not
 * one a renderer could act on.
 */
export type ResolvedImage =
	| { status: "loading" }
	| {
			status: "ready";
			/** Blob URL the live `<image>` draws from; revoked once the document stops naming the src. */
			objectUrl: string;
			/** The bytes themselves, which the export inlines — a blob URL names nothing outside this tab. */
			blob: Blob;
	  }
	| { status: "error" };

/** Reads the state of one image out of the canvas's resolutions. */
export type ResolvedImageLookup = (src: string) => ResolvedImage;

/**
 * What a `src` with no resolution of its own reads as — one still in flight, one
 * nobody was asked for, and every one at all in a tree with no Provider
 * (exports, isolated component tests).
 */
export const UNRESOLVED_IMAGE: ResolvedImage = { status: "loading" };

/**
 * Rendering-layer context carrying `useDocImages`' lookup.
 *
 * A new function identity is what re-renders the memoized image shapes when a
 * file arrives — the resolution is not in their props, and nothing else about
 * the document changes when a blob lands.
 *
 * The default reports every `src` as loading, which is the right reading for a
 * tree with no Provider: every image draws as a placeholder rather than
 * pretending to a failure nobody attempted.
 */
export const ResolvedImagesContext = createContext<ResolvedImageLookup>(
	() => UNRESOLVED_IMAGE,
);

/**
 * Subscribes to the surrounding `<Canvas>` image resolutions, so a memoized
 * shape re-renders when its file arrives.
 *
 * @returns The lookup; call it with the shape's own `src`
 */
export function useResolvedImagesContext(): ResolvedImageLookup {
	return useContext(ResolvedImagesContext);
}
