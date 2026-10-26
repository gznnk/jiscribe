import {
	isAiDocOp,
	isCanvasHandleTool,
	toDrivesMismatchText,
	toOutcomeText,
	toThrownText,
	type AiCanvasOpOutcome,
	type AiDocOp,
	type CanvasToolArgs,
	type CanvasToolDescriptor,
} from "@jiscribe/ai-tools";
import { DocOperationError } from "@jiscribe/doc";
import type { Diagnostic } from "@jiscribe/doc-tools";
import {
	resolveContentBox,
	diagnoseDoc,
	formatDiagnostics,
	measureWrappedText,
	validateDoc,
} from "@jiscribe/doc-tools";
import {
	DrawingGuideError,
	readDrawingGuide as readDrawingGuideFile,
	type DrawingGuideName,
} from "@jiscribe/doc-tools/guides";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { canvasToolSet } from "./canvasDefinitions";
import {
	CanvasFileError,
	readCanvasFileText,
	CANVAS_FILE_EXTENSIONS,
} from "./canvasStore";
import type { CanvasHost } from "./host/canvasHost";
import { CanvasHostError } from "./host/canvasHostError";
import { createJiscribeMcpRuntime, type JiscribeMcpRuntime } from "./runtime";

export {
	createJiscribeMcpRuntime,
	type JiscribeMcpRuntime,
	type JiscribeMcpRuntimeOptions,
} from "./runtime";
export { listenOnAvailablePort } from "./host/listenOnAvailablePort";
export { FLUSH_EDITS_TIMEOUT_MS } from "./host/canvasHost";
export { VIEWER_CLOSE_TIMEOUT_MS } from "./host/viewerRegistry";
export { CANVAS_FILE_EXTENSIONS } from "./canvasStore";
export type { BrowserOpenOptions } from "./host/openBrowser";

/**
 * The tool definitions of the Jiscribe MCP server. Starting it over stdio is
 * `./index`'s job.
 *
 * The tools it exposes, 85 in all, come in four groups.
 *
 * 1. The ones this server has of its own (written out directly below)
 *    - `read_drawing_guide`: hands back one of the two guides `@jiscribe/doc-schema`
 *      generates. The tool declarations say what each tool does but not what the
 *      canvas is or how to draw well, and `instructions` is too small to hold it
 *    - `open_canvas`: starts a viewer locally and opens it in a browser. From
 *      then on the same file is where the AI rewriting it and a person correcting
 *      it on screen work together. With `headless` it opens a window-less browser
 *      instead, so the AI gets its eye without anything appearing on screen
 *    - `close_canvas`: closes that window and folds the server up too. A person
 *      closing the window ends up in the same place (the host is folded up once
 *      the last window is gone and none has come back within the grace period)
 *    - `diagnose_canvas`: validation, plus diagnosis of drawing problems such
 *      as overflow
 *    - `measure_text`: without holding a diagram, measures whether a string fits
 *      a shape of a given size
 *    - `add_rect` / `add_ellipse`: entry points giving default sizes to the two
 *      most frequently used shapes
 * 2. The ones `@jiscribe/ai-tools` declares that a document alone can answer
 *    (`registerDocTools`). Adding, moving, aligning, grouping, style, the colour
 *    of the canvas surface, declaring the view, naming the document or an object,
 *    reading, undo and so on.
 *    The declarations are written assuming "the document
 *    currently open", so a `path` that picks the target is added to read them as
 *    file operations
 * 3. The ones from ai-tools that need a mounted canvas (`registerHandleTools`).
 *    Capture, camera, selection, measurement. Running them becomes a round trip
 *    to the viewer open_canvas started, made once the file calls that arrived
 *    ahead of it have landed and the viewer has drawn what they wrote
 * 4. The ones the standard set's plugins offer for their own shapes
 *    (`standardAiToolPlugins`, through `canvasToolSet`): the table's eight
 *    `table_*` tools, the record's `record_set_compartments` and the ER entity's
 *    six `er_entity_*` tools so far. Each acts on the one object its `id` names and needs
 *    only a document, so they go through `registerDocTools` with group 2 and get
 *    a `path` the same way
 *
 * A name collision between 1 and 2, 3 or 4 makes the later registration win and one
 * of them silently disappear, so registration goes through `registerName`, which
 * throws at startup.
 *
 * Every argument schema is closed with `.strict()`. zod drops unknown keys
 * silently by default, so a call trying to place an ellipse with `cx` / `rx`
 * would succeed as a default-sized shape at the origin.
 * `additionalProperties: false` shows up in the JSON Schema too, so the AI can
 * read it before calling.
 *
 * The set of shapes handled is decided in one place, `./canvasDefinitions`
 * (built-ins plus plugins).
 */

