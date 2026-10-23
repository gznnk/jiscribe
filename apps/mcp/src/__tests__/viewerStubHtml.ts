/**
 * What a test puts at index.html when it wants a host and not a viewer. It carries
 * an inline script because resolveViewerAssets refuses a page without one (the
 * page's Content-Security-Policy would let nothing run).
 */
export const VIEWER_STUB_HTML =
	'<!doctype html><script type="module">run()</script>';
