// The set-independent half of an icon set's generator: SVG source in, the node
// trees and the two generated modules (catalog and drawings) out. Each plugin's
// scripts/generateIconData.mjs collects the files and names the icons, and
// hands the rest to this module. Types are in index.d.mts.
//
// Nothing here changes what is drawn. The shipped sets are redistributed
// unmodified: no coordinate is rounded and no colour is substituted. Only the
// embedding is adjusted, and every adjustment is listed at its rule below. Any
// element, attribute or style declaration not on the lists stops the run, so a
// new release that carries something unseen is looked at before it ships.
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/** The elements a drawing may hold. Anything else fails the conversion. */
const ALLOWED_ELEMENTS = new Set([
	"g",
	"defs",
	"path",
	"rect",
	"circle",
	"ellipse",
	"polygon",
	"polyline",
	"linearGradient",
	"radialGradient",
	"stop",
	"clipPath",
	"mask",
	"title",
	"style",
]);

/** What `<defs>` may hold: definitions only, so lifting them into the parent draws nothing new. */
const ALLOWED_DEFS_CHILDREN = new Set([
	"linearGradient",
	"radialGradient",
	"clipPath",
	"mask",
	"style",
]);

/** The attributes kept on an element (renamed into React's spelling). */
const ALLOWED_ATTRIBUTES = new Set([
	"d",
	"points",
	"x",
	"y",
	"width",
	"height",
	"rx",
	"ry",
	"cx",
	"cy",
	"r",
	"fx",
	"fy",
	"x1",
	"y1",
	"x2",
	"y2",
	"transform",
	"fill",
	"fill-rule",
	"fill-opacity",
	"stroke",
	"stroke-width",
	"stroke-linecap",
	"stroke-linejoin",
	"stroke-miterlimit",
	"opacity",
	"clip-path",
	"clip-rule",
	"mask",
	"offset",
	"stop-color",
	"stop-opacity",
	"gradientUnits",
	"gradientTransform",
	"maskUnits",
]);

/**
 * Attributes read and then not emitted as they are: `id` and the references
 * are rewritten, `class` and `style` are expanded, the others are dropped
 * (ALLOWED_ATTRIBUTES lists what is kept as is).
 */
const HANDLED_ATTRIBUTES = new Set([
	"id",
	"href",
	"xlink:href",
	"class",
	"style",
	"isolation",
	"data-name",
]);

/**
 * Root `<svg>` attributes dropped: the namespace, the outer size (the viewBox
 * is kept in the catalog instead), the authoring tool's own names.
 */
const DROPPED_ROOT_ATTRIBUTES = new Set([
	"xmlns",
	"xmlns:xlink",
	"version",
	"width",
	"height",
	"viewBox",
	"xviewBox",
	"id",
	"data-name",
]);

/**
 * Root `<svg>` attributes that paint: inherited by every element, so they move
 * onto a `<g>` wrapping the whole drawing.
 */
const LIFTED_ROOT_ATTRIBUTES = new Set(["fill"]);

/** Style declarations a class rule may carry; each lands as the attribute of the same name. */
const ALLOWED_STYLE_PROPERTIES = new Set([
	"fill",
	"fill-rule",
	"fill-opacity",
	"stroke",
	"stroke-width",
	"stroke-linecap",
	"stroke-linejoin",
	"stroke-miterlimit",
	"opacity",
	"clip-rule",
	"stop-color",
	"stop-opacity",
]);

