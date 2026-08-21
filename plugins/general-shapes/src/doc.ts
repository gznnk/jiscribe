// Headless (UI-independent) entry point. It mirrors the canvas package's own ./doc: an
// entry point for consumers that want to take part in parse-time validation without going
// through definition.ts (which pulls in React components) — the MCP server, the Node-side
// diagnostics of the VSCode extension, and the like. It imports only ./schema/** and
// @jiscribe/doc / @jiscribe/canvas-sdk/doc, and never pulls in
// presentation / state / stencil.
import { createFrameObjectDoc } from "@jiscribe/canvas-sdk/doc";
import type { CanvasDocPlugin, ObjectDocDefinition } from "@jiscribe/doc";

import { ACTOR_DOC_DEFAULTS, ActorFeatures } from "./schema/actor/ActorDoc";
import {
	BROWSER_WINDOW_DOC_DEFAULTS,
	BrowserWindowFeatures,
} from "./schema/browserWindow/BrowserWindowDoc";
import { CLOUD_DOC_DEFAULTS, CloudFeatures } from "./schema/cloud/CloudDoc";
import {
	ENVELOPE_DOC_DEFAULTS,
	EnvelopeFeatures,
} from "./schema/envelope/EnvelopeDoc";
import { FILE_DOC_DEFAULTS, FileFeatures } from "./schema/file/FileDoc";
import { FOLDER_DOC_DEFAULTS, FolderFeatures } from "./schema/folder/FolderDoc";
import { GEAR_DOC_DEFAULTS, GearFeatures } from "./schema/gear/GearDoc";
import { LAPTOP_DOC_DEFAULTS, LaptopFeatures } from "./schema/laptop/LaptopDoc";
import { LOCK_DOC_DEFAULTS, LockFeatures } from "./schema/lock/LockDoc";
import {
	PACKAGE_DOC_DEFAULTS,
	PackageFeatures,
} from "./schema/package/PackageDoc";
import { QUEUE_DOC_DEFAULTS, QueueFeatures } from "./schema/queue/QueueDoc";
import { SERVER_DOC_DEFAULTS, ServerFeatures } from "./schema/server/ServerDoc";
import { SHIELD_DOC_DEFAULTS, ShieldFeatures } from "./schema/shield/ShieldDoc";
import {
	SMARTPHONE_DOC_DEFAULTS,
	SmartphoneFeatures,
} from "./schema/smartphone/SmartphoneDoc";
import {
	TERMINAL_WINDOW_DOC_DEFAULTS,
	TerminalWindowFeatures,
} from "./schema/terminalWindow/TerminalWindowDoc";

/**
 * Every shape here shares the rect geometry (x/y/width/height) of RectDoc and
 * only swaps the rendering, so the sentence saying so is factored out of the 15
 * descriptions rather than repeated in each.
 */
const RECT_GEOMETRY_NOTE =
	"Uses the same rect-based geometry (x/y/width/height) as RectDoc; only the rendering differs.";

/** Suffix for the shapes whose drawing takes the whole box and whose text becomes a caption. */
const BELOW_LABEL_NOTE =
	"Text is drawn as a label below the box, auto-sized to the text itself, so the box may be kept small without making the text unreadable.";

export const actorDocDefinition: ObjectDocDefinition = createFrameObjectDoc({
	features: ActorFeatures,
	defaults: ACTOR_DOC_DEFAULTS,
	description: `Actor (stick figure) shape, typically used for users/roles in use-case diagrams or stakeholders in business diagrams. ${RECT_GEOMETRY_NOTE} The stick figure fills the whole box. ${BELOW_LABEL_NOTE} A portrait aspect ratio (e.g. 80x100) looks best.`,
	summary: "user, role, stakeholder",
	outlineDescription: "Stick figure",
});