// The tools' default dimensions. addObject falls through to the factory defaults
// (rect 100x100 and so on), so they are stated explicitly at the boundary to keep
// the tool behaviour as it has been. add_ellipse keeps its center-based
// (cx/cy/rx/ry) input and converts it to addObject's top-left basis.
const DEFAULT_RECT_WIDTH = 160;
const DEFAULT_RECT_HEIGHT = 80;
const DEFAULT_ELLIPSE_RX = 80;
const DEFAULT_ELLIPSE_RY = 50;

/**
 * The font stack a document with no font specified is drawn in (the same sans as
 * the canvas). measure_text holds no document, so there is nothing to do but
 * write it out here.
 */
const DEFAULT_FONT_FAMILY = '"Source Sans 3", "Noto Sans JP", sans-serif';

const pathArg = z.string().describe("Absolute path to the target .jis file.");

/**
 * What the server tells a client about itself at handshake time. It stays in the
 * model's context for the whole session, so it holds only what is true of this
 * server as an MCP server — how the tools are addressed and what has to happen
 * before which. The canvas itself, the shapes and the file format are what
 * `read_drawing_guide` fetches on demand.
 */
const SERVER_INSTRUCTIONS = [
	"Jiscribe draws diagrams as .jis files. The file on disk is the single source of truth: no canvas state is kept in the tools, so anything not written to a file does not exist.",
	`Every document tool takes an absolute \`path\` naming the file it acts on, and the file has to be a canvas file: ${CANVAS_FILE_EXTENSIONS.join(", ")}. There is no concept of a currently open document, and a tool that only reads does not write the file back.`,
	"An image shape is the one path that is not absolute: its `src` is read relative to the .jis file's own directory and cannot leave it, so the image file has to be somewhere under the diagram's own directory before you point at it.",
	"`open_canvas` puts a file in a viewer: a window the user watches and can edit by hand, or a window-less one with `headless: true`. The 16 tools for capture, camera, selection and on-screen measurement have nothing to work with until a viewer is connected, so call it first; everything else works without one.",
	"`diagnose_canvas` is the only validation entry point. Give it a path and it reports what would stop the file from opening, what the parser would drop from it on the next save, and text that does not fit; run it before telling the user a diagram is finished.",
	"`undo` steps back through edits you made and keeps its history per file, so it cannot take back what a person changed in the viewer.",
	"Call `read_drawing_guide` before you start drawing: `drawing` is what the canvas can hold and how to draw on it well, and `json-format` is for when you have decided to edit a .jis file directly instead of through these tools.",
].join("\n\n");

export type JiscribeMcpServerOptions = {
	/**
	 * The host, locks and undo history the server's tools act through. Omitted,
	 * the server makes one of its own and folds its host up when the client goes;
	 * one passed in is left running then, being its owner's to close
	 */
	runtime?: JiscribeMcpRuntime;
};

/**
 * Build an MCP server with the tools registered.
 *
 * Returns a new instance per call. An McpServer can bind only one transport, so a
 * different connection needs a different instance.
 *
 * @param options Pass one `runtime` to every server that should share a host,
 *   such as one server per HTTP session
 */
