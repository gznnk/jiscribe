export const ObjectTypes = [
	"rect",
	"ellipse",
	"diamond",
	"stadium",
	"parallelogram",
	"hexagon",
	"cloud",
	"document",
	"actor",
	"callout",
	"db",
	"polyline",
	"polygon",
	"group",
	"connector",
	"sticky",
	"svg",
] as const;

export type ObjectType = (typeof ObjectTypes)[number] | (string & {});
