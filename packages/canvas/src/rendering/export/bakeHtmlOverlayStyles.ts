/**
 * Bakes the computed styles of an HTML overlay (a foreignObject marked
 * `data-canvas-export="html"`) into its clone, so the PNG export can draw the
 * rendered HTML itself instead of a plain-text `<text>`.
 *
 * The SVG an `<img>` rasterizes is an isolated document: it sees neither the
 * page's stylesheets nor its custom properties, so every declaration that makes
 * the overlay look as it does has to travel as an inline style. Writing every
 * longhand on every element would cost megabytes; a declaration is left out
 * when the isolated document would arrive at the same value without it (see
 * {@link shouldBakeDeclaration}).
 *
 * Known limits:
 * - Pseudo-elements (`::before` / `::after`) cannot be written inline, so what
 *   they draw is lost (KaTeX draws parts of `.stretchy` and `\tag` with them)
 * - The UA default is read off a bare element, so a context-dependent UA rule
 *   (`ul ul { margin: 0 }`) or an em-based UA default that happens to equal the
 *   author's px value is left out and reverts to the UA's own value
 * - Without the Typed OM (`computedStyleMap`, absent in Firefox) sizes are read
 *   as used px, so every `auto` width and height is pinned to its live size
 */

/**
 * Longhands the root foreignObject never takes: its box and placement ride on
 * attributes. Chromium reports the `transform` attribute as a computed
 * `transform`, which inline would win over the attribute the flatten step
 * rewrites (buildExportSvg).
 */
const ROOT_SKIPPED_PROPERTIES: ReadonlySet<string> = new Set([
	"transform",
	"x",
	"y",
	"width",
	"height",
]);

/**
 * Hides the element holding the UA-default probes using non-inherited
 * properties alone, so the probes inherit initial values only.
 */
const DEFAULTS_HOST_STYLE =
	"all: initial; position: fixed; left: -10000px; top: 0; width: 0; height: 0; overflow: hidden; contain: strict";

/** Every longhand of one element's computed style, read once. */
type ComputedValues = ReadonlyMap<string, string>;

/**
 * Whether one computed longhand has to be written on the clone for the isolated
 * document to arrive at the same value.
 *
 * Left out only when the value equals both the UA default and the parent's value:
 * an inherited property then inherits it, and a non-inherited one falls back to
 * it. One that equals the default but not the parent is written, since an
 * inherited property would otherwise take the parent's.
 *
 * @param value - The live element's computed value
 * @param defaultValue - The same longhand computed on a bare element of the same tag and namespace, with nothing inherited; undefined when that element's style does not list it, which counts as different
 * @param parentValue - The live parent's computed value; null for the subtree root, which is compared against the default alone, and undefined when the parent's style does not list the longhand, which counts as different
 * @returns True when the declaration must be written
 */
export const shouldBakeDeclaration = (
	value: string,
	defaultValue: string | undefined,
	parentValue: string | null | undefined,
): boolean =>
	value !== defaultValue || (parentValue !== null && value !== parentValue);

/**
 * Longhands whose `getComputedStyle` value is the used px rather than the
 * computed one, read from the Typed OM instead. Baked as px, an `auto` height
 * turns definite and stops margins collapsing through the box. The positioned
 * insets and the margins / paddings are also read as used px, but those resolve
 * to the same px as long as the containing block keeps its size (the
 * foreignObject fixes the root's), so they are left as read.
 */
const USED_VALUE_PROPERTIES = [
	"width",
	"height",
	"inline-size",
	"block-size",
] as const;

/** Reads every longhand of `element`'s computed style; custom properties are left out, `var()` being resolved already. */
const readComputedValues = (element: Element): ComputedValues => {
	const computed = getComputedStyle(element);
	const values = new Map<string, string>();
	for (let i = 0; i < computed.length; i++) {
		const name = computed[i];
		if (name.startsWith("--")) {
			continue;
		}
		values.set(name, computed.getPropertyValue(name));
	}
	if (typeof element.computedStyleMap === "function") {
		const typedValues = element.computedStyleMap();
		for (const name of USED_VALUE_PROPERTIES) {
			const typedValue = typedValues.get(name)?.toString();
			if (typedValue !== undefined && values.has(name)) {
				values.set(name, typedValue);
			}
		}
	}
	return values;
};