export function createJiscribeMcpServer(
	options: JiscribeMcpServerOptions = {},
): McpServer {
	const server = new McpServer(
		{
			name: "jiscribe",
			version: "0.12.2",
		},
		{ instructions: SERVER_INSTRUCTIONS },
	);

	const runtime = options.runtime ?? createJiscribeMcpRuntime();
	if (options.runtime === undefined) {
		// The client going away has to take the host with it. The HTTP server keeps
		// the event loop from ever emptying, so a headless window left connected
		// would hold the whole process open after the last client has gone
		server.server.onclose = () => {
			runtime.close().catch((error: unknown) => {
				// stdout carries the MCP protocol, so nothing but stderr can be written to
				console.error("failed to fold up the canvas host on close:", error);
			});
		};
	}

	// Check at startup that the built-in tools and the ai-tools ones do not collide
	// by name. Registering the same name twice makes the later one win and one of
	// them silently disappear, so it is thrown before it gets through
	const registeredNames = new Set<string>();
	const registerName = (name: string): string => {
		if (registeredNames.has(name)) {
			throw new Error(`duplicate MCP tool name: ${name}`);
		}
		registeredNames.add(name);
		return name;
	};

	server.registerTool(
		registerName("read_drawing_guide"),
		{
			description: [
				"Read one of the two Jiscribe guides: the background the tool list cannot carry.",
				'"drawing" is what a canvas can hold, what each shape type is for, and how to draw well with it. Read it once before you start drawing, whichever tools you then use.',
				'"json-format" is the structure of a .jis file. Read it only once you have decided to read or write such a file directly with your own file tools instead of the tools here.',
				"Neither changes while this session runs, so read one once and work from what you read rather than calling again.",
				"Both open with a `<!-- jiscribe guide <version>+<digest> -->` stamp naming the generation they came from. A workspace may also hold a .jiscribe/ai-guide.md placed there by the Jiscribe editor extension, stamped the same way; when the two stamps differ, the higher version is the newer text, and the one you read here is the generation these tools belong to.",
			].join(" "),
			inputSchema: z
				.object({
					guide: z
						.enum(["drawing", "json-format"])
						.describe(
							'Which guide to read: "drawing" for the canvas, its shapes and how to draw on it; "json-format" for the .jis file format.',
						),
				})
				.strict(),
		},
		async ({ guide }) => runTool(async () => readDrawingGuide(guide)),
	);

	server.registerTool(
		registerName("open_canvas"),
		{
			description: [
				"Open a .jis file in a canvas viewer: starts a local web server inside this MCP process and opens the file in a browser window.",
				"The file stays the single source of truth. The editing tools below write to it and the viewer follows within a moment; when a person moves or retypes shapes in the viewer, it writes the file back, so reading the file again shows what they changed.",
				"A file that does not exist yet is created as an empty canvas, which is how a new diagram is started.",
				"Calling it again switches the viewer to another file. Naming a file outside the directory currently being served restarts the server on that file's directory, and the open viewer reconnects on its own.",
				"Returns the viewer URL, which is worth passing on to the user.",
			].join(" "),
			inputSchema: z
				.object({
					path: pathArg,
					headless: z
						.boolean()
						.default(false)
						.describe(
							"Open a headless viewer instead: nothing appears on the user's screen, and the canvas exists only for the tools that need one on screen (capture, camera, selection, measurement). Use it to check your own work; leave it false when the user is meant to watch or edit the diagram. A viewer already open is used as it is, headless or not.",
						),
				})
				.strict(),
		},
		async ({ path, headless }) =>
			runTool(() => runtime.openCanvas(path, { headless })),
	);

	server.registerTool(
		registerName("close_canvas"),
		{
			description: [
				"Close the canvas viewer window and stop the local web server that open_canvas started.",
				"Use it when the diagram is finished and the window is in the way; the .jis file is untouched and open_canvas brings it back.",
				"A window the browser refuses to close is reported as still open, and the server is left running for it.",
			].join(" "),
			inputSchema: z.object({}).strict(),
		},
		async () => runTool(() => runtime.closeCanvas()),
	);

	server.registerTool(
		registerName("diagnose_canvas"),
		{
			description: [
				"Check an existing .jis file: validation with the canvas parser plus a diagnosis of whether each shape's text actually fits inside it.",
				"Names the file by path, so a large diagram never has to be sent through the conversation; this is the only validation entry point, and it reports JSON syntax errors too.",
				"Overflow is only diagnosed when the file itself validates, since a shape with an invalid size has no meaningful content box.",
				"Returns one line per finding, or valid: true when there is nothing to report.",
			].join(" "),
			inputSchema: z.object({ path: pathArg }).strict(),
		},
		async ({ path }) =>
			runTool(async () => {
				const text = await runtime.withCanvasFileLock(path, readCanvasFileText);
				const result = validateDoc(text);
				const diagnostics: Diagnostic[] = [...result.diagnostics];
				if (result.ok && result.doc !== undefined) {
					diagnostics.push(...diagnoseDoc(result.doc));
				}
				return formatDiagnostics(diagnostics);
			}),
	);

	server.registerTool(
		registerName("measure_text"),
		{
			description: [
				"Measure how a single string lays out inside a shape of a given size, without a document to put it in.",
				"width / height are the shape's own bounding box, the same numbers a document holds; the content box is what the outline and the shared text padding leave of them.",
				"height may be omitted only for rect, whose content width follows from its width alone, and for types that draw their label outside their box.",
				"Returns the line count, the box the wrapped lines take, the content box, and whether the text fits.",
				"Use this before sizing a shape, so a label is not written into a box too small for it.",
			].join(" "),
			inputSchema: z
				.object({
					text: z.string().describe("The text to lay out, newlines included."),
					fontSize: z.number().positive().describe("Font size in px."),
					shape: z
						.string()
						.default("rect")
						.describe(
							"Object type to measure against (rect, stadium, card, ...). A type that draws its label outside its outline is measured without a fit verdict, since its box does not constrain the text.",
						),
					width: z.number().positive().describe("Shape width in px."),
					height: z
						.number()
						.positive()
						.optional()
						.describe("Shape height in px (required for every type but rect)."),
					bold: z
						.boolean()
						.default(false)
						.describe("Whether the text is bold."),
				})
				.strict(),
		},
		async (params) => textResult(measureTextInShape(params)),
	);

	server.registerTool(
		registerName("add_rect"),
		{
			description:
				"Add a rectangle to a .jis file (read → modify → validate → write). Returns the new object id.",
			inputSchema: z
				.object({
					path: pathArg,
					x: z.number().describe("Top-left x in px."),
					y: z.number().describe("Top-left y in px."),
					width: z
						.number()
						.min(0)
						.optional()
						.describe(`Width in px (default ${DEFAULT_RECT_WIDTH}).`),
					height: z
						.number()
						.min(0)
						.optional()
						.describe(`Height in px (default ${DEFAULT_RECT_HEIGHT}).`),
					text: z
						.string()
						.optional()
						.describe("Label text inside the rectangle."),
				})
				.strict(),
		},
		async ({ path, ...params }) =>
			runTool(async () => {
				// Fill in the tool's own defaults at the boundary, rather than falling
				// through to addObject's factory defaults.
				const outcome = await runtime.applyDocOpToFile(path, {
					kind: "addObject",
					type: "rect",
					x: params.x,
					y: params.y,
					width: params.width ?? DEFAULT_RECT_WIDTH,
					height: params.height ?? DEFAULT_RECT_HEIGHT,
					...(params.text !== undefined ? { text: params.text } : {}),
				});
				return toOutcomeText(outcome);
			}),
	);

	server.registerTool(
		registerName("add_ellipse"),
		{
			description:
				"Add an ellipse to a .jis file (read → modify → validate → write). Returns the new object id.",
			inputSchema: z
				.object({
					path: pathArg,
					cx: z.number().describe("Center x in px."),
					cy: z.number().describe("Center y in px."),
					rx: z
						.number()
						.min(0)
						.optional()
						.describe(`X radius in px (default ${DEFAULT_ELLIPSE_RX}).`),
					ry: z
						.number()
						.min(0)
						.optional()
						.describe(`Y radius in px (default ${DEFAULT_ELLIPSE_RY}).`),
					text: z
						.string()
						.optional()
						.describe("Label text inside the ellipse."),
				})
				.strict(),
		},
		async ({ path, ...params }) =>
			runTool(async () => {
				const rx = params.rx ?? DEFAULT_ELLIPSE_RX;
				const ry = params.ry ?? DEFAULT_ELLIPSE_RY;
				const outcome = await runtime.applyDocOpToFile(path, {
					kind: "addObject",
					type: "ellipse",
					x: params.cx - rx,
					y: params.cy - ry,
					width: rx * 2,
					height: ry * 2,
					...(params.text !== undefined ? { text: params.text } : {}),
				});
				// ai-tools reports the top-left the document holds; the tool took a
				// center, so it is named as well or the AI reads the reply as a misplacement
				return outcome.ok
					? `${outcome.text}, center (${params.cx}, ${params.cy})`
					: toOutcomeText(outcome);
			}),
	);

	// The declarations are read twice, once for each group; applying resolves the
	// plugin tools through the same set
	registerDocTools(
		server,
		registerName,
		canvasToolSet.descriptors,
		runtime.applyDocOpToFile,
	);
	registerHandleTools(
		server,
		registerName,
		canvasToolSet.descriptors,
		runtime.getHost,
		runtime.waitForEarlierCalls,
	);

	return server;
}

