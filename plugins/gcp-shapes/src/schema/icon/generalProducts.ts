/**
 * Google's icon system written down as name resolution: a core product carries
 * an icon of its own, and every other product is drawn with the icon of the
 * category it is filed under. This table sends each such product's name to
 * that category icon, so a diagram may name the product it means
 * (`pubsub`, `cloud-functions`, `vpc`) and the label tells it apart.
 *
 * The products are the whole list of Google's product icon overview (pages
 * 7–31, "Updated: May 2026") in kebab-case, under the category each page
 * files them. Left out: the core products (marked `*` there), whose names are
 * canonical or in GCP_ICON_ALIASES, and a canonical name or an alias the
 * list also carries (`hyperdisk`, `persistent-disk`, `google-cloud-marketplace`,
 * `sql`).
 * A product marked `*` with no icon in the core package goes to the core icon
 * it belongs to (`looker-studio` → `looker`), or to its category's where there
 * is none (`earth-engine`). After each page's products come the short names
 * diagrams use for them.
 *
 * A test holds every target to an icon that exists and every key apart from
 * the canonical names and the alias table's keys.
 */
export const GCP_GENERAL_PRODUCT_ICONS: Readonly<Record<string, string>> = {
	// AI Applications & Agents (p. 7). Agent Assist and Customer Engagement
	// Suite are listed on p. 8 too; this page is theirs.
	"ai-testing-agent": "agents",
	"automotive-ai-agent": "agents",
	"code-documentation-agent": "agents",
	"deep-research-agent": "agents",
	"food-ordering-ai-agent": "agents",
	"idea-generation-agent": "agents",
	"customer-engagement-suite": "agents",
	"conversational-agents": "agents",
	"agent-assist": "agents",
	"conversational-insights": "agents",
	"contact-center-as-a-service": "agents",

	// AI and Machine Learning (p. 8)
	"advanced-agent-modeling": "ai-machine-learning",
	"ai-hub": "ai-machine-learning",
	"ai-platform": "ai-machine-learning",
	"ai-platform-unified": "ai-machine-learning",
	automl: "ai-machine-learning",
	"automl-natural-language": "ai-machine-learning",
	"automl-tables": "ai-machine-learning",
	"automl-translation": "ai-machine-learning",
	"automl-video-intelligence": "ai-machine-learning",
	"automl-vision": "ai-machine-learning",
	"cloud-gpu": "ai-machine-learning",
	"cloud-healthcare-api": "ai-machine-learning",
	"cloud-natural-language-api": "ai-machine-learning",
	"cloud-optimization-ai": "ai-machine-learning",
	"cloud-optimization-ai-fleet-routing-api": "ai-machine-learning",
	"cloud-tpu": "ai-machine-learning",
	"cloud-translation-api": "ai-machine-learning",
	"cloud-vision-api": "ai-machine-learning",
	"data-labeling": "ai-machine-learning",
	"dialogflow-es": "ai-machine-learning",
	"document-ai": "ai-machine-learning",
	genomics: "ai-machine-learning",
	"healthcare-nlp-api": "ai-machine-learning",
	"media-translation-api": "ai-machine-learning",
	"recommendations-ai": "ai-machine-learning",
	"speech-to-text": "ai-machine-learning",
	"tensorflow-enterprise": "ai-machine-learning",
	"text-to-speech": "ai-machine-learning",
	"visual-inspection-ai": "ai-machine-learning",

	// Business Intelligence (p. 9)
	"looker-studio": "looker",
	"looker-studio-pro": "looker",

	// Collaboration (p. 10)
	"google-workspace": "collaboration",

	// Compute (p. 11)
	batch: "compute",
	"container-optimized-os": "compute",
	"gce-systems-management": "compute",
	"migrate-to-virtual-machines": "compute",
	"os-config-management": "compute",
	"os-inventory-management": "compute",
	"os-patch-management": "compute",
	"vmware-engine": "compute",

	// Containers (p. 12)
	"backup-for-gke": "containers",
	"knative-serving": "containers",
	"migrate-to-containers": "containers",

	// Data Analytics (p. 13)
	"analytics-hub": "data-analytics",
	biglake: "data-analytics",
	"bigquery-functions": "bigquery",
	"bigquery-omni": "bigquery",
	"cloud-composer": "data-analytics",
	"cloud-data-fusion": "data-analytics",
	"data-catalog": "data-analytics",
	"data-layers": "data-analytics",
	"data-loss-prevention-api": "data-analytics",
	dataflow: "data-analytics",
	dataplex: "data-analytics",
	datapol: "data-analytics",
	dataprep: "data-analytics",
	dataproc: "data-analytics",
	"dataproc-metastore": "data-analytics",
	datashare: "data-analytics",
	datastream: "data-analytics",
	pubsub: "data-analytics",
	composer: "data-analytics",

	// Databases (p. 14)
	"alloydb-omni": "alloydb",
	"bare-metal-solution": "databases",
	bigtable: "databases",
	"database-center": "databases",
	"database-migration-service": "databases",
	datastore: "databases",
	firestore: "databases",
	memorystore: "databases",

	// Developer Tools (p. 15)
	"cloud-code": "developer-tools",
	"cloud-deployment-manager": "developer-tools",
	"cloud-scheduler": "developer-tools",
	"cloud-shell": "developer-tools",
	"cloud-tasks": "developer-tools",
	"cloud-workstations": "developer-tools",
	"runtime-config": "developer-tools",
	"service-catalog": "developer-tools",
	"tools-for-powershell": "developer-tools",

	// DevOps (p. 16)
	"artifact-registry": "devops",
	"cloud-build": "devops",
	"cloud-deploy": "devops",
	"container-registry": "devops",

	// Integration Services (p. 18)
	"advanced-api-security": "integration-services",
	"api-analytics": "integration-services",
	"application-integration": "integration-services",
	"cloud-api-gateway": "integration-services",
	"cloud-apis": "integration-services",
	"cloud-endpoints": "integration-services",
	connectors: "integration-services",
	"developer-portal": "integration-services",
	eventarc: "integration-services",
	workflows: "integration-services",
	"api-gateway": "integration-services",

	// Management Tools (p. 19)
	"carbon-footprint": "management-tools",
	"producer-portal": "management-tools",

	// Maps and Geospatial (p. 20)
	"earth-engine": "maps-geospatial",
	"google-earth": "maps-geospatial",
	"google-maps-platform": "maps-geospatial",

	// Migration (p. 23)
	"migrate-for-compute-engine": "migration",
	"transfer-appliance": "migration",

	// Networking (p. 25)
	"cloud-armor": "networking",
	"cloud-cdn": "networking",
	"cloud-dns": "networking",
	"cloud-domains": "networking",
	"cloud-firewall-rules": "networking",
	"cloud-ids": "networking",
	"cloud-interconnect": "networking",
	"cloud-load-balancing": "networking",
	"cloud-nat": "networking",
	"cloud-network": "networking",
	"cloud-router": "networking",
	"cloud-vpn": "networking",
	"connectivity-test": "networking",
	"data-transfer": "networking",
	"network-connectivity-center": "networking",
	"network-intelligence-center": "networking",
	"network-security": "networking",
	"network-tiers": "networking",
	"network-topology": "networking",
	"packet-mirroring": "networking",
	"partner-interconnect": "networking",
	"premium-network-tier": "networking",
	"private-connectivity": "networking",
	"private-service-connect": "networking",
	routes: "networking",
	"service-mesh": "networking",
	"virtual-private-cloud": "networking",
	vpc: "networking",
	"load-balancing": "networking",
	lb: "networking",
	psc: "networking",

	// Observability (p. 26)
	"cloud-audit-logs": "observability",
	"cloud-logging": "observability",
	"cloud-monitoring": "observability",
	"error-reporting": "observability",
	"google-cloud-observability": "observability",
	profiler: "observability",
	trace: "observability",
	logging: "observability",
	monitoring: "observability",

	// Operations (p. 27)
	"app-hub": "operations",
	"backup-and-dr": "operations",
	"capacity-planner": "operations",
	"performance-dashboard": "operations",
	"personalized-service-health": "operations",

	// Security and Identity (p. 28)
	"access-context-manager": "security-identity",
	"asset-inventory": "security-identity",
	"assured-workloads": "security-identity",
	beyondcorp: "security-identity",
	"binary-authorization": "security-identity",
	"certificate-authority-service": "security-identity",
	"certificate-manager": "security-identity",
	"cloud-asset-inventory": "security-identity",
	"cloud-external-key-manager": "security-identity",
	"cloud-hsm": "security-identity",
	"cloud-security-scanner": "security-identity",
	"identity-and-access-management": "security-identity",
	"identity-aware-proxy": "security-identity",
	"identity-platform": "security-identity",
	"key-access-justifications": "security-identity",
	"key-management-service": "security-identity",
	"managed-service-for-microsoft-active-directory": "security-identity",
	"phishing-protection": "security-identity",
	"policy-analyzer": "security-identity",
	"recaptcha-enterprise": "security-identity",
	"risk-manager": "security-identity",
	"secret-manager": "security-identity",
	"security-key-enforcement": "security-identity",
	"web-risk": "security-identity",
	"web-security-scanner": "security-identity",
	"workload-identity-federation": "security-identity",
	iam: "security-identity",
	iap: "security-identity",
	kms: "security-identity",
	"cloud-kms": "security-identity",

	// Serverless Computing (p. 29)
	"app-engine": "serverless-computing",
	"cloud-functions": "serverless-computing",
	functions: "serverless-computing",
	gae: "serverless-computing",

	// Storage (p. 30)
	filestore: "storage",
	"google-cloud-netapp-volumes": "storage",
	"local-ssd": "storage",
	parallelstore: "storage",
	"storage-transfer-service": "storage",

	// Web3 (p. 31)
	"blockchain-node-engine": "web3",
	"blockchain-rpc": "web3",
};
