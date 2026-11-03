import type { IconSetBrowseGroupDeclaration } from "@jiscribe/canvas-sdk/doc";

/**
 * The sections of the "show all" view, in the order an architecture diagram
 * reaches for them, Other last. Google files its 45 icons under 26
 * categories, most holding one or two, so related categories share a section.
 * A test holds every category the catalog carries to exactly one section.
 */
export const GCP_ICON_BROWSE_GROUP_DECLARATIONS: readonly IconSetBrowseGroupDeclaration[] =
	[
		{
			id: "compute",
			label: "Compute",
			categories: ["Compute", "Serverless", "Containers"],
		},
		{
			id: "storage-databases",
			label: "Storage & Databases",
			categories: ["Storage", "Databases"],
		},
		{
			id: "data-analytics",
			label: "Data Analytics & BI",
			categories: ["Data Analytics", "Business Intelligence"],
		},
		{
			id: "ai",
			label: "AI",
			categories: ["AI and Machine Learning", "AI Applications & Agents"],
		},
		{ id: "networking", label: "Networking", categories: ["Networking"] },
		{
			id: "security-identity",
			label: "Security & Identity",
			categories: ["Security and Identity"],
		},
		{
			id: "integration-developer",
			label: "Integration & Developer Tools",
			categories: ["Integration Services", "Developer Tools", "DevOps"],
		},
		{
			id: "operations",
			label: "Operations",
			categories: ["Observability", "Operations", "Management Tools"],
		},
		{
			id: "hybrid-migration",
			label: "Hybrid & Migration",
			categories: ["Hybrid and Multicloud", "Migration"],
		},
		{
			id: "other",
			label: "Other",
			categories: [
				"Maps & Geospatial",
				"Media Services",
				"Mixed Reality",
				"Collaboration",
				"Web and Mobile",
				"Web3",
				"Marketplace",
			],
		},
	];
