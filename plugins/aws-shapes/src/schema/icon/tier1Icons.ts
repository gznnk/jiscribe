/** One palette entry. The label doubles as the text slot's initial value. */
export type AwsTier1Icon = {
	/** The canonical icon name. */
	icon: string;
	/** The short name that goes into the text slot when the icon is placed. */
	label: string;
};

/**
 * The icons the palette carries (tier 1): what an AWS diagram reaches for
 * without thinking, in service → resource → general order. All 781 would be too
 * many to choose from, so the rest are reached through the picker's search.
 *
 * The labels are the names used on the ground rather than the official ones
 * (`S3`, not `Amazon Simple Storage Service`), because that is what a diagram
 * writes. They serve as both the stencil's tooltip and the label the placed
 * shape carries. A test holds every `icon` against an icon that exists.
 */
export const AWS_TIER1_ICONS = [
	{ icon: "service/amazon-ec2", label: "EC2" },
	{ icon: "service/aws-lambda", label: "Lambda" },
	{ icon: "service/amazon-ec2-auto-scaling", label: "Auto Scaling" },
	{ icon: "service/aws-elastic-beanstalk", label: "Elastic Beanstalk" },
	{ icon: "service/aws-batch", label: "Batch" },
	{ icon: "service/aws-app-runner", label: "App Runner" },
	{ icon: "service/amazon-elastic-container-service", label: "ECS" },
	{ icon: "service/amazon-elastic-kubernetes-service", label: "EKS" },
	{ icon: "service/aws-fargate", label: "Fargate" },
	{ icon: "service/amazon-elastic-container-registry", label: "ECR" },
	{ icon: "service/amazon-simple-storage-service", label: "S3" },
	{ icon: "service/amazon-elastic-block-store", label: "EBS" },
	{ icon: "service/amazon-efs", label: "EFS" },
	{
		icon: "service/amazon-simple-storage-service-glacier",
		label: "S3 Glacier",
	},
	{ icon: "service/aws-backup", label: "Backup" },
	{ icon: "service/amazon-rds", label: "RDS" },
	{ icon: "service/amazon-aurora", label: "Aurora" },
	{ icon: "service/amazon-dynamodb", label: "DynamoDB" },
	{ icon: "service/amazon-elasticache", label: "ElastiCache" },
	{ icon: "service/amazon-redshift", label: "Redshift" },
	{ icon: "service/amazon-documentdb", label: "DocumentDB" },
	{ icon: "service/amazon-neptune", label: "Neptune" },
	{ icon: "service/amazon-virtual-private-cloud", label: "VPC" },
	{ icon: "service/amazon-cloudfront", label: "CloudFront" },
	{ icon: "service/amazon-route-53", label: "Route 53" },
	{ icon: "service/elastic-load-balancing", label: "ELB" },
	{ icon: "service/amazon-api-gateway", label: "API Gateway" },
	{ icon: "service/aws-direct-connect", label: "Direct Connect" },
	{ icon: "service/aws-transit-gateway", label: "Transit Gateway" },
	{ icon: "service/aws-site-to-site-vpn", label: "Site-to-Site VPN" },
	{ icon: "service/aws-privatelink", label: "PrivateLink" },
	{ icon: "service/aws-global-accelerator", label: "Global Accelerator" },
	{ icon: "service/amazon-simple-queue-service", label: "SQS" },
	{ icon: "service/amazon-simple-notification-service", label: "SNS" },
	{ icon: "service/amazon-eventbridge", label: "EventBridge" },
	{ icon: "service/aws-step-functions", label: "Step Functions" },
	{ icon: "service/aws-appsync", label: "AppSync" },
	{ icon: "service/amazon-mq", label: "Amazon MQ" },
	{ icon: "service/aws-identity-and-access-management", label: "IAM" },
	{ icon: "service/amazon-cognito", label: "Cognito" },
	{ icon: "service/aws-key-management-service", label: "KMS" },
	{ icon: "service/aws-secrets-manager", label: "Secrets Manager" },
	{ icon: "service/aws-waf", label: "WAF" },
	{ icon: "service/aws-shield", label: "Shield" },
	{ icon: "service/aws-certificate-manager", label: "ACM" },
	{ icon: "service/amazon-guardduty", label: "GuardDuty" },
	{ icon: "service/aws-security-hub", label: "Security Hub" },
	{ icon: "service/amazon-cloudwatch", label: "CloudWatch" },
	{ icon: "service/aws-cloudtrail", label: "CloudTrail" },
	{ icon: "service/aws-cloudformation", label: "CloudFormation" },
	{ icon: "service/aws-systems-manager", label: "Systems Manager" },
	{ icon: "service/aws-config", label: "Config" },
	{ icon: "service/aws-x-ray", label: "X-Ray" },
	{ icon: "service/aws-organizations", label: "Organizations" },
	{ icon: "service/aws-codepipeline", label: "CodePipeline" },
	{ icon: "service/aws-codebuild", label: "CodeBuild" },
	{ icon: "service/aws-codedeploy", label: "CodeDeploy" },
	{ icon: "service/aws-codeartifact", label: "CodeArtifact" },
	{
		icon: "service/amazon-kinesis-data-streams",
		label: "Kinesis Data Streams",
	},
	{ icon: "service/amazon-data-firehose", label: "Data Firehose" },
	{ icon: "service/amazon-athena", label: "Athena" },
	{ icon: "service/aws-glue", label: "Glue" },
	{ icon: "service/amazon-emr", label: "EMR" },
	{ icon: "service/amazon-opensearch-service", label: "OpenSearch" },
	{ icon: "service/amazon-quick", label: "Quick" },
	{
		icon: "service/amazon-managed-streaming-for-apache-kafka",
		label: "MSK",
	},
	{ icon: "service/amazon-bedrock", label: "Bedrock" },
	{ icon: "service/amazon-sagemaker", label: "SageMaker" },
	{ icon: "service/aws-amplify", label: "Amplify" },
	{ icon: "service/amazon-simple-email-service", label: "SES" },

	{ icon: "resource/amazon-ec2/instance", label: "Instance" },
	{ icon: "resource/amazon-ec2/instances", label: "Instances" },
	{ icon: "resource/aws-lambda/lambda-function", label: "Function" },
	{ icon: "resource/amazon-aurora/amazon-rds-instance", label: "RDS Instance" },
	{ icon: "resource/amazon-dynamodb/table", label: "Table" },
	{ icon: "resource/amazon-simple-storage-service/bucket", label: "Bucket" },
	{
		icon: "resource/elastic-load-balancing/application-load-balancer",
		label: "ALB",
	},
	{
		icon: "resource/elastic-load-balancing/network-load-balancer",
		label: "NLB",
	},
	{
		icon: "resource/elastic-load-balancing/gateway-load-balancer",
		label: "GLB",
	},
	{ icon: "resource/amazon-vpc/internet-gateway", label: "Internet Gateway" },
	{ icon: "resource/amazon-vpc/nat-gateway", label: "NAT Gateway" },
	{ icon: "resource/amazon-vpc/endpoints", label: "VPC Endpoint" },
	{ icon: "resource/amazon-vpc/router", label: "Router" },
	{ icon: "resource/amazon-vpc/elastic-network-interface", label: "ENI" },
	{
		icon: "resource/amazon-elastic-container-service/container-1",
		label: "Container",
	},
	{ icon: "resource/amazon-elastic-container-service/task", label: "Task" },
	{
		icon: "resource/amazon-elastic-container-service/service",
		label: "Service",
	},
	{ icon: "resource/amazon-cloudwatch/alarm", label: "Alarm" },
	{ icon: "resource/amazon-simple-queue-service/queue", label: "Queue" },
	{ icon: "resource/amazon-simple-notification-service/topic", label: "Topic" },

	{ icon: "general/user", label: "User" },
	{ icon: "general/users", label: "Users" },
	{ icon: "general/client", label: "Client" },
	{ icon: "general/mobile-client", label: "Mobile Client" },
	{ icon: "general/internet", label: "Internet" },
	{ icon: "general/office-building", label: "Office" },
	{ icon: "general/server", label: "Server" },
	{ icon: "general/database", label: "Database" },
	{ icon: "general/sdk", label: "SDK" },
	{ icon: "general/alert", label: "Alert" },
] as const satisfies readonly AwsTier1Icon[];

/** The names of {@link AWS_TIER1_ICONS} alone, in the same order. */
export const AWS_TIER1_ICON_NAMES: readonly string[] = AWS_TIER1_ICONS.map(
	(entry) => entry.icon,
);
