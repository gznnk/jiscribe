import type { IconSetBrowseGroupDeclaration } from "@jiscribe/canvas-sdk/doc";

/**
 * The sections of the "show all" view, in the order an architecture diagram
 * reaches for them, General and Other last. A test holds every category the
 * catalog carries to exactly one section, and each id to the label in
 * kebab-case with `+` dropped.
 *
 * Migration holds the Migrate folder only: every icon of the Migration folder
 * is filed in another folder too and takes its category from there, and so
 * does every icon of Mobile, which has no section. Menu and New Icons are
 * folded into General and Other.
 */
export const AZURE_ICON_BROWSE_GROUP_DECLARATIONS: readonly IconSetBrowseGroupDeclaration[] =
	[
		{ id: "compute", label: "Compute", categories: ["Compute"] },
		{ id: "containers", label: "Containers", categories: ["Containers"] },
		{ id: "networking", label: "Networking", categories: ["Networking"] },
		{ id: "storage", label: "Storage", categories: ["Storage"] },
		{ id: "databases", label: "Databases", categories: ["Databases"] },
		{ id: "web", label: "Web", categories: ["Web"] },
		{ id: "app-services", label: "App Services", categories: ["App Services"] },
		{ id: "integration", label: "Integration", categories: ["Integration"] },
		{ id: "identity", label: "Identity", categories: ["Identity"] },
		{ id: "security", label: "Security", categories: ["Security"] },
		{
			id: "ai-machine-learning",
			label: "AI + Machine Learning",
			categories: ["AI + Machine Learning"],
		},
		{ id: "analytics", label: "Analytics", categories: ["Analytics"] },
		{ id: "iot", label: "IoT", categories: ["IoT"] },
		{ id: "monitor", label: "Monitor", categories: ["Monitor"] },
		{
			id: "management-governance",
			label: "Management + Governance",
			categories: ["Management + Governance"],
		},
		{ id: "devops", label: "DevOps", categories: ["DevOps"] },
		{
			id: "developer-tools",
			label: "Developer Tools",
			categories: ["Developer Tools"],
		},
		{
			id: "hybrid-multicloud",
			label: "Hybrid + Multicloud",
			categories: ["Hybrid + Multicloud"],
		},
		{ id: "migration", label: "Migration", categories: ["Migrate"] },
		{
			id: "mixed-reality",
			label: "Mixed Reality",
			categories: ["Mixed Reality"],
		},
		{ id: "blockchain", label: "Blockchain", categories: ["Blockchain"] },
		{ id: "intune", label: "Intune", categories: ["Intune"] },
		{
			id: "azure-ecosystem",
			label: "Azure Ecosystem",
			categories: ["Azure Ecosystem"],
		},
		{ id: "general", label: "General", categories: ["General", "Menu"] },
		{ id: "other", label: "Other", categories: ["Other", "New Icons"] },
	];
