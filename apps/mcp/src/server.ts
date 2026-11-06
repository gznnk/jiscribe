import { realpath } from "node:fs/promises";
import path from "node:path";

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
import type { Diagnostic, MeasuredSourceText } from "@jiscribe/doc-tools";
import {
	resolveContentBox,
	diagnoseDoc,
	formatDiagnostics,
	formatSourceTextMeasureNote,
	listSourceTextObjects,
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
	diagnoseImageSources,
	readCanvasFileText,
	writeFileAtomically,
	CANVAS_FILE_EXTENSIONS,
} from "./canvasStore";
import {
	isCanvasImageName,
	readExportImageFormat,
	resolveExportImageOutputPath,
} from "./exportImageOutput";
import type { CanvasHost } from "./host/canvasHost";
import { CanvasHostError } from "./host/canvasHostError";
import { calcDocRevision } from "./host/docRevision";
import { resolveWorkspacePathReal } from "./host/workspacePaths";
import { createJiscribeMcpRuntime, type JiscribeMcpRuntime } from "./runtime";
import {
	DRAWN_REVISION_WAIT_MS,
	MAX_EXPORT_PIXEL_SIZE,
	type ExportImageOp,
} from "./shared/canvasHostProtocol";

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
 * The tools it exposes, 76 in all, come in four groups.
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
 *    - `add_ellipses`: places ellipses by centre and radii, the form an ellipse is
 *      thought of in, where add_objects takes every shape by its top-left
 *    - `export_image`: has the viewer draw the canvas on display to a PNG or SVG
 *      and writes it to a file under the workspace, for a person rather than the
 *      AI (which looks through capture_canvas). Run as group 3's round trip,
 *      under a longer timeout
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

// add_ellipses' radii when an entry gives none. Stated here rather than left to
// the ellipse factory's default box, so the argument descriptions can name them.
const DEFAULT_ELLIPSE_RX = 80;
const DEFAULT_ELLIPSE_RY = 50;

/**
 * The font stack a document with no font specified is drawn in (the same sans as
 * the canvas). measure_text holds no document, so there is nothing to do but
 * write it out here.
 */
const DEFAULT_FONT_FAMILY = '"Source Sans 3", "Noto Sans JP", sans-serif';

const pathArg = z.string().describe("Absolute path to the target .jis file.");

/** export_image's PNG scale when none is given, and the most it takes */
const DEFAULT_EXPORT_SCALE = 2;
const MAX_EXPORT_SCALE = 8;

/**
 * How long export_image waits for the viewer. A PNG at a high scale takes far
 * longer to draw and encode than a capture_canvas picture does
 */
const EXPORT_IMAGE_TIMEOUT_MS = 60_000;

/**
 * Room diagnose_canvas leaves past the viewer's drawn-revision hold for the
 * measurement itself: the off-screen layout and, while faces are still
 * loading, the wait for them and a second layout
 */
const DIAGNOSE_MEASURE_OP_MARGIN_MS = 3_000;

/**
 * How long diagnose_canvas waits for the viewer to measure one markdown body:
 * the viewer's hold for a person's drag, plus the margin for the op.
 * Shorter than the 15 s default, since the measurements run one per card
 */
