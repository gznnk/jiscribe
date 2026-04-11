export const ObjectTypes = [
	"rect",
	"ellipse",
	"polyline",
	"polygon",
	"group",
	"connector",
	"sticky",
] as const;

export type ObjectType = (typeof ObjectTypes)[number] | (string & {});