export const cloudDocDefinition: ObjectDocDefinition = createFrameObjectDoc({
	features: CloudFeatures,
	defaults: CLOUD_DOC_DEFAULTS,
	description:
		"Cloud shape, typically used for external systems/networks in architecture diagrams or fuzzy concepts in brainstorming. Uses the same rect-based geometry (x/y/width/height) as RectDoc; only the rendering is a cloud. Text is laid out in a reduced central region inside the bumps, so give it generous width/height for longer text.",
	summary: "external system, fuzzy concept",
	outlineDescription:
		"Cloud of rounded bumps (inner text area is small — size generously)",
});

export const serverDocDefinition: ObjectDocDefinition = createFrameObjectDoc({
	features: ServerFeatures,
	defaults: SERVER_DOC_DEFAULTS,
	description: `Server rack shape (a box divided into stacked units, each with a status light), typically used for hosts, nodes and long-running processes in architecture diagrams. ${RECT_GEOMETRY_NOTE} ${BELOW_LABEL_NOTE} A portrait aspect ratio (e.g. 90x110) looks best. Prefer "package" for something that is deployed rather than something that runs.`,
	summary: "host, node, running process",
});

export const browserWindowDocDefinition: ObjectDocDefinition =
	createFrameObjectDoc({
		features: BrowserWindowFeatures,
		defaults: BROWSER_WINDOW_DOC_DEFAULTS,
		description: `Browser window shape (a frame with a title bar carrying three window buttons), typically used for web UIs and screens, e.g. to show which screen calls which service. ${RECT_GEOMETRY_NOTE} Text is laid out in the content area below the title bar, so a landscape aspect ratio (e.g. 160x110) suits it.`,
		summary: "web UI, screen",
	});

export const terminalWindowDocDefinition: ObjectDocDefinition =
	createFrameObjectDoc({
		features: TerminalWindowFeatures,
		defaults: TERMINAL_WINDOW_DOC_DEFAULTS,
		description: `Terminal window shape (the same frame as browserWindow, with a shell prompt in the title bar instead of the window buttons), typically used for CLIs, shell sessions and scripts. ${RECT_GEOMETRY_NOTE} Text is laid out in the content area below the title bar, so a landscape aspect ratio (e.g. 160x110) suits it.`,
		summary: "CLI, shell session",
	});

export const folderDocDefinition: ObjectDocDefinition = createFrameObjectDoc({
	features: FolderFeatures,
	defaults: FOLDER_DOC_DEFAULTS,
	description: `Folder shape (a tab on the top-left corner), typically used for directories and for grouping. ${RECT_GEOMETRY_NOTE} Text is laid out below the tab. For a frame that other objects are placed inside, use a container shape instead — this one is a plain icon and does not hold children.`,
	summary: "directory, grouping",
});

export const fileDocDefinition: ObjectDocDefinition = createFrameObjectDoc({
	features: FileFeatures,
	defaults: FILE_DOC_DEFAULTS,
	description: `File shape (a folded top-right corner), typically used for source files and configuration. ${RECT_GEOMETRY_NOTE} Text is laid out below the fold, so a portrait aspect ratio (e.g. 100x120) looks best. Distinct from the flowchart "document" (wavy bottom edge, a flowchart step) and "card" (clipped top-left corner), and from "note", which folds the same corner but is a comment box about the diagram rather than a thing the diagram is about.`,
	summary: "source file, configuration",
});

export const packageDocDefinition: ObjectDocDefinition = createFrameObjectDoc({
	features: PackageFeatures,
	defaults: PACKAGE_DOC_DEFAULTS,
	description: `Isometric box shape, typically used for libraries, build artifacts and deployment units. ${RECT_GEOMETRY_NOTE} ${BELOW_LABEL_NOTE} The hexagon is a cube in isometric projection, so it reads as a cube only when the box is slightly taller than wide (e.g. 95x110); a square box widens it. Prefer "server" for something that runs rather than something that is deployed.`,
	summary: "library, artifact, deployment unit",
});

export const envelopeDocDefinition: ObjectDocDefinition = createFrameObjectDoc({
	features: EnvelopeFeatures,
	defaults: ENVELOPE_DOC_DEFAULTS,
	description: `Closed envelope shape, typically used for a single message or event. ${RECT_GEOMETRY_NOTE} ${BELOW_LABEL_NOTE} A landscape aspect ratio (e.g. 120x84) looks best. Prefer "queue" for the buffer messages sit in rather than for one message.`,
	summary: "message, event",
});