const DIAGNOSE_MEASURE_TIMEOUT_MS =
	DRAWN_REVISION_WAIT_MS + DIAGNOSE_MEASURE_OP_MARGIN_MS;

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
	"`open_canvas` puts a file in a viewer: a window the user watches and can edit by hand, or a window-less one with `headless: true`. The tools for capture, image export, camera, selection and on-screen measurement have nothing to work with until a viewer is connected, so call it first; everything else works without one. When the user may be editing in the viewer, read `get_interaction_status` before you edit.",
	"`diagnose_canvas` is the only validation entry point. Give it a path and it reports what is wrong with the file, from what would stop it opening to what a reader cannot see; run it before telling the user a diagram is finished.",
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
				"Read one of the two Jiscribe guides, the background the tool list cannot carry.",
				'"drawing" is what the canvas holds, what each shape type is for and how to draw well: read it before you start drawing. "json-format" is the .jis file structure, only for reading or writing a file with your own file tools.',
				"Neither changes during a session, so read one once.",
				"Each opens with a `<!-- jiscribe guide <version>+<digest> -->` stamp. A workspace's .jiscribe/ai-guide.md from the Jiscribe editor extension is stamped the same way: the higher version is the newer text, and the one here is the generation these tools belong to.",
			].join(" "),
			inputSchema: z
				.object({
					guide: z
						.enum(["drawing", "json-format"])
						.describe(
							'"drawing" for the canvas and its shapes; "json-format" for the .jis file format.',
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
				"Open a .jis file in a browser viewer served from a local web server in this process.",
				"The editing tools write the file and the viewer follows within a moment; a person's edits in the viewer are written back to the file. A missing file is created as an empty canvas.",
				"Calling it again switches the viewer to another file; one outside the directory being served restarts the server there, and the viewer reconnects on its own.",
				"Returns the viewer URL, worth passing on to the user.",
			].join(" "),
			inputSchema: z
				.object({
					path: pathArg,
					headless: z
						.boolean()
						.default(false)
						.describe(
							"Open a window-less viewer, for the screen tools to check your own work; leave false when the user is meant to watch or edit. A viewer already open is used as it is, headless or not.",
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
				"Close the canvas viewer window and stop the server open_canvas started; the .jis file is untouched.",
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
				"Check an existing .jis file: validation with the canvas parser (JSON syntax included), then, once it validates, whether each shape's text fits and what a reader cannot see, such as an image whose file is missing.",
				"A markdown card is measured only while this file is open in the viewer drawing the same text as the file (unsaved edits there included); otherwise it is reported as not checked.",
				"Returns one line per finding, or valid: true when there is nothing to report.",
			].join(" "),
			inputSchema: z.object({ path: pathArg }).strict(),
		},
		async ({ path }) =>
			runTool(async () => {
				const { filePath, text } = await runtime.withCanvasFileLock(
					path,
					async (filePath) => ({
						filePath,
						text: await readCanvasFileText(filePath),
					}),
				);
				const result = validateDoc(text);
				const diagnostics: Diagnostic[] = [...result.diagnostics];
				if (result.ok && result.doc !== undefined) {
					// Asked only now, outside the lock and outside the call the barrier
					// tracks: the viewer's round trip re-reads the file under the same
					// lock, and a screen op waiting on the barrier would wait on this call
					const measuredSourceText = await measureSourceTextOnViewer(
						runtime.getHost(),
						filePath,
						text,
						listSourceTextObjects(result.doc).map(({ id }) => id),
					);
					diagnostics.push(...diagnoseDoc(result.doc, { measuredSourceText }));
					// The image files are not the lock's to guard, so they are read
					// after it is released.
					diagnostics.push(
						...(await diagnoseImageSources(result.doc, filePath)),
					);
				}
				return formatDiagnostics(diagnostics);
			}),
	);

	server.registerTool(
		registerName("measure_text"),
		{
			description: [
				"Measure how a single string lays out inside a shape of a given size, without a document.",
				"width / height are the shape's bounding box, as a document holds it; the content box is what the outline and the text padding leave. height may be omitted only for rect and for types that draw their label outside their box.",
				"Returns the line count, the wrapped lines' box, the content box and whether the text fits. For a markdown card the numbers are a plain-text lower bound with no verdict; measure_rendered_text measures it as drawn.",
			].join(" "),
			inputSchema: z
				.object({
					text: z.string().describe("The text to lay out, newlines included."),
					fontSize: z.number().positive().describe("Font size in px."),
					shape: z
						.string()
						.default("rect")
						.describe(
							"Object type to measure against (rect, stadium, card, …); one drawing its label outside its outline gets no fit verdict.",
						),
					width: z.number().positive().describe("Shape width in px."),
					height: z
						.number()
						.positive()
						.optional()
						.describe("Shape height in px."),
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
		registerName("add_ellipses"),
		{
			description: [
				"Add ellipses to a .jis file by centre and radii, one or many per call; add_objects takes an ellipse's bounding box instead.",
				"Each entry becomes x = cx - rx, y = cy - ry, width 2 rx, height 2 ry, all in one write that one undo takes back.",
				"All or nothing. Returns the new ids in order, each with its centre.",
			].join(" "),
			inputSchema: z
				.object({
					path: pathArg,
					entries: z
						.array(
							z
								.object({
									cx: z.number().describe("Center x in px."),
									cy: z.number().describe("Center y in px."),
									rx: z
										.number()
										.min(0)
										.optional()
										.describe(
											`X radius in px (default ${DEFAULT_ELLIPSE_RX}).`,
										),
									ry: z
										.number()
										.min(0)
										.optional()
										.describe(
											`Y radius in px (default ${DEFAULT_ELLIPSE_RY}).`,
										),
									text: z
										.string()
										.optional()
										.describe("Label text inside the ellipse."),
								})
								.strict(),
						)
						.min(1)
						.describe("The ellipses to add, in creation order."),
				})
				.strict(),
		},
		async ({ path, entries }) =>
			runTool(async () => {
				const outcome = await runtime.applyDocOpToFile(path, {
					kind: "addObjects",
					objects: entries.map((entry) => {
						const rx = entry.rx ?? DEFAULT_ELLIPSE_RX;
						const ry = entry.ry ?? DEFAULT_ELLIPSE_RY;
						return {
							type: "ellipse",
							x: entry.cx - rx,
							y: entry.cy - ry,
							width: rx * 2,
							height: ry * 2,
							...(entry.text !== undefined ? { text: entry.text } : {}),
						};
					}),
				});
				if (!outcome.ok || outcome.createdIds === undefined) {
					return toOutcomeText(outcome);
				}
				// addObjects' own sentence names no position; the tool took centres, so
				// those are what the reply names, or the AI reads it as a misplacement
				const added = outcome.createdIds
					.map(
						(id, index) =>
							`"${id}" centred at (${entries[index].cx}, ${entries[index].cy})`,
					)
					.join(", ");
				return `added ${outcome.createdIds.length} ellipse(s): ${added}`;
			}),
	);

	server.registerTool(
		registerName("export_image"),
		{
			description: [
				"Write the canvas on display in the viewer to an image file for a person: a PNG at the scale asked for, or an SVG.",
				"Only its path and size come back; capture_canvas is for looking yourself.",
				"No ids is the whole drawing fitted to its content; ids take those objects' extent with the document's margin. The .jis source is not embedded, so it does not reopen as a diagram.",
				"It acts on the canvas in the viewer, not on a path: call open_canvas first (headless: true opens no window).",
			].join(" "),
			inputSchema: z
				.object({
					output: z
						.string()
						.describe(
							"Absolute path ending in .png or .svg (either case), which decides the format, in an existing directory under the one holding the .jis on display. A file there is replaced, but a .jis.png / .jis.svg is refused.",
						),
					scale: z
						.number()
						.positive()
						.max(MAX_EXPORT_SCALE)
						.optional()
						.describe(
							`PNG only (an error with .svg): pixels per world unit, default ${DEFAULT_EXPORT_SCALE}. Past ${MAX_EXPORT_PIXEL_SIZE} px on the long edge the image is scaled down, and the result says so.`,
						),
					ids: z
						.array(z.string())
						.min(1)
						.optional()
						.describe(
							"Objects to export, as the union of what they draw; omit for the whole drawing.",
						),
					isolate: z
						.boolean()
						.optional()
						.describe(
							"With ids only (an error without). true draws just the objects named, their descendants and the connectors whose attached ends are all on them; the default false crops, keeping whatever else is drawn there.",
						),
				})
				.strict(),
		},
		async (args) => {
			// Called before the first await, as every screen tool does (see
			// registerHandleTools)
			const earlierCalls = runtime.waitForEarlierCalls();
			return runTool(async () => {
				await earlierCalls;
				return await exportImageToFile(runtime.getHost(), args);
			});
		},
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
	"It acts on the canvas open in the viewer, so it takes no path: call open_canvas first.";

/**
 * What this server adds to one screen tool's description: which of the two
 * measure tools to use, and how the viewer's sync loosens get_interaction_status's
 * wait (useDocSync.ts, mergeCanvasDocs.ts)
 */
const HANDLE_TOOL_DESCRIPTION_NOTES: Readonly<Record<string, string>> = {
	measure_text:
		"To size a shape before it is in a document, use measure_text instead.",
	get_interaction_status: [
		"On this server file edits do not wait for the user: a file arriving mid-edit is held by the viewer and merged object by object once they let go, the file winning where both changed the same object (even different properties of it) and the user's change to it dropped with a notice.",
		"So while a text is open you may edit objects other than the one being typed in; still wait out a drag that changes the document, as which objects it holds is not reported.",
		"The answer comes from one open viewer window, not all of them.",
	].join(" "),
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
 * Has the viewer measure the `"source"` bodies (markdown) of the file being
 * diagnosed as it draws them, for diagnoseDoc to judge. Asked only when the
 * viewer shows that very file, and one object at a time; the first answer that
 * cannot be taken (a failure, a timeout, a tab too old to send the numbers, or
 * one drawn from other text than was diagnosed) ends the asking, and the
 * objects not measured stay in diagnoseDoc's unchecked warning.
 *
 * @param host The current host; null (no open_canvas) measures nothing
 * @param filePath The diagnosed file as toCanvasFilePath resolved it, compared
 *   with the file on display
 * @param docText The text diagnosed, read under the file's lock; a measurement
 *   is taken only from a window that drew this text's revision
 * @param objectIds The objects to measure, as listSourceTextObjects lists them
 * @returns The measurements taken, keyed by object id; empty when nothing could be
 */
async function measureSourceTextOnViewer(
	host: CanvasHost | null,
	filePath: string,
	docText: string,
	objectIds: readonly string[],
): Promise<Map<string, MeasuredSourceText>> {
	const measured = new Map<string, MeasuredSourceText>();
	if (objectIds.length === 0 || host === null) {
		return measured;
	}
	const openPath = host.getOpenPath();
	if (openPath === null) {
		return measured;
	}
	try {
		// resolveWorkspacePathReal answers with the lexical path, and filePath has
		// been through every link (toCanvasFilePath), so the two are compared as
		// where they lead
		const displayedPath = await realpath(
			await resolveWorkspacePathReal(host.workspaceRoot, openPath),
		);
		if (displayedPath !== filePath) {
			return measured;
		}
	} catch {
		// A path on display that no longer resolves is not the diagnosed file
		return measured;
	}
	const diagnosedRevision = calcDocRevision(docText);
	for (const objectId of objectIds) {
		const outcome = await host.runHandleOp(
			{ kind: "measureText", id: objectId },
			DIAGNOSE_MEASURE_TIMEOUT_MS,
		);
		if (
			!outcome.ok ||
			outcome.textMeasurement === undefined ||
			outcome.relPath !== openPath ||
			outcome.revision !== diagnosedRevision
		) {
			break;
		}
		measured.set(objectId, outcome.textMeasurement);
	}
	return measured;
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
 * back as an error, and a type that lays its body out itself (markdown) gets a
 * note in place of the verdict.
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
	const measuredLines = [
		`shape ${shape} ${width}x${height ?? "-"}`,
		`lines ${metrics.lines}`,
		`text ${round(metrics.width)}x${round(metrics.height)}`,
		`content ${round(box.width)}x${height === undefined ? "-" : round(box.height)}`,
	];
	// The plain-text lines only bound what an HTML body takes from below, so no
	// verdict is given on them
	if (resolution.isSourceText) {
		return [
			...measuredLines,
			`note: ${formatSourceTextMeasureNote(shape)}`,
		].join("\n");
	}
	// The wrap width is only exceeded when a single character is wider than the box.
	// A rounding difference of 0.5px is tolerated.
	const fits =
		metrics.width <= box.width + 0.5 &&
		(height === undefined || metrics.height <= box.height);

	return [...measuredLines, `fits ${fits ? "yes" : "no"}`].join("\n");
}

/**
 * Runs export_image: checks the arguments and the output path, has the viewer
 * draw the image, and writes it.
 *
 * @param host The host open_canvas started; null when there is none
 * @param args The tool's arguments, as its schema let them through
 * @returns The result text: what was written and its size, or `error: ...`
 * @throws CanvasFileError when the output cannot be written
 */
async function exportImageToFile(
	host: CanvasHost | null,
	args: {
		output: string;
		scale?: number;
		ids?: string[];
		isolate?: boolean;
	},
): Promise<string> {
	const { output, scale, ids, isolate } = args;
	const format = readExportImageFormat(output);
	if (format === null) {
		return `error: ${output} has to end in .png or .svg, which decides the format`;
	}
	if (isCanvasImageName(output)) {
		return `error: ${output} is named as an editable diagram (.jis.${format}), which an export would overwrite without its source; name it plain .${format} instead`;
	}
	if (format === "svg" && scale !== undefined) {
		return "error: scale is for a PNG only; drop it for an .svg";
	}
	if (isolate === true && ids === undefined) {
		return "error: isolate works with ids only, since it draws just the objects they name; drop isolate or give ids";
	}
	if (!path.isAbsolute(output)) {
		return `error: output has to be an absolute path: ${output}`;
	}
	if (host === null) {
		return "error: no canvas is open, so there is nothing on screen to export; call open_canvas first (headless: true opens no window)";
	}
	// Checked before the viewer is asked so a refusal costs no render, and again
	// below, since the directories may have changed while it drew
	await resolveExportImageOutputPath(host.workspaceRoot, output);
	const region = {
		...(ids === undefined ? {} : { ids }),
		...(isolate === undefined ? {} : { isolate }),
	};
	const op: ExportImageOp =
		format === "png"
			? {
					kind: "exportImage",
					format,
					scale: scale ?? DEFAULT_EXPORT_SCALE,
					...region,
				}
			: { kind: "exportImage", format, ...region };
	const outcome = await host.runHandleOp(op, EXPORT_IMAGE_TIMEOUT_MS);
	if (!outcome.ok) {
		return toOutcomeText(outcome);
	}
	if (outcome.exportedImageBase64 === undefined) {
		return "error: the canvas viewer answered without an image, which an outdated viewer tab does; reload the viewer and try again";
	}
	const bytes = Buffer.from(outcome.exportedImageBase64, "base64");
	const targetPath = await resolveExportImageOutputPath(
		host.workspaceRoot,
		output,
	);
	try {
		await writeFileAtomically(targetPath, bytes);
	} catch (error) {
		throw new CanvasFileError(
			`failed to write ${output}: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
	const writtenPath = path.resolve(output);
	return format === "svg"
		? `wrote ${writtenPath} (SVG, ${bytes.length} bytes)`
		: `wrote ${writtenPath}: ${outcome.text}`;
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
