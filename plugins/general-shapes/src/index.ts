// External package of general-purpose pictograms. The inclusion criterion is "shapes
// that belong to no notation and stand for things, people and places", which keeps it
// apart both from the vocabulary of a specific notation such as flowchart / UML (each its
// own package) and from decorative shapes (star / heart / banners and the like, which add
// no meaning to a diagram). Nothing is left behind in core (generalStencilCategory ships all
// of these shapes from here as well).
// Each shape's ObjectDocDefinition / ObjectTypeDefinition is derived wholesale from
// features/defaults by createFrameObjectDoc / createFrameObjectDefinition
// (`@jiscribe/canvas-sdk/doc` / `@jiscribe/canvas-sdk`), so there is no per-shape
// ObjectFactory / validate*Doc / Mapper / validate*State. The outline parts
// (OUTLINE_CURVE_SEGMENTS / centeredPolygonOutline / calcRoundedRectOutline) come
// from `@jiscribe/canvas-sdk/doc`, the presentation parts (createFrameObject /
// calcBelowLabelTextRegion / readTextSlot) through `@jiscribe/canvas-sdk`.
// The headless parse entry point is ./doc (generalDocPlugin).
// Shapes get one folder each (schema/<id>/, state/<id>/, presentation/<Pascal>/), and
// parts shared by several shapes live in each layer's shared/.
// (See packages/canvas/docs/13-authoring-plugins.md.)
export * from "./schema/actor/ActorDoc";
export * from "./schema/browserWindow/BrowserWindowDoc";
export * from "./schema/cloud/CloudDoc";
export * from "./schema/envelope/EnvelopeDoc";
export * from "./schema/file/FileDoc";
export * from "./schema/folder/FolderDoc";
export * from "./schema/gear/GearDoc";
export * from "./schema/laptop/LaptopDoc";
export * from "./schema/lock/LockDoc";
export * from "./schema/package/PackageDoc";
export * from "./schema/queue/QueueDoc";
export * from "./schema/server/ServerDoc";
export * from "./schema/shield/ShieldDoc";
export * from "./schema/smartphone/SmartphoneDoc";
export * from "./schema/terminalWindow/TerminalWindowDoc";

// The outlines are declared on the doc definitions (./doc), so they live in schema/.
export { browserWindowOutline } from "./schema/browserWindow/browserWindowOutline";
export { cloudOutline } from "./schema/cloud/cloudOutline";
export { envelopeOutline } from "./schema/envelope/envelopeOutline";
export { fileOutline } from "./schema/file/fileOutline";
export { folderOutline } from "./schema/folder/folderOutline";
export { gearOutline } from "./schema/gear/gearOutline";
export { laptopOutline } from "./schema/laptop/laptopOutline";
export { lockOutline } from "./schema/lock/lockOutline";
export { packageOutline } from "./schema/package/packageOutline";
export { queueOutline } from "./schema/queue/queueOutline";
export { serverOutline } from "./schema/server/serverOutline";
export { shieldOutline } from "./schema/shield/shieldOutline";
export { smartphoneOutline } from "./schema/smartphone/smartphoneOutline";
export { terminalWindowOutline } from "./schema/terminalWindow/terminalWindowOutline";
export { calcGearPoints } from "./schema/gear/calcGearPoints";
export { calcLaptopPoints } from "./schema/laptop/calcLaptopPoints";

export * from "./state/actor/ActorState";
export * from "./state/browserWindow/BrowserWindowState";
export * from "./state/cloud/CloudState";
export * from "./state/envelope/EnvelopeState";
export * from "./state/file/FileState";
export * from "./state/folder/FolderState";
export * from "./state/gear/GearState";
export * from "./state/laptop/LaptopState";
export * from "./state/lock/LockState";
export * from "./state/package/PackageState";
export * from "./state/queue/QueueState";
export * from "./state/server/ServerState";
export * from "./state/shield/ShieldState";
export * from "./state/smartphone/SmartphoneState";
export * from "./state/terminalWindow/TerminalWindowState";

export * from "./presentation/Actor";
export * from "./presentation/BrowserWindow";
export * from "./presentation/Cloud";
export * from "./presentation/Envelope";
export * from "./presentation/File";
export * from "./presentation/Folder";
export * from "./presentation/Gear";
export * from "./presentation/Laptop";
export * from "./presentation/Lock";
export * from "./presentation/Package";
export * from "./presentation/Queue";
export * from "./presentation/Server";
export * from "./presentation/Shield";
export * from "./presentation/Smartphone";
export * from "./presentation/TerminalWindow";
export * from "./presentation/shared";

export { generalStencilCategory } from "./stencil/GeneralStencilCategory";

export {
	actorDefinition,
	browserWindowDefinition,
	cloudDefinition,
	envelopeDefinition,
	fileDefinition,
	folderDefinition,
	gearDefinition,
	laptopDefinition,
	lockDefinition,
	packageDefinition,
	queueDefinition,
	serverDefinition,
	shieldDefinition,
	smartphoneDefinition,
	terminalWindowDefinition,
} from "./definition";
export {
	actorDocDefinition,
	browserWindowDocDefinition,
	cloudDocDefinition,
	envelopeDocDefinition,
	fileDocDefinition,
	folderDocDefinition,
	gearDocDefinition,
	generalDocPlugin,
	laptopDocDefinition,
	lockDocDefinition,
	packageDocDefinition,
	queueDocDefinition,
	serverDocDefinition,
	shieldDocDefinition,
	smartphoneDocDefinition,
	terminalWindowDocDefinition,
} from "./doc";
export { generalPlugin } from "./plugin";