const NAME_PATTERN = /[A-Za-z_][\w:.-]*/y;
const URL_REFERENCE_PATTERN = /url\(#([^)]+)\)/g;

/**
 * Walks a directory tree and returns the path of every `.svg` file under it,
 * sorted so the output does not depend on the file system's order.
 *
 * @param dir - the directory to walk
 * @returns absolute or relative paths, as `dir` was given
 */
export const listSvgFiles = (dir) =>
	readdirSync(dir)
		.flatMap((entry) => {
			const path = join(dir, entry);
			if (statSync(path).isDirectory()) {
				return listSvgFiles(path);
			}
			return path.endsWith(".svg") ? [path] : [];
		})
		.sort();

const NAMED_ENTITIES = {
	amp: "&",
	lt: "<",
	gt: ">",
	quot: '"',
	apos: "'",
};

/** Decodes XML's character references; an entity XML does not predefine fails. */
const decodeEntities = (value, where, fail) =>
	value.replace(/&(#x[0-9A-Fa-f]+|#\d+|\w+);|&/g, (match, entity) => {
		if (entity === undefined) {
			return fail(`a bare & in ${where}`);
		}
		if (entity.startsWith("#x")) {
			return String.fromCodePoint(parseInt(entity.slice(2), 16));
		}
		if (entity.startsWith("#")) {
			return String.fromCodePoint(Number(entity.slice(1)));
		}
		if (!Object.prototype.hasOwnProperty.call(NAMED_ENTITIES, entity)) {
			return fail(`&${entity}; in ${where}`);
		}
		return NAMED_ENTITIES[entity];
	});

/**
 * Reads SVG source into an element tree. Comments, the XML declaration and a
 * doctype are skipped; text is kept for `<style>` and `<title>` only, and
 * anywhere else anything but whitespace (zero-width spaces included) fails.
 */
const parseSvg = (source, filePath) => {
	const fail = (message) => {
		throw new Error(`${filePath}: ${message}`);
	};
	const root = { tag: "#document", attrs: {}, children: [], text: "" };
	const stack = [root];
	let index = 0;
	while (index < source.length) {
		const open = source.indexOf("<", index);
		const text = source.slice(index, open === -1 ? source.length : open);
		// A zero-width space between tags counts as whitespace (some exports carry one).
		if (text.replace(/[\s\u200B\uFEFF]+/g, "") !== "") {
			const parent = stack[stack.length - 1];
			if (parent.tag !== "style" && parent.tag !== "title") {
				fail(`text inside <${parent.tag}>`);
			}
			parent.text += text;
		}
		if (open === -1) {
			break;
		}
		if (source.startsWith("<!--", open)) {
			index = source.indexOf("-->", open) + 3;
			continue;
		}
		if (source.startsWith("<![CDATA[", open)) {
			const end = source.indexOf("]]>", open);
			stack[stack.length - 1].text += source.slice(open + 9, end);
			index = end + 3;
			continue;
		}
		if (source.startsWith("<?", open) || source.startsWith("<!", open)) {
			index = source.indexOf(">", open) + 1;
			continue;
		}
		if (source[open + 1] === "/") {
			const close = source.indexOf(">", open);
			const tag = source.slice(open + 2, close).trim();
			const element = stack.pop();
			if (element === undefined || element.tag !== tag) {
				fail(`</${tag}> does not close its opening tag`);
			}
			index = close + 1;
			continue;
		}
		NAME_PATTERN.lastIndex = open + 1;
		const tag = NAME_PATTERN.exec(source)?.[0];
		if (tag === undefined) {
			fail(`unreadable tag at offset ${open}`);
		}
		let cursor = open + 1 + tag.length;
		const attrs = {};
		for (;;) {
			while (/\s/.test(source[cursor])) {
				cursor += 1;
			}
			if (source[cursor] === ">" || source.startsWith("/>", cursor)) {
				break;
			}
			NAME_PATTERN.lastIndex = cursor;
			const name = NAME_PATTERN.exec(source)?.[0];
			if (name === undefined) {
				fail(`unreadable attribute in <${tag}>`);
			}
			cursor += name.length;
			const valueMatch = /^\s*=\s*(?:"([^"]*)"|'([^']*)')/.exec(
				source.slice(cursor),
			);
			if (valueMatch === null) {
				fail(`attribute ${name} of <${tag}> has no quoted value`);
			}
			const value = decodeEntities(
				valueMatch[1] ?? valueMatch[2],
				`attribute ${name} of <${tag}>`,
				fail,
			);
			if (Object.prototype.hasOwnProperty.call(attrs, name)) {
				fail(`<${tag}> carries ${name} twice`);
			}
			attrs[name] = value;
			cursor += valueMatch[0].length;
		}
		const selfClosing = source[cursor] === "/";
		const element = { tag, attrs, children: [], text: "" };
		stack[stack.length - 1].children.push(element);
		if (!selfClosing) {
			stack.push(element);
		}
		index = cursor + (selfClosing ? 2 : 1);
	}
	if (stack.length !== 1) {
		fail("an element is left unclosed");
	}
	const svgElements = root.children.filter((child) => child.tag === "svg");
	if (svgElements.length !== 1 || root.children.length !== 1) {
		fail("the document is not a single <svg> element");
	}
	return svgElements[0];
};

