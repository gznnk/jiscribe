export const ObjectTypes = [
	"rect",
	"ellipse",
	"cloud",
	"actor",
	"callout",
	"polyline",
	"polygon",
	"group",
	"connector",
	"sticky",
	"svg",
] as const;

export type ObjectType = (typeof ObjectTypes)[number] | (string & {});