const toTagKey = (element: Element): string =>
	`${element.namespaceURI ?? ""} ${element.localName}`;

const isInlineStyledElement = (
	value: Element,
): value is Element & ElementCSSInlineStyle => "style" in value;

/** One marked foreignObject of the live canvas and its counterpart in the export clone. */
export type HtmlOverlayPair = {
	/** The foreignObject in the live canvas; read only. */
	liveForeignObject: Element;
	/** Its counterpart in the clone, paired in document order; its inline styles are replaced. */
	clonedForeignObject: Element;
};

/** Every element of a subtree, its root first, in document order. */
const listSubtree = (root: Element): Element[] => [
	root,
	...Array.from(root.querySelectorAll("*")),
];

/**
 * Writes one overlay's computed styles onto its clone as inline styles, and
 * drops the `class` attributes. The two subtrees are paired in document order,
 * which holds because the clone is taken before anything restructures it.
 */
const bakeOverlay = (
	{ liveForeignObject, clonedForeignObject }: HtmlOverlayPair,
	defaultValuesByTag: ReadonlyMap<string, ComputedValues>,
): void => {
	const liveElements = listSubtree(liveForeignObject);
	const clonedElements = listSubtree(clonedForeignObject);
	const liveValuesByElement = new Map<Element, ComputedValues>();
	for (let i = 0; i < liveElements.length; i++) {
		const live = liveElements[i];
		const cloned = clonedElements[i];
		if (cloned === undefined) {
			break;
		}
		const values = readComputedValues(live);
		liveValuesByElement.set(live, values);
		const isRoot = i === 0;
		// Ancestors come first in document order, so a parent is always read.
		const parentValues =
			isRoot || live.parentElement === null
				? null
				: (liveValuesByElement.get(live.parentElement) ?? null);
		const defaultValues = defaultValuesByTag.get(toTagKey(live));

		cloned.removeAttribute("class");
		if (!isInlineStyledElement(cloned)) {
			continue;
		}
		// Anything left out is meant to come from the default or the parent, so
		// the inline style the clone copied (a `var()`, for one) must not linger.
		cloned.removeAttribute("style");
		for (const [name, value] of values) {
			if (isRoot && ROOT_SKIPPED_PROPERTIES.has(name)) {
				continue;
			}
			const parentValue = parentValues === null ? null : parentValues.get(name);
			if (shouldBakeDeclaration(value, defaultValues?.get(name), parentValue)) {
				cloned.style.setProperty(name, value);
			}
		}
	}
};

/**
 * Writes the computed styles of every marked overlay and its descendants onto
 * their clones as inline styles, and drops their `class` attributes.
 *
 * It runs synchronously, adding and removing one hidden probe host on the live
 * `body` for the whole batch: the export's render scope only lasts for the
 * synchronous clone (useSnapshotRenderScope), and each insert or removal costs a
 * restyle of the canvas.
 *
 * @param overlayPairs - Every marked foreignObject with its clone; an empty list adds no host at all
 */
export const bakeHtmlOverlayStyles = (
	overlayPairs: readonly HtmlOverlayPair[],
): void => {
	if (overlayPairs.length === 0) {
		return;
	}
	const defaultsHost = document.createElement("div");
	defaultsHost.style.cssText = DEFAULTS_HOST_STYLE;
	document.body.append(defaultsHost);
	try {
		// Every probe goes in before the first read: adding an element after one
		// would restyle the whole canvas on the next.
		const shadowRoot = defaultsHost.attachShadow({ mode: "open" });
		const probesByTag = new Map<string, Element>();
		for (const { liveForeignObject } of overlayPairs) {
			for (const live of listSubtree(liveForeignObject)) {
				const key = toTagKey(live);
				if (!probesByTag.has(key)) {
					const probe = document.createElementNS(
						live.namespaceURI,
						live.localName,
					);
					shadowRoot.append(probe);
					probesByTag.set(key, probe);
				}
			}
		}
		const defaultValuesByTag = new Map<string, ComputedValues>();
		for (const [key, probe] of probesByTag) {
			defaultValuesByTag.set(key, readComputedValues(probe));
		}
		for (const overlayPair of overlayPairs) {
			bakeOverlay(overlayPair, defaultValuesByTag);
		}
	} finally {
		defaultsHost.remove();
	}
};