/** Every element of a tree, parents before children. */
const walkElements = function* (element) {
	for (const child of element.children) {
		yield child;
		yield* walkElements(child);
	}
};

/** Splits `prop: value; …` into pairs; an empty declaration is skipped. */
const parseDeclarations = (source, where, fail) =>
	source
		.split(";")
		.map((declaration) => declaration.trim())
		.filter((declaration) => declaration !== "")
		.map((declaration) => {
			const colon = declaration.indexOf(":");
			if (colon === -1) {
				fail(`unreadable declaration "${declaration}" in ${where}`);
			}
			return [
				declaration.slice(0, colon).trim(),
				declaration.slice(colon + 1).trim(),
			];
		});

/**
 * Reads every `<style>` into class name → declarations. Only rules of a single
 * class selector are understood; anything else in a stylesheet fails.
 * `isolation: isolate` is dropped like the attribute form (see dropIsolation).
 */
const readClassRules = (svg, fail) => {
	const rulesByClass = new Map();
	for (const element of walkElements(svg)) {
		if (element.tag !== "style") {
			continue;
		}
		const rulePattern = /\.([A-Za-z_][\w-]*)\s*\{([^}]*)\}/g;
		const leftover = element.text.replace(rulePattern, "").trim();
		if (leftover !== "") {
			fail(
				`a stylesheet rule other than a single class selector: "${leftover}"`,
			);
		}
		for (const [, className, body] of element.text.matchAll(rulePattern)) {
			if (rulesByClass.has(className)) {
				fail(`class .${className} is ruled twice`);
			}
			const declarations = parseDeclarations(
				body,
				`.${className}`,
				fail,
			).filter(
				([property, value]) => !isDroppedIsolation(property, value, fail),
			);
			for (const [property] of declarations) {
				if (!ALLOWED_STYLE_PROPERTIES.has(property)) {
					fail(`.${className} sets ${property}, which is not on the list`);
				}
			}
			rulesByClass.set(className, declarations);
		}
	}
	return rulesByClass;
};

/**
 * `isolation: isolate` only changes how blend modes composite, and no element
 * of a shipped set blends, so it is a no-op and is dropped. Any other value
 * fails.
 */
const isDroppedIsolation = (property, value, fail) => {
	if (property !== "isolation") {
		return false;
	}
	if (value !== "isolate") {
		fail(`isolation: ${value}, which is not on the list`);
	}
	return true;
};

/**
 * Resolves one element's attributes to plain presentation attributes: the
 * `class` rules and the `style` declarations folded in, `isolation` and
 * `data-name` dropped, `xlink:href` read as `href`. A rule setting a property
 * the element already carries fails rather than picking a winner.
 */
const resolveAttributes = (element, rulesByClass, fail) => {
	const resolved = {};
	const sourceByName = new Map();
	const assign = (name, value, source) => {
		if (sourceByName.has(name)) {
			fail(
				`<${element.tag}> gets ${name} from both ${sourceByName.get(name)} and ${source}`,
			);
		}
		sourceByName.set(name, source);
		resolved[name] = value;
	};
	for (const [name, value] of Object.entries(element.attrs)) {
		if (name === "data-name") {
			continue;
		}
		if (name === "isolation") {
			isDroppedIsolation(name, value, fail);
			continue;
		}
		if (name === "class") {
			for (const className of value
				.split(/\s+/)
				.filter((part) => part !== "")) {
				const declarations = rulesByClass.get(className);
				if (declarations === undefined) {
					fail(
						`<${element.tag}> names class ${className}, which no rule defines`,
					);
				}
				for (const [property, propertyValue] of declarations) {
					assign(property, propertyValue, `.${className}`);
				}
			}
			continue;
		}
		if (name === "style") {
			for (const [property, propertyValue] of parseDeclarations(
				value,
				`the style of <${element.tag}>`,
				fail,
			)) {
				if (!isDroppedIsolation(property, propertyValue, fail)) {
					fail(`style="${property}: ${propertyValue}" is not on the list`);
				}
			}
			continue;
		}
		if (name === "xlink:href") {
			assign("href", value, "xlink:href");
			continue;
		}
		if (!ALLOWED_ATTRIBUTES.has(name) && !HANDLED_ATTRIBUTES.has(name)) {
			fail(`<${element.tag}> carries ${name}, which is not on the list`);
		}
		assign(name, value, "an attribute");
	}
	return resolved;
};