/**
 * Register the tools ai-tools declares that a document alone can answer.
 *
 * The declaring side is written assuming "the document currently open", so a
 * `path` that picks the target is added to read them as operations on a file. A
 * declaration that has a `path` of its own (a plugin tool can) is refused at
 * startup rather than having its argument silently replaced.
 *
 * @param server Where the tools are registered
 * @param registerName The registration entry that rejects duplicate names
 * @param descriptors Every declaration ai-tools offers; the ones needing the
 *   screen are skipped here and picked up by registerHandleTools
 * @param applyToFile What actually applies one operation to one file
 */
function registerDocTools(
	server: McpServer,
	registerName: (name: string) => string,
	descriptors: readonly CanvasToolDescriptor[],
	applyToFile: (filePath: string, op: AiDocOp) => Promise<AiCanvasOpOutcome>,
): void {
	for (const descriptor of descriptors) {
		if (isCanvasHandleTool(descriptor)) {
			continue;
		}
		if (Object.hasOwn(descriptor.inputSchema, "path")) {
			throw new Error(
				`tool ${descriptor.name} declares "path", which this server adds to name the file`,
			);
		}
		server.registerTool(
			registerName(descriptor.name),
			{
				description: descriptor.description,
				inputSchema: z
					.object({ path: pathArg, ...descriptor.inputSchema })
					.strict(),
			},
			async ({ path, ...args }: CanvasToolArgs & { path: string }) =>
				runTool(async () => {
					const op = descriptor.toOp(args);
					if (!isAiDocOp(op)) {
						// Only happens when the `drives` declaration and where toOp goes
						// disagree
						return toDrivesMismatchText(descriptor);
					}
					return toOutcomeText(await applyToFile(path, op));
				}),
		);
	}
}

