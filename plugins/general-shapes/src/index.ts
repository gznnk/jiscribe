// 汎用ピクトグラムの外部パッケージ。収載の線引きは「記法に属さない、実物・人・場を
// 表す図形」で、flowchart / UML のような特定記法の語彙（それぞれ専用パッケージ）とも、
// 装飾系（star / heart / バナー等。図に意味を足さない）とも分ける。core 残留はゼロ
// （generalToolbarEntry も全図形をここから供給する）。
// 各図形の ObjectDocDefinition / ObjectTypeDefinition は createFrameObjectDoc /
// createFrameObjectDefinition (`@jiscribe/canvas-sdk/doc` / `@jiscribe/canvas-sdk`)
// が features/defaults から丸ごと導出するため、per-shape の ObjectFactory /
// validate*Doc / Mapper / validate*State は持たない。presentation 部品
// (createFrameObject / measureTextWidth / calcVisualLineCount / readTextSlot /
// OUTLINE_CURVE_SEGMENTS / centeredPolygonOutline) は `@jiscribe/canvas-sdk` 経由。
// headless な parse 入口は ./doc (generalDocPlugin)。
// 図形は 1 図形 1 フォルダ（schema/<id>/ ・ state/<id>/ ・ presentation/<Pascal>/）で、
// 複数図形が共有する部品は各層の shared/ に置く。
// (docs/05_extensibility/plugin-architecture-requirements.md 参照)。
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

export { generalToolbarEntry } from "./stencil/GeneralToolbarEntry";

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