/**
 * Whether a clipPath clips nothing at all: one untransformed rect over the whole
 * viewBox. Those are an authoring tool's artboard bounds and can go; anything
 * else clips for real and is kept, or the picture would change. An empty
 * clipPath is the opposite of a no-op (it hides everything it is applied to),
 * so it is kept too.
 */
const isFullViewBoxClip = (element, viewBoxSize) =>
	element.children.length > 0 &&
	element.children.every((child) => {
		const { x = "0", y = "0", width, height, transform } = child.attrs;
		return (
			child.tag === "rect" &&
			transform === undefined &&
			Number(x) === 0 &&
			Number(y) === 0 &&
			Number(width) === viewBoxSize.width &&
			Number(height) === viewBoxSize.height
		);
	});

/** The ids an attribute value refers to: every `url(#…)`, and `href="#…"`. */
const readReferencedIds = (name, value) => {
	if (name === "href") {
		if (!value.startsWith("#")) {
			return null;
		}
		return [value.slice(1)];
	}
	return [...value.matchAll(URL_REFERENCE_PATTERN)].map(([, id]) => id);
};

/** Rewrites an attribute name into React's spelling (`fill-rule` → `fillRule`). */
const toReactAttributeName = (name) =>
	name.replace(/-([a-z])/g, (_match, letter) => letter.toUpperCase());

/**
 * Reads the viewBox off the root, by its exact attribute name. A root with
 * `xviewBox` in its place (a misspelling some exports carry) gets one built
 * from its `width` / `height`.
 */
const readViewBox = (svg, fail) => {
	const { viewBox, xviewBox, width, height } = svg.attrs;
	if (viewBox !== undefined) {
		return viewBox;
	}
	if (xviewBox !== undefined && width !== undefined && height !== undefined) {
		return `0 0 ${width} ${height}`;
	}
	return fail("no viewBox");
};

/**
 * Converts one asset into the drawing a generated module stores.
 *
 * What is adjusted, and nothing else:
 *
 * - the root `<svg>`: its namespace, size, viewBox (kept in the catalog
 *   instead) and the tool's own names are dropped; a painting attribute
 *   (`fill`) moves onto a `<g>` wrapping the drawing
 * - `<title>`, `data-name`, and `<defs>` (its definitions are lifted into the
 *   parent; a definition draws nothing wherever it sits)
 * - `<style>` and `class`: each rule's declarations land on the elements as
 *   attributes
 * - `isolation: isolate`, in either form (a no-op without blending)
 * - `xlink:href` becomes `href`
 * - ids: one something refers to is renamed `<idPrefix>-<n>`, in document
 *   order, and its references follow; one nothing refers to is dropped
 * - a clipPath over the whole viewBox (a no-op) is dropped, and the
 *   `clip-path` pointing at it
 * - `clip-rule` outside a clipPath and off its ancestors, where it has
 *   nothing to apply to
 * - a `<g>` left with no attributes is unwrapped
 * - attribute names take React's spelling
 *
 * @param source - the SVG text
 * @param options - `filePath` names the asset in an error; `idPrefix` starts
 *   every kept id and must be unique across the set (and across a set's
 *   renditions)
 * @returns the viewBox as authored (or built, see readViewBox), the node
 *   tree, and the kept ids in document order
 * @throws on anything not on the lists, a reference to an id the asset does not
 *   define, or malformed markup
 */