/**
 * `measure_text` collides by name between the built-in one (measuring from
 * dimensions alone, before anything is placed in a diagram) and the ai-tools one
 * (measuring a slot drawn on screen). They are different things, so the one that
 * comes in later is renamed and both are kept.
 */
const HANDLE_TOOL_RENAMES: Readonly<Record<string, string>> = {
	measure_text: "measure_rendered_text",
};

/**
 * A sentence added to every tool that needs the screen. The declarations are
 * written assuming "the document currently open" and never mention where the
 * target lives, so the difference in address — document operations pick a file
 * with `path`, while these look only at the one canvas on screen — cannot be read
 * off the tool list
 */
const HANDLE_TOOL_SCOPE_NOTE =
	"This acts on the canvas open in the viewer rather than on a file, which is why it takes no path: call open_canvas first, and note that the editing tools write to the path they are given, not to whatever is on screen.";

/** Adds a sentence to a renamed tool making clear which of the two to use */
const HANDLE_TOOL_DESCRIPTION_NOTES: Readonly<Record<string, string>> = {
	measure_text:
		"To size a shape before putting it in the document, use measure_text instead.",
};

/**
 * Register the tools ai-tools declares that need a mounted canvas.
 *
 * The argument schema is the declaration as it stands, and the description gains
 * a sentence saying the target is the screen. Only running them is swapped for a
 * round trip to the viewer.
 * The targets are the ones whose `drives` names a canvas handle (a declaration,
 * so it is known without building the arguments).
 *
 * @param server The server to register on
 * @param registerName The registration entry that rejects duplicate names
 * @param descriptors Every declaration ai-tools offers; the ones a document
 *   alone can answer are skipped here and picked up by registerDocTools
 * @param getHost The current host. null when called before open_canvas. Read
 *   only once the calls ahead have settled, so an open_canvas sent just before
 *   is the host asked
 * @param waitForEarlierCalls Waits out the calls that arrived before the one
 *   being answered. Called before the handler's first await, which is what
 *   makes "before" the order the MCP SDK hands the calls over in
 */