export const queueDocDefinition: ObjectDocDefinition = createFrameObjectDoc({
	features: QueueFeatures,
	defaults: QUEUE_DOC_DEFAULTS,
	description: `Queue shape (a row of cells), typically used for job queues, message queues and topics. ${RECT_GEOMETRY_NOTE} ${BELOW_LABEL_NOTE} It carries no direction mark, so which end is the head is whatever the connectors say. A wide, short aspect ratio (e.g. 160x70) looks best.`,
	summary: "job queue, message queue",
});

export const gearDocDefinition: ObjectDocDefinition = createFrameObjectDoc({
	features: GearFeatures,
	defaults: GEAR_DOC_DEFAULTS,
	description: `Gear shape, typically used for services, batch jobs and daemons — work that runs on its own rather than being called through a UI. ${RECT_GEOMETRY_NOTE} ${BELOW_LABEL_NOTE} A square aspect ratio (e.g. 100x100) looks best; a stretched box gives a stretched gear.`,
	summary: "service, batch job, daemon",
});

export const lockDocDefinition: ObjectDocDefinition = createFrameObjectDoc({
	features: LockFeatures,
	defaults: LOCK_DOC_DEFAULTS,
	description: `Padlock shape, typically used for authentication steps and protected resources. ${RECT_GEOMETRY_NOTE} ${BELOW_LABEL_NOTE} A portrait aspect ratio (e.g. 80x100) looks best. Prefer "shield" for a boundary that other things sit behind.`,
	summary: "authentication, protected resource",
});

export const shieldDocDefinition: ObjectDocDefinition = createFrameObjectDoc({
	features: ShieldFeatures,
	defaults: SHIELD_DOC_DEFAULTS,
	description: `Shield shape, typically used for security boundaries and trust zones. ${RECT_GEOMETRY_NOTE} Text is laid out in the straight-sided upper part only, since the lower part tapers to a point — keep it short, or give the shape more height. Prefer "lock" for a single protected resource.`,
	summary: "security boundary, trust zone",
});

export const smartphoneDocDefinition: ObjectDocDefinition =
	createFrameObjectDoc({
		features: SmartphoneFeatures,
		defaults: SMARTPHONE_DOC_DEFAULTS,
		description: `Smartphone shape, typically used for mobile clients. ${RECT_GEOMETRY_NOTE} Text is laid out on the screen, which is narrow — keep it to a word or two, or widen the box. A portrait aspect ratio (e.g. 70x120) looks best.`,
		summary: "mobile client",
	});

export const laptopDocDefinition: ObjectDocDefinition = createFrameObjectDoc({
	features: LaptopFeatures,
	defaults: LAPTOP_DOC_DEFAULTS,
	description: `Laptop shape (screen over a splayed base), typically used for desktop and web clients. ${RECT_GEOMETRY_NOTE} Text is laid out on the screen, so the base band at the bottom of the box stays clear. A landscape aspect ratio (e.g. 140x100) looks best.`,
	summary: "desktop client, web client",
});

/**
 * Headless `CanvasDocPlugin` for the general shapes: the doc-layer view of
 * `generalPlugin`, teaching `createCanvasParser` the types without loading any
 * React / presentation code (packages/canvas/docs/12-plugin-architecture.md).
 */
export const generalDocPlugin: CanvasDocPlugin = {
	id: "general-shapes",
	objects: {
		actor: actorDocDefinition,
		browserWindow: browserWindowDocDefinition,
		cloud: cloudDocDefinition,
		envelope: envelopeDocDefinition,
		file: fileDocDefinition,
		folder: folderDocDefinition,
		gear: gearDocDefinition,
		laptop: laptopDocDefinition,
		lock: lockDocDefinition,
		package: packageDocDefinition,
		queue: queueDocDefinition,
		server: serverDocDefinition,
		shield: shieldDocDefinition,
		smartphone: smartphoneDocDefinition,
		terminalWindow: terminalWindowDocDefinition,
	},
};