export const convertIconSetSvg = (source, { filePath, idPrefix }) => {
	const fail = (message) => {
		throw new Error(`${filePath}: ${message}`);
	};
	const svg = parseSvg(source, filePath);
	const viewBox = readViewBox(svg, fail);
	const [, , viewBoxWidth, viewBoxHeight] = viewBox
		.trim()
		.split(/\s+/)
		.map(Number);
	const viewBoxSize = { width: viewBoxWidth, height: viewBoxHeight };

	const liftedAttrs = {};
	for (const [name, value] of Object.entries(svg.attrs)) {
		if (DROPPED_ROOT_ATTRIBUTES.has(name)) {
			continue;
		}
		if (!LIFTED_ROOT_ATTRIBUTES.has(name)) {
			fail(`the root <svg> carries ${name}, which is not on the list`);
		}
		liftedAttrs[name] = value;
	}

	const rulesByClass = readClassRules(svg, fail);
	// Authoring tools repeat ids; only one a reference has to pick between is an error.
	const definedIds = new Set();
	const repeatedIds = new Set();
	for (const element of walkElements(svg)) {
		if (!ALLOWED_ELEMENTS.has(element.tag)) {
			fail(`<${element.tag}> is not on the list`);
		}
		if (element.tag === "defs") {
			const painting = Object.keys(element.attrs).filter(
				(name) => name !== "id",
			);
			if (painting.length > 0) {
				fail(
					`<defs> carries ${painting.join(", ")}, which lifting it out would lose`,
				);
			}
			const foreign = element.children.find(
				(child) => !ALLOWED_DEFS_CHILDREN.has(child.tag),
			);
			if (foreign !== undefined) {
				fail(
					`<defs> holds a <${foreign.tag}>, which lifting it out would draw`,
				);
			}
		}
		element.resolved = resolveAttributes(element, rulesByClass, fail);
		const { id } = element.resolved;
		if (id !== undefined) {
			if (definedIds.has(id)) {
				repeatedIds.add(id);
			}
			definedIds.add(id);
		}
	}

	const droppedClipIds = new Set(
		[...walkElements(svg)]
			.filter(
				(element) =>
					element.tag === "clipPath" && isFullViewBoxClip(element, viewBoxSize),
			)
			.map((element) => element.resolved.id),
	);

	const referencedIds = new Set();
	for (const element of walkElements(svg)) {
		for (const [name, value] of Object.entries(element.resolved)) {
			if (name === "id") {
				continue;
			}
			const referenced = readReferencedIds(name, value);
			if (referenced === null) {
				fail(`<${element.tag}> links outside the asset (href="${value}")`);
			}
			for (const id of referenced) {
				if (!definedIds.has(id)) {
					fail(
						`<${element.tag}> refers to #${id}, which the asset does not define`,
					);
				}
				if (repeatedIds.has(id)) {
					fail(
						`<${element.tag}> refers to #${id}, which the asset defines twice`,
					);
				}
				if (!droppedClipIds.has(id)) {
					referencedIds.add(id);
				}
			}
		}
	}

	const idByOldId = new Map();
	for (const element of walkElements(svg)) {
		const { id } = element.resolved;
		if (id !== undefined && referencedIds.has(id)) {
			idByOldId.set(id, `${idPrefix}-${idByOldId.size}`);
		}
	}

	const rewriteReferences = (name, value) => {
		if (name === "href") {
			return `#${idByOldId.get(value.slice(1))}`;
		}
		return value.replace(
			URL_REFERENCE_PATTERN,
			(_match, id) => `url(#${idByOldId.get(id)})`,
		);
	};

	/** Whether a clipPath that is kept sits anywhere under the element. */
	const holdsKeptClipPath = (element) =>
		[...walkElements(element)].some(
			(descendant) =>
				descendant.tag === "clipPath" &&
				!droppedClipIds.has(descendant.resolved.id),
		);

	const buildNodes = (element, insideClipPath) =>
		element.children.flatMap((child) => {
			if (child.tag === "title" || child.tag === "style") {
				return [];
			}
			if (child.tag === "defs") {
				return buildNodes(child, insideClipPath);
			}
			if (child.tag === "clipPath" && droppedClipIds.has(child.resolved.id)) {
				return [];
			}
			const childInsideClipPath = insideClipPath || child.tag === "clipPath";
			const keepsClipRule = childInsideClipPath || holdsKeptClipPath(child);
			const attrs = {};
			for (const [name, value] of Object.entries(child.resolved)) {
				if (name === "id") {
					if (idByOldId.has(value)) {
						attrs.id = idByOldId.get(value);
					}
					continue;
				}
				if (name === "clip-rule" && !keepsClipRule) {
					continue;
				}
				const referenced = readReferencedIds(name, value) ?? [];
				if (referenced.some((id) => droppedClipIds.has(id))) {
					if (name !== "clip-path") {
						fail(
							`${name} of <${child.tag}> points at a clipPath that is dropped`,
						);
					}
					continue;
				}
				attrs[toReactAttributeName(name)] =
					referenced.length === 0 ? value : rewriteReferences(name, value);
			}
			const children = buildNodes(child, childInsideClipPath);
			if (child.tag === "g" && Object.keys(attrs).length === 0) {
				return children;
			}
			return [
				children.length === 0
					? [child.tag, attrs]
					: [child.tag, attrs, children],
			];
		});

	const drawn = buildNodes(svg, false);
	const liftedNames = Object.keys(liftedAttrs);
	const nodes =
		liftedNames.length === 0
			? drawn
			: [
					[
						"g",
						Object.fromEntries(
							liftedNames.map((name) => [
								toReactAttributeName(name),
								liftedAttrs[name],
							]),
						),
						drawn,
					],
				];
	return { viewBox, nodes, idRefs: [...idByOldId.values()] };
};