function registerHandleTools(
	server: McpServer,
	registerName: (name: string) => string,
	descriptors: readonly CanvasToolDescriptor[],
	getHost: () => CanvasHost | null,
	waitForEarlierCalls: () => Promise<void>,
): void {
	for (const descriptor of descriptors) {
		if (!isCanvasHandleTool(descriptor)) {
			continue;
		}
		const note = HANDLE_TOOL_DESCRIPTION_NOTES[descriptor.name];
		server.registerTool(
			registerName(HANDLE_TOOL_RENAMES[descriptor.name] ?? descriptor.name),
			{
				description:
					note === undefined
						? `${descriptor.description} ${HANDLE_TOOL_SCOPE_NOTE}`
						: `${descriptor.description} ${HANDLE_TOOL_SCOPE_NOTE} ${note}`,
				inputSchema: z.object(descriptor.inputSchema).strict(),
			},
			async (args: CanvasToolArgs) => {
				// The viewer draws the file as it was last sent, so a write sent ahead
				// of this call has to have landed before the viewer is asked
				await waitForEarlierCalls();
				const host = getHost();
				if (host === null) {
					return textResult(
						"error: no canvas is open, so there is nothing on screen to capture, move, select, or measure; call open_canvas first",
					);
				}
				const op = descriptor.toOp(args);
				if (isAiDocOp(op)) {
					// Only happens when the `drives` declaration and where toOp goes
					// disagree
					return textResult(toDrivesMismatchText(descriptor));
				}
				const outcome = await host.runHandleOp(op);
				if (outcome.imagePngBase64 !== undefined) {
					return {
						content: [
							{
								type: "image" as const,
								data: outcome.imagePngBase64,
								mimeType: "image/png",
							},
							{ type: "text" as const, text: outcome.text },
						],
					};
				}
				return textResult(toOutcomeText(outcome));
			},
		);
	}
}

/**
 * Round a displayed figure to 0.1px. A difference below a px is nothing the AI
 * can act on.
 */
function round(value: number): number {
	return Math.round(value * 10) / 10;
}

/**
 * Read one guide off disk (see readDrawingGuide in @jiscribe/doc-tools/guides,
 * whose files `build.mjs` stages beside `dist/index.mjs`).
 *
 * @param guide Which of the two guides to read; the tool's enum names the same
 *   keys, so an unknown one cannot reach here
 * @throws CanvasFileError when the guide cannot be resolved, read, or is empty
 */
