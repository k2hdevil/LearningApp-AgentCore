# Module 2: AgentCore Runtime and Framework Integration

## Building Agentic AI with Amazon Bedrock AgentCore

---

## Table of Contents

1. [Agent Framework Overview](#1-agent-framework-overview)
2. [Open Source Framework Comparison](#2-open-source-framework-comparison)
3. [AgentCore Runtime Overview](#3-agentcore-runtime-overview)
4. [Runtime Core Concepts](#4-runtime-core-concepts)
5. [Session Isolation and Lifecycle](#5-session-isolation-and-lifecycle)
6. [Asynchronous and Long-Running Tasks](#6-asynchronous-and-long-running-tasks)
7. [Infrastructure and Deployment](#7-infrastructure-and-deployment)
8. [Developer Tools and Experience](#8-developer-tools-and-experience)
9. [Knowledge Check and Key Takeaways](#9-knowledge-check-and-key-takeaways)
10. [Additional Key Points - Instructor Supplementary Materials](#10-additional-key-points---instructor-supplementary-materials)

> 🆕 Indicator: Content added/changed after the textbook (v1.0.4, April 2026 build)

---

## 1. Agent Framework Overview

### Role of Frameworks

Agent frameworks are the software layer responsible for orchestrating the agentic loop.
AgentCore Runtime is designed to be **framework-agnostic**, capable of hosting any framework.

### Strands Agents Example

```python
from strands import Agent
from strands.models.bedrock import BedrockModel

bedrock_model = BedrockModel(model_id="<model id>")

recipe_agent = Agent(
    system_prompt=system_prompt,
    model=bedrock_model,
    tools=[websearch]
)

response = recipe_agent("Please recommend a recipe using chicken and broccoli.")
```

**Key Point**: Three elements needed to create an agent
- System prompt (agent's role and behavioral guidelines)
- Model (inference engine)
- Tools (external capability extensions)


### LangGraph Example

```python
from typing import Annotated
from typing_extensions import TypedDict
from langgraph.graph import StateGraph
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode, tools_condition
from langchain_aws import ChatBedrock
from langchain_core.tools import tool

# State definition
class State(TypedDict):
    messages: Annotated[list, add_messages]

# Tool definition
@tool
def get_weather(city: str) -> str:
    """Retrieves the current weather for a city."""
    return f"{city}: Clear, 25°C"

# LLM + tool binding
tools = [get_weather]
llm_with_tools = ChatBedrock(
    model_id="anthropic.claude-sonnet-4-20250514",
    region_name="us-west-2"
).bind_tools(tools)

# Graph construction
def chatbot(state):
    return {"messages": [llm_with_tools.invoke(state["messages"])]}

graph_builder = StateGraph(State)
graph_builder.add_node("chatbot", chatbot)
graph_builder.add_node("tools", ToolNode(tools))
graph_builder.add_conditional_edges("chatbot", tools_condition)
graph_builder.add_edge("tools", "chatbot")
graph_builder.set_entry_point("chatbot")
graph = graph_builder.compile()

# Execution
result = graph.invoke({"messages": [("user", "Tell me the weather in Seoul")]})
print(result["messages"][-1].content)
```

---

## 2. Open Source Framework Comparison

| Framework | Benefits | Considerations |
|-----------|----------|----------------|
| **Strands SDK** | • Minimal boilerplate, model-centric<br>• Built-in multi-agent patterns<br>• Production observability & AWS optimization | • Model-centric design can make control difficult<br>• Small community<br>• Relies on LLM inference |
| **CrewAI** | • Clear role-based agent setup<br>• Strong short/long-term memory<br>• Quality documentation, active community | • Opinionated and hard to customize<br>• Limited external agent support |
| **LangGraph** | • Complex state flow handling<br>• BYO agent (function/chain nodes)<br>• LangChain community leverage | • Instability between versions<br>• LangChain/Core stack dependency<br>• Abstraction failures in edge cases |
| **LlamaIndex** | • Advanced RAG and indexing<br>• Composable query engines<br>• Built-in RAG evaluation/tracing | • External orchestrator needed<br>• Sensitive to index/embedding tuning<br>• Code updates needed on API changes |


### Framework Selection Guide

| Use Case | Recommended Framework |
|----------|----------------------|
| AWS native, rapid prototyping | Strands Agents |
| Complex state machines, conditional branching | LangGraph |
| Role-based multi-agent teams | CrewAI |
| RAG-centric applications | LlamaIndex |
| 🆕 Quick start without code | AgentCore Managed Harness |

---

## 3. AgentCore Runtime Overview

### What is Runtime?

AgentCore Runtime is a **fully managed serverless hosting infrastructure** for agents.
It allows you to deploy, run, and scale agents without managing infrastructure.

### Four Core Capabilities

| Capability | Description |
|------------|-------------|
| **Framework/Model/Protocol Flexibility** | Supports all open source frameworks, all models (Bedrock/SageMaker/external), MCP/A2A protocols |
| **Session Isolation** | Each session runs in a fully isolated microVM (compute + memory + filesystem) |
| **Large Payload Multimodal** | Bidirectional streaming of text/image/audio/video, up to 100MB payload |
| **Real-time and Long-running** | Fast initialization (up to 200ms), long-running async workloads (up to 8 hours) |


### Self-Managed Alternative: Building Agent Runtime Directly with AWS Services

You can build an agent runtime directly by combining existing AWS compute services without using AgentCore Runtime. Below are the main alternatives with their pros and cons.

#### Alternative 1: AWS Lambda

An approach where agent orchestration logic is implemented as Lambda functions.

| Pros | Cons |
|------|------|
| Fully serverless, no infrastructure management | Maximum execution time limited to 15 minutes → unsuitable for long-running agents |
| Cost-effective per-invocation billing (intermittent traffic) | Cold start latency (50~200ms+, increases with package size) |
| Auto-scaling | No session isolation (same function instance reused) |
| Easy AWS service integration (API Gateway, Step Functions) | Difficult to maintain stateful conversations (external storage needed) |
| | Limited filesystem (/tmp 512MB~10GB, temporary) |


#### Alternative 2: Amazon ECS (Fargate)

An approach where agents are packaged as containers and run on ECS Fargate.

| Pros | Cons |
|------|------|
| Unlimited execution time, suitable for long-running workloads | Session isolation must be implemented manually (container level) |
| No server management (Fargate) | Costs incurred even during idle state (task runtime billing) |
| EFS/S3 mount available | Scaling policies must be configured manually |
| Sidecar pattern enables co-hosting MCP servers | Observability must be configured manually (OTEL, CloudWatch agent) |
| Flexible network configuration (VPC, service discovery) | Version management/canary deployment must be implemented manually |

#### Alternative 3: Amazon EKS (Kubernetes)

An approach where agents run as Pods in a Kubernetes cluster.

| Pros | Cons |
|------|------|
| Maximum flexibility, fine-grained resource control | High operational complexity (cluster management, node upgrades) |
| Multi-cloud/hybrid compatible | Kubernetes expertise required on the team |
| Sophisticated auto-scaling with HPA/KEDA | Initial setup cost and time investment |
| Cost optimization with Spot instances | Security patches, network policies all self-managed |
| Local model inference with GPU node pools | Excessive overhead for small workloads |

##### EKS-based Agent Runtime Architecture

```
+-------------------------------------------------------------------------+
|                      AWS Cloud (VPC)                                    |
|                                                                         |
|  👤 User --> ALB (HTTPS/WebSocket)                                      |
|                     |                                                   |
|         +-----------+-----------+                                       |
|         v                       v                                       |
|  +---------------------+ +---------------------+                       |
|  |   Agent Pod 1       | |   Agent Pod 2       |                       |
|  | +-----------------+ | | +-----------------+ |                       |
|  | |Agent Container  | | | |Agent Container  | |     +-------------+   |
|  | |(Strands/LangGraph)| | |(Strands/LangGraph)|     | MCP Server  |   |
|  | +-----------------+ | | +-----------------+ |     | Pod         |   |
|  | |Sidecar: OTEL    | | | |Sidecar: OTEL    | |     |(Shared Tools)|  |
|  | +-----------------+ | | +-----------------+ |     +-------------+   |
|  +----------+----------+ +----------+----------+           ^           |
|             |                       |                       |          |
|             +-----------+-----------+                       |          |
|                         |                                   |          |
|         +---------------+-----------------------------------+          |
|         |               |                                              |
|         v               v                                              |
|  +--------------+ +--------------+ +--------------+ +--------------+   |
|  |Amazon Bedrock| |Amazon        | | Amazon EFS   | | CloudWatch   |   |
|  |(Model        | |DynamoDB      | |(Shared Files)| |(Logs/Metrics)|   |
|  | Inference)   | |(Session      | +--------------+ +--------------+   |
|  +--------------+ | State)       |                                     |
|                   +--------------+                                     |
|                                                                        |
|  +--------------+   +------+                                           |
|  | Amazon ECR   |╌╌>| EKS  | (Image Pull)                              |
|  |(Container)   |   +------+                                           |
|  +--------------+                                                      |
|                    HPA: Auto-scaling                                    |
+-------------------------------------------------------------------------+
```
*Overall architecture diagram of EKS-based agent runtime*


**Component Descriptions**:
- **ALB**: HTTPS termination, path-based routing, WebSocket support
- **Agent Pod**: Composed of agent container + OTEL sidecar
- **HPA**: Auto-scaling based on CPU/memory or custom metrics
- **DynamoDB**: Session state storage for multi-turn conversations (session isolation implemented manually)
- **EFS**: Shared filesystem between Pods (prompt templates, shared data)
- **ECR**: Agent container image registry
- **Bedrock**: LLM inference calls (IAM role-based authentication via Pod Identity)

##### Terraform Template Example

Below is the core portion of a Terraform configuration for provisioning EKS-based agent runtime infrastructure.

```hcl
# =============================================================================
# providers.tf - Provider configuration
# =============================================================================

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.25"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.12"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# =============================================================================
# variables.tf - Variable definitions
# =============================================================================

variable "aws_region" {
  description = "AWS Region"
  type        = string
  default     = "us-west-2"
}

variable "cluster_name" {
  description = "EKS cluster name"
  type        = string
  default     = "agent-runtime-cluster"
}

variable "cluster_version" {
  description = "EKS Kubernetes version"
  type        = string
  default     = "1.30"
}

variable "agent_image" {
  description = "Agent container image URI"
  type        = string
}

variable "environment" {
  description = "Deployment environment (dev/staging/prod)"
  type        = string
  default     = "dev"
}

# =============================================================================
# vpc.tf - VPC and Networking
# =============================================================================

module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "${var.cluster_name}-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["${var.aws_region}a", "${var.aws_region}b", "${var.aws_region}c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]

  enable_nat_gateway   = true
  single_nat_gateway   = var.environment != "prod"
  enable_dns_hostnames = true

  # EKS required tags
  private_subnet_tags = {
    "kubernetes.io/role/internal-elb" = 1
  }
  public_subnet_tags = {
    "kubernetes.io/role/elb" = 1
  }
}

# =============================================================================
# eks.tf - EKS Cluster
# =============================================================================

module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.0"

  cluster_name    = var.cluster_name
  cluster_version = var.cluster_version

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  # Bedrock access via Pod Identity
  enable_cluster_creator_admin_permissions = true

  cluster_addons = {
    coredns                = {}
    kube-proxy             = {}
    vpc-cni                = {}
    eks-pod-identity-agent = {}
  }

  eks_managed_node_groups = {
    # Node group for agent workloads
    agent_nodes = {
      ami_type       = "AL2023_x86_64_STANDARD"
      instance_types = ["m6i.large", "m6i.xlarge"]

      min_size     = 2
      max_size     = 10
      desired_size = 2

      labels = {
        workload = "agent"
      }
    }

    # (Optional) GPU nodes - for local model inference
    # gpu_nodes = {
    #   ami_type       = "AL2023_x86_64_NVIDIA"
    #   instance_types = ["g5.xlarge"]
    #   min_size       = 0
    #   max_size       = 3
    #   desired_size   = 0
    #   labels = { workload = "gpu-inference" }
    #   taints = [{ key = "nvidia.com/gpu", value = "true", effect = "NO_SCHEDULE" }]
    # }
  }
}

# =============================================================================
# iam.tf - IAM for Bedrock Access (Pod Identity)
# =============================================================================

resource "aws_iam_role" "agent_pod_role" {
  name = "${var.cluster_name}-agent-pod-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "pods.eks.amazonaws.com"
      }
      Action = ["sts:AssumeRole", "sts:TagSession"]
    }]
  })
}

resource "aws_iam_role_policy" "bedrock_access" {
  name = "bedrock-invoke-model"
  role = aws_iam_role.agent_pod_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "bedrock:InvokeModel",
          "bedrock:InvokeModelWithResponseStream"
        ]
        Resource = "arn:aws:bedrock:${var.aws_region}::foundation-model/*"
      },
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query"
        ]
        Resource = aws_dynamodb_table.session_state.arn
      }
    ]
  })
}

resource "aws_eks_pod_identity_association" "agent" {
  cluster_name    = module.eks.cluster_name
  namespace       = "agent-runtime"
  service_account = "agent-sa"
  role_arn        = aws_iam_role.agent_pod_role.arn
}

# =============================================================================
# dynamodb.tf - Session State Store
# =============================================================================

resource "aws_dynamodb_table" "session_state" {
  name         = "${var.cluster_name}-session-state"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "session_id"
  range_key    = "turn_id"

  attribute {
    name = "session_id"
    type = "S"
  }

  attribute {
    name = "turn_id"
    type = "N"
  }

  ttl {
    attribute_name = "expires_at"
    enabled        = true
  }

  tags = {
    Environment = var.environment
    Purpose     = "agent-session-state"
  }
}

# =============================================================================
# efs.tf - Shared Filesystem
# =============================================================================

resource "aws_efs_file_system" "agent_shared" {
  creation_token = "${var.cluster_name}-shared-fs"
  encrypted      = true

  tags = {
    Name = "${var.cluster_name}-shared-fs"
  }
}

resource "aws_efs_mount_target" "agent_shared" {
  count           = length(module.vpc.private_subnets)
  file_system_id  = aws_efs_file_system.agent_shared.id
  subnet_id       = module.vpc.private_subnets[count.index]
  security_groups = [aws_security_group.efs.id]
}

resource "aws_security_group" "efs" {
  name_prefix = "${var.cluster_name}-efs-"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port       = 2049
    to_port         = 2049
    protocol        = "tcp"
    security_groups = [module.eks.node_security_group_id]
  }
}

# =============================================================================
# helm.tf - Kubernetes Workload Deployment (OTEL Collector, ALB Controller)
# =============================================================================

resource "helm_release" "aws_load_balancer_controller" {
  name       = "aws-load-balancer-controller"
  repository = "https://aws.github.io/eks-charts"
  chart      = "aws-load-balancer-controller"
  namespace  = "kube-system"

  set {
    name  = "clusterName"
    value = module.eks.cluster_name
  }
}

resource "helm_release" "otel_collector" {
  name       = "otel-collector"
  repository = "https://open-telemetry.github.io/opentelemetry-helm-charts"
  chart      = "opentelemetry-collector"
  namespace  = "observability"
  create_namespace = true

  values = [<<-EOT
    mode: sidecar
    config:
      exporters:
        awsxray: {}
        awscloudwatchlogs:
          log_group_name: "/aws/eks/${var.cluster_name}/agent-traces"
      service:
        pipelines:
          traces:
            exporters: [awsxray]
          logs:
            exporters: [awscloudwatchlogs]
  EOT
  ]
}
```

```yaml
# =============================================================================
# kubernetes/agent-deployment.yaml - Agent Deployment Manifest
# =============================================================================

apiVersion: v1
kind: Namespace
metadata:
  name: agent-runtime
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: agent-sa
  namespace: agent-runtime
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ai-agent
  namespace: agent-runtime
spec:
  replicas: 2
  selector:
    matchLabels:
      app: ai-agent
  template:
    metadata:
      labels:
        app: ai-agent
    spec:
      serviceAccountName: agent-sa
      containers:
        - name: agent
          image: "${AGENT_IMAGE}"   # Substituted with Terraform variable
          ports:
            - containerPort: 8080
          env:
            - name: AWS_REGION
              value: "us-west-2"
            - name: SESSION_TABLE_NAME
              value: "agent-runtime-cluster-session-state"
            - name: BEDROCK_MODEL_ID
              value: "anthropic.claude-sonnet-4-20250514"
          resources:
            requests:
              cpu: "500m"
              memory: "1Gi"
            limits:
              cpu: "2000m"
              memory: "4Gi"
          volumeMounts:
            - name: shared-data
              mountPath: /mnt/shared
          livenessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 10
            periodSeconds: 30
          readinessProbe:
            httpGet:
              path: /ready
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 10
      volumes:
        - name: shared-data
          persistentVolumeClaim:
            claimName: agent-efs-pvc
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: ai-agent-hpa
  namespace: agent-runtime
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: ai-agent
  minReplicas: 2
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 60
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 70
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ai-agent-ingress
  namespace: agent-runtime
  annotations:
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: ip
    alb.ingress.kubernetes.io/listen-ports: '[{"HTTPS": 443}]'
    alb.ingress.kubernetes.io/healthcheck-path: /health
spec:
  ingressClassName: alb
  rules:
    - http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: ai-agent-svc
                port:
                  number: 80
---
apiVersion: v1
kind: Service
metadata:
  name: ai-agent-svc
  namespace: agent-runtime
spec:
  type: ClusterIP
  selector:
    app: ai-agent
  ports:
    - port: 80
      targetPort: 8080
```

> **Note**: The Terraform example above demonstrates the core infrastructure configuration. In production environments, you should additionally configure WAF, Secrets Manager integration, network policies (Calico/Cilium), Pod Disruption Budget, monitoring dashboards, etc.


#### Alternative 4: Amazon EC2

An approach where agent servers run directly on EC2 instances.

| Pros | Cons |
|------|------|
| Full OS-level control | Server patching, scaling, monitoring all manual |
| Local model inference with GPU instances | High availability must be configured manually (ALB, ASG) |
| Cost savings with long-term reservations (Reserved/Savings Plans) | Costs continue during idle time |
| Direct access for debugging and profiling | Session isolation, security boundaries all self-implemented |

#### AgentCore Runtime vs Self-Managed Comparison Summary

| Comparison Item | AgentCore Runtime | Lambda | ECS Fargate | EKS |
|-----------------|-------------------|--------|-------------|-----|
| **Session Isolation** | microVM automatic | None | Container level (self-implemented) | Pod level (self-implemented) |
| **Max Execution Time** | 8 hours | 15 minutes | Unlimited | Unlimited |
| **Cold Start** | ~200ms | 50~200ms+ | Tens of seconds (task start) | Tens of seconds (Pod scheduling) |
| **Filesystem** | Managed Storage + S3/EFS | /tmp (temporary) | EFS mount | EBS/EFS |
| **Observability** | Auto-integrated | Self-configured | Self-configured | Self-configured |
| **Identity Integration** | Built-in (inbound/outbound) | IAM self-configured | IAM self-configured | IRSA/Pod Identity |
| **Scaling** | Automatic | Automatic | Policy required | HPA/KEDA required |
| **Operational Burden** | Minimal | Low | Medium | High |
| **Cost Model** | Session-based | Invocation-based | Task runtime | Node runtime |
| **Best For** | Agent-dedicated production | Simple agents, intermittent calls | Long-running, sidecar needed | Multi-cloud, GPU, large scale |

> **Instructor Point**: The key differentiators of AgentCore Runtime are **microVM-based session isolation** and **agent-dedicated lifecycle management**. In self-managed approaches, you must implement session isolation, multi-turn conversation state management, async task management, and Identity integration all manually, which involves significant engineering overhead. However, if you have existing infrastructure investments or need integration with non-agent workloads, self-managed approaches may be more appropriate.

---

### Hosting Agentic Components

AgentCore Runtime can host not only agents but also MCP servers:

```
                    +-----------+
                    |  Client   |
                    +-----+-----+
                          v
                  +-----------------+
                  |Supervisor Agent |
                  +---+---+---+----+
                      |   |   |
        +-------------+   |   +-------------+
        v                 v                 v
+---------------------------------------------------------+
| Customer AWS Account                                    |
|                                                         |
| +-----------------+ +-----------------+ +-------------+ |
| |AgentCore Runtime| |AgentCore Runtime| |  AgentCore  | |
| |                 | |                 | |   Gateway   | |
| |  Agent 1        | |  MCP Server     | |             | |
| |  + Local Tools  | |  Tool 1, Tool 2 | | External    | |
| |                 | |                 | | Tools/API   | |
| +-----------------+ +-----------------+ +-------------+ |
+---------------------------------------------------------+
```
*Structure of hosting agents and MCP servers in AgentCore Runtime*

---

## 4. Runtime Core Concepts

### 4.1 Runtime and Hosting

The hosting layer that executes agent code. Managed serverlessly with no infrastructure provisioning required.

### 4.2 Endpoints and Versions

Addressable access points for specific agent versions.

**Version Management Flow**:

```
Step 1: Agent Creation + Default Endpoint (DEFAULT)
-----------------------------------------------
  Agent V1 <--- DEFAULT Endpoint

Step 2: Production Endpoint Creation
-----------------------------------------------
  Agent V1 <--- DEFAULT Endpoint
           <--- PROD Endpoint

Step 3: Agent Update (V2)
-----------------------------------------------
  Agent V2 <--- DEFAULT Endpoint (Latest)
  Agent V1 <--- PROD Endpoint (Stable)
```
*Agent version management and endpoint routing flow*

**Invocation Methods**:
```
POST /runtimes/{EncodedAgentARN}/invocations?accountId=accountId
POST /runtimes/{EncodedAgentARN}/invocations?accountId=accountId&qualifier=PROD
```

### 4.3 Sessions

Isolated execution contexts for user interactions. Each session runs in an independent microVM.

---


## 5. Session Isolation and Lifecycle

### True Session Isolation

The most important security characteristic of AgentCore Runtime:

```
+-----------------------------------------------------------------+
|                      AgentCore Runtime                          |
|                                                                 |
|  +-------------------------+   +-------------------------+      |
|  |    MicroVM Kernel 1     |   |    MicroVM Kernel 2     |      |
|  |  +--------+------+----+ |   |  +--------+------+----+ |     |
|  |  |Compute |Memory|File| |   |  |Compute |Memory|File| |     |
|  |  |        |      |Sys | |   |  |        |      |Sys | |     |
|  |  |        |      |tem | |   |  |        |      |tem | |     |
|  |  +--------+------+----+ |   |  +--------+------+----+ |     |
|  +------------+-------------+   +----------+--------------+    |
|               |     ❌ No Access            |                   |
|               +╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌+                   |
+----------------------------------------------------------------+
```
*Each session runs in a fully isolated microVM, making cross-session data access impossible*

**Full Isolation: No cross-session data access possible**

**Key Points**:
- Each session runs in a **fully isolated microVM** (compute + memory + filesystem)
- Without session isolation, local files and state would be accessible across all sessions → security risk
- Stateful: State is safely preserved within a session
- AgentCore Memory used for short/long-term session suspension states


### Session Lifecycle

```
          ●
          | Request Received
          v
+----------------------------------+
| Session Active                   |
| Processing sync request          |
| or running background task       |
+------------+---------------------+
             | Processing Complete
             v
+----------------------------------+
| Session Idle                     |<--- New request (return to Active)
| Complete, awaiting next call     |
+------------+---------------------+
             | 15min idle
             v
+----------------------------------+
| Session Timeout                  |
| Environment terminated after     |
| 15min idle                       |
+------------+---------------------+
             | Environment terminated
             v
+----------------------------------+
| Session Terminated               |
| Execution environment fully      |
| terminated                       |
+----------------------------------+

* Request timeout: 15min | Streaming: 60min | Max session: 8hrs (async)
```
*Session lifecycle: Active→Idle→Timeout→Terminated*

| State | Description |
|-------|-------------|
| **Session Active** | Processing sync request or performing background task |
| **Session Idle** | Processing complete, available for subsequent calls |
| **Session Timeout** | Execution environment terminated after 15 minutes idle |
| **Session Terminated** | Execution environment fully terminated |

🆕 **Managed Session Storage**: Filesystem state persists even after session termination (up to 1GB, 14-day retention). Agents can write code, install packages, create artifacts and restore state when the session resumes.

---

## 6. Asynchronous and Long-Running Tasks

### Async Task Pattern

A pattern where agents run long-duration tasks (report generation, data analysis, etc.) in the background
while returning an immediate response to the user:

```python
@tool
def start_background_task(duration: int = 5) -> str:
    # Start async task tracking
    task_id = app.add_async_task("report_generation", 
                                 {"duration": duration})
    
    # Execute task in background thread
    def background_work():
        # Work logic (data analysis, report generation, etc.)
        app.complete_async_task(task_id)  # Mark as complete
    
    threading.Thread(target=background_work, daemon=True).start()
    return f"Background task (ID: {task_id}) started for {duration} seconds."
```

**Key Points**:
- Can run for up to 8 hours
- Session remains active to preserve state
- User receives immediate response, can query results later

🆕 **Shell Command Execution** (`InvokeAgentRuntimeCommand`):
- Execute shell commands directly within the microVM (without model inference)
- Real-time output via HTTP/2 streaming
- Suitable for deterministic tasks like testing, building, deployment
- Focus agent resources on inference without token costs

---


## 7. Infrastructure and Deployment

### Deployment Method Comparison

```
+---------------------------------------------------------------------+
| Method 1: Container-based Deployment                                |
|   Agent Code + Dockerfile --> Amazon ECR --> Runtime Endpoint       |
+---------------------------------------------------------------------+

+---------------------------------------------------------------------+
| Method 2: Direct Code Deployment                                    |
|   Agent Code (.zip) ----------------------> Runtime Endpoint        |
+---------------------------------------------------------------------+

+---------------------------------------------------------------------+
| 🆕 Method 3: Managed Harness                                        |
|   Config (Model+Prompt+Tools) --2 API calls--> Runtime Endpoint     |
+---------------------------------------------------------------------+
```
*Comparison of three deployment methods for AgentCore Runtime*

**Method Characteristics**:
- **Method 1**: Maximum flexibility, custom dependencies, all frameworks supported
- **Method 2**: Fast deployment, simple packaging, Python 🆕 + Node.js support
- **🆕 Method 3**: No orchestration code required, isolated microVM, all model providers supported (GA - June 2026 NY Summit)


### Container-based Deployment Details

Components required for deployment:

| Component | Role |
|-----------|------|
| Agent code | Agent logic (framework + tools) |
| Dockerfile | Container image definition |
| AgentCore Runtime decorator | Agent entry point (`@app.entrypoint`) |
| AgentCore Observability configuration | Monitoring/tracing setup |
| AgentCore Identity configuration | Authentication/authorization setup |
| Runtime endpoint configuration | Scaling, timeout, resources |

### Direct Code Deployment Details

Deploy as .zip file without containers:
- Python or 🆕 Node.js runtime support
- 🆕 Python 3.14 support
- No Dockerfile required
- Suitable for rapid iterative development

---

## 8. Developer Tools and Experience

### AgentCore SDK (Python) - Agent Creation

```python
# agent.py - Agent code using AgentCore SDK
from bedrock_agentcore.runtime import BedrockAgentCoreApp
from strands import Agent
from strands.models.bedrock import BedrockModel

app = BedrockAgentCoreApp()

@app.entrypoint
def my_agent(request):
    """Agent entry point - AgentCore Runtime invokes via /invocations."""
    model = BedrockModel(model_id="anthropic.claude-sonnet-4-20250514")
    agent = Agent(
        system_prompt="You are a helpful AI assistant.",
        model=model
    )
    response = agent(request.get("input", ""))
    return {"output": str(response)}

if __name__ == "__main__":
    app.run()
```

**Key**: The `@app.entrypoint` decorator is the integration point with Runtime


### Container Image Build - Dockerfile Example

To deploy to AgentCore Runtime in a container-based manner, you need to package the agent as a Docker image.

**AgentCore Runtime Container Requirements**:
- **Architecture**: ARM64 required (`--platform linux/arm64`)
- **Endpoints**: `/invocations` (POST) - agent invocation, `/ping` (GET) - health check
- **Port**: 8080 (default)

```dockerfile
# Dockerfile
# AgentCore Runtime requires ARM64 architecture
FROM --platform=linux/arm64 python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy agent code
COPY agent.py .

# Port used by AgentCore Runtime for health checks
EXPOSE 8080

# Start agent
ENTRYPOINT ["python", "agent.py"]
```

```text
# requirements.txt
bedrock-agentcore>=1.0.0
strands-agents>=0.1.0
strands-agents-builder>=0.1.0
boto3>=1.35.0
```

**Image Build and ECR Push**:

```bash
# Build ARM64 image (native on Apple Silicon Mac, cross-build on x86)
docker build --platform linux/arm64 -t my-agent:latest .

# ECR login
aws ecr get-login-password --region us-west-2 | \
  docker login --username AWS --password-stdin 123456789012.dkr.ecr.us-west-2.amazonaws.com

# Tag and push
docker tag my-agent:latest 123456789012.dkr.ecr.us-west-2.amazonaws.com/my-agent:latest
docker push 123456789012.dkr.ecr.us-west-2.amazonaws.com/my-agent:latest
```

> **Note**: The Dockerfile structure above is based on requirements specified in the [AWS official documentation - Get started without the AgentCore CLI](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/getting-started-custom.html) (ARM64, `/invocations` POST, `/ping` GET endpoints). `BedrockAgentCoreApp` handles these endpoints automatically.

### AgentCore Runtime (boto3) - Agent Deployment

After writing agent code, deploy to Runtime using the boto3 `bedrock-agentcore-control` client.

```python
import boto3

client = boto3.client("bedrock-agentcore-control", region_name="us-west-2")

# Step 1: Create agent runtime (container-based deployment)
response = client.create_agent_runtime(
    agentRuntimeName="my-customer-service-agent",
    description="Customer service agent",
    roleArn="arn:aws:iam::123456789012:role/AgentCoreRuntimeRole",
    agentRuntimeArtifact={
        "containerConfiguration": {
            "containerUri": "123456789012.dkr.ecr.us-west-2.amazonaws.com/my-agent:latest"
        }
    },
    networkConfiguration={
        "networkMode": "PUBLIC"  # Or "VPC" (for private resource access)
    }
)

agent_runtime_arn = response["agentRuntimeArn"]
print(f"Runtime created: {agent_runtime_arn}")
```


```python
# Step 1 (Alternative): Direct code deployment (CodeZip)
import base64

with open("agent_package.zip", "rb") as f:
    zip_content = f.read()

response = client.create_agent_runtime(
    agentRuntimeName="my-agent-codezip",
    description="Direct code deployment agent",
    roleArn="arn:aws:iam::123456789012:role/AgentCoreRuntimeRole",
    agentRuntimeArtifact={
        "codeConfiguration": {
            "runtime": "python3.12",       # python3.10 ~ python3.14, nodejs20.x, etc.
            "entryHandler": "agent.main",   # module.function_name
            "sourceCode": {
                "zipContent": zip_content   # .zip binary
            }
        }
    },
    networkConfiguration={
        "networkMode": "PUBLIC"
    }
)
```

```python
# Step 2: Create agent runtime endpoint
endpoint_response = client.create_agent_runtime_endpoint(
    agentRuntimeId=response["agentRuntimeId"],
    agentRuntimeEndpointName="prod",
    description="Production endpoint"
)

endpoint_id = endpoint_response["agentRuntimeEndpointId"]
print(f"Endpoint created: {endpoint_id}")
```

```python
# Step 3: Invoke agent (Data Plane)
data_client = boto3.client("bedrock-agentcore", region_name="us-west-2")

invoke_response = data_client.invoke_agent_runtime(
    agentRuntimeArn=agent_runtime_arn,
    payload={
        "input": "I'd like to check my recent order status."
    },
    sessionId="user-session-001",    # Unique session ID for session isolation
    qualifier="prod"                 # Endpoint qualifier (defaults to DEFAULT if omitted)
)

print(invoke_response["output"])
```

> **Note**: The code above is written based on the API structure of the boto3 `bedrock-agentcore-control` (Control Plane) and `bedrock-agentcore` (Data Plane) clients. Exact parameter names may vary depending on the boto3 version at deployment time, so refer to the [official boto3 documentation](https://docs.aws.amazon.com/boto3/latest/reference/services/bedrock-agentcore-control.html).

### AgentCore Starter Toolkit - Agent Deployment

```bash
# 1. Set up deployment resources, IAM roles and authentication
agentcore configure

# 2. Deploy to AgentCore Runtime
agentcore launch

# 3. Invoke with payload
agentcore invoke
```

### 🆕 AgentCore CLI (GA) - Full Lifecycle Management

```bash
# Create project (choose framework)
agentcore init --framework strands

# Local development (hot reload + Agent Inspector UI)
agentcore dev

# Add capabilities
agentcore add memory
agentcore add identity
agentcore add gateway

# Production deployment
agentcore deploy

# Monitoring
agentcore logs
agentcore traces

# Resource cleanup
agentcore teardown
```

**Agent Inspector** (Browser UI when running `agentcore dev`):
- Real-time chat with agent
- Token usage and tool call inspection
- Execution trace timeline visualization
- AgentCore Memory browsing

### Approach Comparison

| Criteria | Starter Toolkit | Without Toolkit | 🆕 AgentCore CLI |
|----------|-----------------|-----------------|-----------------|
| **Automation Level** | ECR management, deployment automation | Manual control | Full lifecycle automation |
| **Flexibility** | Medium | Maximum | High |
| **Best For** | Quick start | Enterprise integration, advanced config | General development workflow |
| **Local Development** | Limited | Manual | Hot reload + Inspector |


### Getting Started Without Starter Toolkit (Manual Deployment)

1. Enable observability for your agent
2. Install uv (fast Python package manager)
3. Define agent code:
   - `/invocations` endpoint: POST for agent interactions
   - `/ping` endpoint: GET for health checks
4. Local testing
5. Create Dockerfile
6. Deploy to Amazon ECR
7. Deploy agent runtime

---


## 9. Knowledge Check and Key Takeaways

### Knowledge Check Questions

**Question 1**: What is the key security benefit of AgentCore Runtime's session isolation approach?
- ✅ **Answer: B** - Running each session in a fully isolated microVM with separate compute, memory, and filesystem
- Key: microVM-level isolation is the core (not simple process isolation)

**Question 2**: What feature is needed for long-duration data analysis + immediate user response + state preservation?
- ✅ **Answer: C** - Container-based deployment with async task processing
- Key: Async tasks + session state preservation + up to 8 hours execution

### Module Learning Objective Achievement

After completing this module, you will be able to:
- ✅ Deploy agents using frameworks supported by AgentCore Runtime
- ✅ Describe the core capabilities of AgentCore Runtime
- ✅ Configure serverless execution with session isolation

---

## 10. Additional Key Points - Instructor Supplementary Materials

### 10.1 🆕 Managed Harness Deep Dive

Managed Harness is the "fastest path," running agents without framework code:

```
+---------------------------------------------------------------------+
| Developer Defines                                                   |
|                                                                     |
|  Model              System        Tools           Memory   Identity |
|  (Bedrock,          Prompt        (MCP Server,    Config   Settings |
|   Anthropic,                       Gateway)                         |
|   OpenAI, Gemini)                                                   |
+-------------------------------------+-------------------------------+
                                      |
                                      v
+---------------------------------------------------------------------+
| AgentCore Manages                                                   |
|                                                                     |
|  Agentic Loop         Response     Session        Observability     |
|  (Reason->Tool Select  Streaming    Isolation      (Auto)       Cost |
|   ->Execute->Respond)                (microVM)                 Control|
+-------------------------------------+-------------------------------+
                                      |
                                      v
+---------------------------------------------------------------------+
| Additional Features                                                 |
|                                                                     |
|  Shell Command Execution    Persistent FS     S3 Files / EFS Mount  |
+---------------------------------------------------------------------+
```
*Developer-defined areas and AgentCore auto-managed areas in Managed Harness*

**🆕 Harness GA (June 2026 NY Summit)**:

Harness reached General Availability (GA) at AWS Summit New York in June 2026. Key updates:

| Item | Details |
|------|---------|
| **Build with 2 APIs** | `CreateHarness` to define the agent, `InvokeHarness` to execute |
| **Configuration-based definition** | Declare model, tools, skills, instructions as configuration and AgentCore assembles and runs the loop |
| **Built-in isolated environment** | Filesystem + shell, cross-session memory, skills (including AWS curated catalog), web browsing included by default |
| **Model-independent** | Model and harness separated → switch models mid-session without changing agent logic |
| **Export to code** | If custom orchestration is needed, export harness to code and continue using the same platform (no rebuild required) |
| **Unified platform integration** | Connect tools, security policies, organizational knowledge, web search, paid services through the same Gateway, with Identity/Memory/Observability auto-applied |

> **Key Message**: "The agent you declare first is the same agent operating at scale on the thousandth invocation" -
> The starting configuration runs at scale in production. Not a prototyping tool but a production foundation.


### 10.2 🆕 Runtime Performance Optimization

Recent updates have significantly improved Runtime performance:

| Improvement | Details |
|-------------|---------|
| **25-35% faster sequential calls** | Authentication token caching for 30 minutes eliminates redundant token requests |
| **Platform overhead TM99 35% reduction** | Based on PDX region |
| **Fast initialization** | Up to 200ms cold start |

### 10.3 🆕 Filesystem Support

Three ways agents can read and write files:

| Method | Characteristics | Use Cases |
|--------|----------------|-----------|
| **Managed Session Storage** | Persists across sessions, 1GB, 14 days | Code writing, package installation, artifacts |
| **Amazon S3 Files** | Auto-sync with S3 bucket | Shared data, prompt templates |
| **Amazon EFS** | Sub-millisecond latency, NFS share | Real-time collaboration, large datasets |

Mount configuration:
- Configured during `CreateRuntime` or `UpdateRuntime`
- Up to 5 mounts can be used simultaneously
- No custom mount code required, access via standard file operations

### 10.4 🆕 AG-UI Protocol Support

Agent User Interface protocol for real-time communication with frontends:

- Text chunk streaming
- Real-time reasoning step display
- Tool call and result visualization
- State synchronization (UI elements)
- Bidirectional WebSocket transport
- Official partnership with CopilotKit (AgentCore = recommended deployment target)

### 10.5 Runtime Security Best Practices

| Area | Recommendations |
|------|-----------------|
| **Network** | VPC deployment for private resource access, PrivateLink for control/data plane protection |
| **Authentication** | JWT Bearer or IAM SigV4, 🆕 OAuth WebSocket authentication |
| **IAM** | Least privilege execution roles, 🆕 VPC condition keys (`bedrock-agentcore:Subnets`, `SecurityGroups`) |
| **Sessions** | Leverage microVM isolation, sensitive data auto-deleted on session termination |
| **Audit** | Enable Observability, track all agent actions |

### 10.6 MCP Server Hosting Strategy

Two approaches for hosting MCP servers in Runtime:

| Approach | Advantages | Best For |
|----------|-----------|----------|
| **Local Hosting** (same Runtime as agent) | Minimized latency, reduced management overhead, process isolation | Frequent calls, low latency needed |
| **Remote Hosting** (separate Runtime) | Independent scaling, tool sharing across multiple agents, stack flexibility | Shared tools, independent deployment |

🆕 **Stateful MCP Support**: MCP servers hosted in Runtime maintain session context, enabling advanced features like Elicitation, Sampling, Progress Notifications

### 10.7 AgentCore Runtime Limitations and Considerations

Constraints and considerations to know before adopting AgentCore Runtime.

#### Service Quotas

| Item | Default Limit | Notes |
|------|---------------|-------|
| **Concurrent sessions** | us-east-1, us-west-2: 1,000 / Other regions: 500 | Increase requestable |
| **Session idle timeout** | 15 minutes (900 seconds) | Auto-terminated when idle |
| **Max session duration** | 8 hours (28,800 seconds) | Session itself can continue via new instance |
| **Termination grace period** | Up to 15 seconds | Wait for logging/process completion |
| **Shell sessions** | Up to 10 concurrent active per runtime | New connections rejected when exceeded |
| **Managed Session Storage** | 1GB, 14-day retention | |
| **Filesystem mounts** | Up to 5 simultaneous | |

> Source: [Quotas for Amazon Bedrock AgentCore](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/bedrock-agentcore-limits.html)

#### Architecture Constraints

| Constraint | Impact | Mitigation |
|------------|--------|------------|
| **ARM64 only** | Cannot use x86_64 images. Cross-build required | Use `docker buildx build --platform linux/arm64` |
| **15-minute idle termination** | Sessions may terminate unexpectedly during long waits | Use `add_async_task()` to keep session active or adjust lifecycle settings |
| **No cross-session state sharing** | microVM isolation prevents direct memory/file sharing between sessions | Use AgentCore Memory or external storage (DynamoDB, S3) |
| **NAT Gateway needed for VPC setup** | Additional costs when internet access needed in VPC mode | Use PUBLIC mode or VPC endpoints |


#### Cost Considerations

| Consideration | Details |
|---------------|---------|
| **Active resource consumption-based billing** | I/O wait and idle time are free (when no other background processes are running) |
| **Warmup costs** | Cold start occurs on restart after inactivity. Maintaining warm pools increases base costs |
| **High-frequency simple calls** | For simple request/response patterns (no session needed), Lambda may be more cost-effective |
| **LLM token costs separate** | Runtime costs and Bedrock model invocation costs are billed separately |

> Source: [Amazon Bedrock AgentCore Pricing](https://aws.amazon.com/bedrock/agentcore/pricing/)

#### Region Availability

AgentCore Runtime is not available in all AWS regions. It is available in major regions (us-east-1, us-west-2, eu-west-1, ap-northeast-1, etc.), and the Seoul region (ap-northeast-2) has been supported since January 2026. Check the [official endpoint documentation](https://docs.aws.amazon.com/general/latest/gr/bedrock_agentcore.html) for the latest available regions.

#### When NOT to Use AgentCore Runtime

| Scenario | Reason | Alternative |
|----------|--------|-------------|
| Simple request/response, no session needed | microVM isolation overhead is unnecessary cost | Lambda |
| Dependency on x86_64-only libraries | Native binaries that cannot be built for ARM64 | ECS/EKS (x86) |
| Leveraging existing Kubernetes infrastructure | More efficient to integrate with already-running clusters | EKS + self-implementation |
| GPU local inference needed | AgentCore Runtime does not support GPU instances | EKS GPU nodes or EC2 GPU |
| Multi-cloud/hybrid requirements | AWS-only service | Kubernetes (EKS/GKE/AKS) |
| Fine-grained network/security control needed | Managed service network configuration limitations | ECS/EKS + custom VPC |

> Source: [When to Use Bedrock AgentCore Runtime (vs Lambda)](https://virtuability.com/blog/2026-03-27-when-to-use-agentcore/) reference summary

### 10.8 Discussion Points for Class

1. **"Which Runtime features would you leverage when deploying your agent?"**
   - Session isolation, async tasks, filesystem, version management

2. **"Container vs direct code vs Harness - which approach would you choose?"**
   - Complexity, flexibility, development speed tradeoffs

3. **"What real use cases require 8-hour long-running execution?"**
   - Large-scale data analysis, code generation/testing, document processing

---

## Changes Summary vs Textbook

| Textbook Content (v1.0.4) | Current Status (May 2026) |
|----------------------------|---------------------------|
| 2 deployment methods | **3 methods** (+ Managed Harness, 🆕 NY Summit 2026 GA) |
| Python direct code only | **Python + Node.js** (+ Python 3.14) |
| No CLI mentioned | **AgentCore CLI GA** (v0.4.0) |
| State lost on session termination | **Managed Session Storage** (1GB, 14 days) |
| No filesystem | **S3 Files + EFS mount** (up to 5) |
| Basic streaming | **AG-UI Protocol + bidirectional WebSocket** |
| Basic performance | **25-35% latency improvement** |
| Basic MCP hosting | **Stateful MCP** (Elicitation, Sampling) |
| No basic shell access | **InvokeAgentRuntimeCommand** (direct shell execution) |

---

## References

- [AgentCore Runtime Official Documentation](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime.html)
- [AgentCore CLI Getting Started](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/agentcore-get-started-cli.html)
- [Managed Harness Documentation](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/harness.html)
- [Runtime Filesystem Configuration](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-filesystem-configurations.html)
- [Strands Agents SDK](https://github.com/strands-agents/sdk-python)
- [AgentCore CLI GitHub](https://github.com/aws/agentcore-cli)

---

*This document is based on the content of MLAGAC-10-KO-KR-M02-Runtime_InstructorDeck.pdf,
and content marked with 🆕 is instructor supplementary material reflecting the latest service updates as of May 2026.*

*Document version: 2.1 | Created: 2026-05-28 | Last modified: 2026-06-23 | Update basis: June 2026 AWS Summit New York reflected*