/** An object key, bare where it is an identifier (every React attribute name is). */
const formatKey = (key) =>
	/^[A-Za-z_$][\w$]*$/.test(key) ? key : JSON.stringify(key);

const formatNodes = (nodes, indent) => {
	const pad = "\t".repeat(indent);
	return nodes
		.map((node) => {
			const [tag, attrs, children] = node;
			const entries = Object.entries(attrs)
				.map(([name, value]) => `${formatKey(name)}: ${JSON.stringify(value)}`)
				.join(", ");
			const head = `${pad}[${JSON.stringify(tag)}, { ${entries} }`;
			return children === undefined
				? `${head}],`
				: `${head}, [\n${formatNodes(children, indent + 1)}\n${pad}]],`;
		})
		.join("\n");
};

/** The header as `//` comment lines; every line of `header` gets its own. */
const formatHeader = (header) =>
	header
		.split("\n")
		.map((line) => (line === "" ? "//" : `// ${line}`))
		.join("\n");

/**
 * Formats the catalog module: the names, labels, categories and viewBoxes,
 * without a single drawing, so the headless side can load it alone.
 *
 * @param options - `header`: the comment the module opens with (source,
 *   release, terms); `preamble`: TypeScript placed after the imports (the
 *   set's source URL and release constants); `entryType`: `{ name, from }` of
 *   the entry type to import; `entriesName`: the exported constant;
 *   `entries`: `{ name, fields }` in output order, each field written as JSON in
 *   its own order
 * @returns the module source, unformatted
 */
export const formatIconSetCatalogModule = ({
	header,
	preamble,
	entryType,
	entriesName,
	entries,
}) => `${formatHeader(header)}
import type { ${entryType.name} } from ${JSON.stringify(entryType.from)};

${preamble}

/** Every icon, keyed by its canonical name. The drawings are in a module of their own. */
export const ${entriesName}: Readonly<Record<string, ${entryType.name}>> = {
${entries
	.map(({ name, fields }) =>
		[
			`\t${JSON.stringify(name)}: {`,
			...Object.entries(fields).map(
				([field, value]) => `\t\t${field}: ${JSON.stringify(value)},`,
			),
			"\t},",
		].join("\n"),
	)
	.join("\n")}
};
`;

/**
 * Formats the drawing module: every icon's node trees, keyed like the catalog.
 *
 * @param options - `header`: the comment the module opens with (the drawings
 *   are the vendor's work, so the same source and terms as the catalog);
 *   `drawingsName`: the exported constant; `drawings`: `{ name, nodes,
 *   darkNodes?, idRefs? }` in output order, `darkNodes` and an empty `idRefs`
 *   left out of the output
 * @returns the module source, unformatted
 */
export const formatIconSetDrawingsModule = ({
	header,
	drawingsName,
	drawings,
}) => `${formatHeader(header)}
import type { IconSetDrawing } from "@jiscribe/canvas-sdk/doc";

/** Every icon's drawing, keyed by its canonical name (the catalog module's keys). */
export const ${drawingsName}: Readonly<Record<string, IconSetDrawing>> = {
${drawings
	.map(({ name, nodes, darkNodes, idRefs }) =>
		[
			`\t${JSON.stringify(name)}: {`,
			"\t\tnodes: [",
			formatNodes(nodes, 3),
			"\t\t],",
			...(darkNodes === undefined
				? []
				: ["\t\tdarkNodes: [", formatNodes(darkNodes, 3), "\t\t],"]),
			...(idRefs === undefined || idRefs.length === 0
				? []
				: [`\t\tidRefs: ${JSON.stringify(idRefs)},`]),
			"\t},",
		].join("\n"),
	)
	.join("\n")}
};
`;
