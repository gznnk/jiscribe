import { IMAGE_SETTLE_DEADLINE_MS } from "./harnessBridge";

const nextFrame = (): Promise<void> =>
	new Promise((resolve) => {
		requestAnimationFrame(() => {
			resolve();
		});
	});

/**
 * Waits until no image shape on the page is still waiting for its file, and
 * gives back how many were still waiting when it gave up.
 *
 * The canvas marks each image's group with `data-image-status`, `loading` until
 * the host's `resolveImage` has settled either way — that attribute is the
 * signal, so nothing here has to know which fetches are in flight. It is also
 * all there is to count with: `data-image-src` is written only on the image
 * element a settled group draws, so a group that is still loading cannot say
 * which file it is waiting for.
 *
 * @returns The number of image shapes still `loading` at the deadline; 0 when everything settled, which is every run that is not up against a slow read
 */
export const waitForDocImages = async (): Promise<number> => {
	const startedAt = performance.now();
	while (
		document.querySelector('[data-image-status="loading"]') !== null &&
		performance.now() - startedAt < IMAGE_SETTLE_DEADLINE_MS
	) {
		await nextFrame();
	}
	return document.querySelectorAll('[data-image-status="loading"]').length;
};