function readDrawingGuide(guide: DrawingGuideName): string {
	try {
		return readDrawingGuideFile(guide);
	} catch (error) {
		// runTool shows a CanvasFileError's message as it is
		if (error instanceof DrawingGuideError) {
			throw new CanvasFileError(error.message);
		}
		throw error;
	}
}

/**
 * Measure the result of pouring one string into a shape of a given type and size.
 * Same semantics as the CLI's `jiscribe measure` (width / height are the shape's
 * own outline, the verdict is made against the content box, and with no height
 * given the height is not judged). The wording is kept in line with the CLI too
 * (engine/apps/cli/src/measureCommand.ts): a type that draws outside its box is
 * only measured and gets no fit verdict, and a type outside the shipped set comes
 * back as an error.
 */
function measureTextInShape(params: {
	text: string;
	fontSize: number;
	shape: string;
	width: number;
	height?: number;
	bold: boolean;
}): string {
	const { text, fontSize, shape, width, height, bold } = params;
	const resolution = resolveContentBox({
		type: shape,
		width,
		height: height ?? 0,
	});
	if (resolution.kind === "unknown") {
		return `error: unknown shape type "${shape}" (not in the standard set)`;
	}

	const font = {
		fontSize,
		fontFamily: DEFAULT_FONT_FAMILY,
		fontWeight: bold ? "bold" : "normal",
	};

	// The box does not constrain the text, so it is measured as it is without
	// wrapping (the shape as it is drawn at its automatic size).
	if (resolution.kind === "outside") {
		const metrics = measureWrappedText(text, font);
		return [
			`shape ${shape} ${width}x${height ?? "-"}`,
			`lines ${metrics.lines}`,
			`text ${round(metrics.width)}x${round(metrics.height)}`,
			`note: shape ${shape} draws its label outside the box; the box size does not constrain the text`,
		].join("\n");
	}

	// Every outline but rect is eaten into from top and bottom as well, so without a
	// height this would measure a box nobody specified. rect alone allows omitting
	// it, since its height does not bear on the content width.
	if (shape !== "rect" && height === undefined) {
		return `error: height is required for shape ${shape}`;
	}

	const box = resolution.rect;
	const metrics = measureWrappedText(text, font, box.width);
	// The wrap width is only exceeded when a single character is wider than the box.
	// A rounding difference of 0.5px is tolerated.
	const fits =
		metrics.width <= box.width + 0.5 &&
		(height === undefined || metrics.height <= box.height);

	return [
		`shape ${shape} ${width}x${height ?? "-"}`,
		`lines ${metrics.lines}`,
		`text ${round(metrics.width)}x${round(metrics.height)}`,
		`content ${round(box.width)}x${height === undefined ? "-" : round(box.height)}`,
		`fits ${fits ? "yes" : "no"}`,
	].join("\n");
}

/** What a tool can return: text, and the PNG a capture returns */
type ToolContent =
	| { type: "text"; text: string }
	| { type: "image"; data: string; mimeType: string };

/** One tool call's reply */
type ToolReply = { content: ToolContent[] };

/** Build an MCP tool's return value (a single piece of text). */
function textResult(text: string): ToolReply {
	return { content: [{ type: "text", text }] };
}

/**
 * The shared path that runs a tool body and reduces an exception to text that can
 * be returned to the AI.
 *
 * CanvasFileError, CanvasHostError and DocOperationError are returned as they are
 * as user-facing messages; anything else is formatted as an internal error.
 */
async function runTool(handler: () => Promise<string>): Promise<ToolReply> {
	try {
		return textResult(await handler());
	} catch (error) {
		return textResult(toThrownText(error, isUserFacingError));
	}
}

/** The errors whose message runTool shows as the user's, after `error:`. */
function isUserFacingError(error: unknown): error is Error {
	return (
		error instanceof CanvasFileError ||
		error instanceof CanvasHostError ||
		error instanceof DocOperationError
	);
}
