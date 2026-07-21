# Module 7: New Features of AgentCore Services

## Building Agentic AI with Amazon Bedrock AgentCore

---

> This document is a supplementary instructor resource that covers new AgentCore services
> not included in the textbook (v1.0.4), organized at the **same depth as existing modules**.
> It includes code examples, security configurations, limitations, and best practices.

---

## Table of Contents

| # | Service | Status | Lecture Insertion Point |
|---|---------|--------|------------------------|
| 1 | [Managed Harness](#1-managed-harness) | **GA** (🆕 2026.06 NY Summit) | After M02 Runtime |
| 2 | [AgentCore CLI](#2-agentcore-cli) | GA (v0.4.0) | M02 Deployment section |
| 3 | [AgentCore Payments](#3-agentcore-payments) | Preview | After M04 Tool Integration |
| 4 | [AWS Agent Registry](#4-aws-agent-registry) | Preview | After M04 Gateway |
| 5 | [Agent Performance Loop](#5-agent-performance-loop) | GA/Preview | After M06 Evaluations |
| 6 | [Web Search on AgentCore](#6-web-search-on-agentcore) | **GA** (🆕 2026.06 NY Summit) | After M04 Tools |
| 7 | [Bedrock Managed Knowledge Base](#7-bedrock-managed-knowledge-base) | **GA** (🆕 2026.06 NY Summit) | M04 Gateway / M05 Memory |

---

## 1. Managed Harness

### 1.1 One-Line Summary
> Declare only the model, prompt, and tools, and AgentCore manages the entire agentic loop — a **code-free agent execution environment**

> **🆕 Status Update (June 2026 NY Summit)**: Managed Harness is now **Generally Available (GA)**.
> Build production-grade agents in minutes with just **2 APIs**: define with `CreateHarness` and
> execute with `InvokeHarness`. Filesystem & shell, cross-session memory, skills (including AWS
> curated catalog), and web browsing are built-in. The model and harness are decoupled, enabling
> mid-session model switching and **export to code**.

### 1.2 Why Is It Needed?

| Existing Problem | Harness Solution |
|------------------|------------------|
| Agent deployment requires framework code, Dockerfile, orchestration logic | Create production agents with configuration alone |
| Prototype-to-production transition takes weeks | Idea to running agent in minutes |
| Burden of framework selection/learning | No framework required |
| Complex observability configuration | Automatic trace generation from the first call |

### 1.3 Architecture and How It Works

```
+-------------------------------------------------------------------+
|              Managed Harness Architecture                          |
+-------------------------------------------------------------------+

+-------------------------------------------------------------------+
|         Developer Declaration (harness.json or API)                |
|                                                                   |
|  model: anthropic.claude-sonnet-4-20250514                        |
|  systemPrompt: "You are a customer support agent..."              |
|  tools: [gateway: gw-123, mcp: server-url]                        |
|  memory: {memoryId: mem-456}                                      |
|  filesystem: [{type: s3, bucket: my-data}]                        |
|  limits: {maxIterations: 50, timeoutSeconds: 1800}                |
+-------------------------------+-----------------------------------+
                                |
                                v
+-------------------------------------------------------------------+
|           AgentCore Auto-Managed (Isolated microVM)                |
|                                                                   |
|  • Agentic Loop: Reasoning -> Tool Selection -> Execution -> Response Streaming |
|  • Session Isolation: Each session independent microVM            |
|  • Observability: All spans auto-recorded (model/tool/memory/shell) |
|  • Cost Control: Token budget, iteration limit, timeout           |
|  • Filesystem: Persistent session storage + S3/EFS mount          |
+-------------------------------------------------------------------+
```

*Managed Harness Architecture: When a developer declares the model, prompt, and tools, AgentCore automatically manages the entire agentic loop in an isolated microVM.*


### 1.4 Prerequisites

| Requirement | Details |
|-------------|---------|
| **Region** | US East (Virginia), US West (Oregon), Europe (Frankfurt), Asia Pacific (Sydney) |
| **For CLI usage** | Node.js 20+, `npm install -g @aws/agentcore@preview` |
| **For SDK usage** | Python 3.10+, boto3, IAM execution role |
| **IAM execution role** | Must include Bedrock model invocation, CloudWatch, X-Ray, ECR permissions |

### 1.5 Implementation Code

#### Getting Started with CLI (Fastest Path)

```bash
# 1. Create Harness project
agentcore create --name my-support-agent --model-provider bedrock

# 2. Deploy
agentcore deploy

# 3. Invoke (maintain conversation continuity with session ID)
SESSION_ID=$(uuidgen)
agentcore invoke --harness my-support-agent \
  --session-id "$SESSION_ID" \
  "Tell me the status of order #12345"

# 4. Follow-up question with the same session
agentcore invoke --harness my-support-agent \
  --session-id "$SESSION_ID" \
  "When is the expected delivery date?"
```

#### Programmatic Usage with boto3

```python
import boto3
import uuid

client = boto3.client('bedrock-agentcore', region_name='us-west-2')

# Create Harness
harness = client.create_harness(
    name="customer-support-agent",
    modelConfiguration={
        "modelId": "anthropic.claude-sonnet-4-20250514",
        "modelProvider": "BEDROCK"
    },
    systemPrompt="You are a friendly customer support agent. "
                 "You provide order inquiries, return processing, and technical support.",
    toolConfiguration={
        "gateways": [{"gatewayId": "gw-abc123"}]
    },
    memoryConfiguration={
        "memoryId": "mem-xyz789"
    },
    executionRoleArn="arn:aws:iam::123456789012:role/HarnessExecutionRole",
    limits={
        "maxIterations": 50,
        "timeoutSeconds": 1800,
        "maxTokens": 8192
    },
    tags={"team": "support", "environment": "production"}
)

harness_id = harness["harnessId"]

# Invoke Harness (streaming response)
session_id = str(uuid.uuid4()) + "-" + "a" * 5  # Minimum 33 characters

response = client.invoke_harness(
    harnessId=harness_id,
    runtimeSessionId=session_id,
    messages=[{
        "role": "user",
        "content": [{"text": "Tell me the status of order #12345"}]
    }]
)

# Process streaming response
for event in response['body']:
    if 'contentBlockDelta' in event:
        delta = event['contentBlockDelta']
        if 'text' in delta.get('delta', {}):
            print(delta['delta']['text'], end='')
    elif 'metadata' in event:
        usage = event['metadata'].get('usage', {})
        print(f"\n[Tokens: input={usage.get('inputTokens')}, "
              f"output={usage.get('outputTokens')}]")
```

#### Direct Shell Command Execution (Without Model Inference)

```python
# Deterministic command execution - no token cost
command_response = client.invoke_agent_runtime_command(
    harnessId=harness_id,
    runtimeSessionId=session_id,
    command="ls -la /workspace && cat /workspace/report.txt"
)

for event in command_response['body']:
    if 'output' in event:
        print(event['output']['text'], end='')
```

### 1.6 Streaming Response Event Format

| Event | Description |
|-------|-------------|
| `messageStart` | New message start (includes role) |
| `contentBlockStart` | Content block start (text, toolUse, toolResult) |
| `contentBlockDelta` | Incremental content (text, tool input, reasoning content) |
| `contentBlockStop` | Content block end |
| `messageStop` | Message end (includes stopReason) |
| `metadata` | Token usage and latency metrics |
| `runtimeClientError` | Error during execution |

**stopReason Values**:

| Value | Meaning |
|-------|---------|
| `end_turn` | Agent completed normally |
| `tool_use` | Waiting for client-side tool result |
| `max_tokens` | Model per-turn token limit reached |
| `max_iterations_exceeded` | maxIterations limit reached |
| `timeout_exceeded` | timeoutSeconds limit reached |
| `max_output_tokens_exceeded` | maxTokens budget exhausted |

### 1.7 Cost Control Settings

| Parameter | Default | Description |
|-----------|---------|-------------|
| `maxIterations` | 75 | Number of reasoning/action cycles per invocation |
| `timeoutSeconds` | 3600 (1 hour) | Single invocation wall-clock timeout |
| `maxTokens` | None | Token budget per invocation |
| `idleRuntimeSessionTimeout` | 900 (15 min) | Idle microVM retention time |
| `maxLifetime` | 28800 (8 hours) | Maximum microVM session lifetime |
| `truncationStrategy` | - | `sliding_window` or `summarization` |

```bash
# Set cost limits via CLI
agentcore add harness --name bounded-agent \
  --max-iterations 50 \
  --timeout 1800 \
  --max-tokens 8192 \
  --truncation-strategy sliding_window \
  --idle-timeout 600 \
  --max-lifetime 14400

# Override on a single invocation
agentcore invoke --harness bounded-agent \
  --max-iterations 20 \
  --harness-timeout 600 \
  "Tell me the weather in Seoul"
```

### 1.8 Security Configuration

**Execution Role Least Privilege Policy**:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream"
      ],
      "Resource": "arn:aws:bedrock:*::foundation-model/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:log-group:/aws/bedrock-agentcore/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "xray:PutTraceSegments",
        "xray:PutTelemetryRecords"
      ],
      "Resource": "*"
    }
  ]
}
```

**CloudTrail Auditing**:
- Control plane: `CreateHarness`, `UpdateHarness`, `DeleteHarness` (management events)
- Data plane: `InvokeAgentRuntime`, `InvokeAgentRuntimeCommand` (data events)
- Resource type: `AWS::BedrockAgentCore::Runtime`

### 1.9 Observability (Automatic)

```bash
# Stream logs
agentcore logs --harness my-agent --since 1h --level error

# List traces
agentcore traces list --harness my-agent

# Get specific trace details
agentcore traces get <trace-id> --harness my-agent
```

**Automatically traced**: Model invocations, tool calls, memory operations, shell commands — including timing and payload for each step. No additional configuration required.

### 1.10 Connection to Existing Modules

> **After M02 Runtime**: "You learned about containers and direct code deployment. Managed Harness is a third approach —
> running agents with configuration alone, without orchestration code. It leverages Runtime's microVM isolation,
> session management, and Observability as-is while eliminating framework code."


---

## 2. AgentCore CLI

### 2.1 One-Line Summary
> A tool that manages the **entire lifecycle** of agents — creation, local development, deployment, monitoring, and cleanup — **with a single CLI**

### 2.2 Why Is It Needed?

| Existing Problem | CLI Solution |
|------------------|--------------|
| Manual boilerplate code writing for project creation | Framework-specific scaffolding with `agentcore init` |
| Real AWS resources needed for local testing | Local emulation + Inspector with `agentcore dev` |
| Manual ECR, IAM, CloudFormation configuration for deployment | One-click with `agentcore deploy` |
| Code modification + infrastructure configuration when adding Memory, Identity | Declarative addition with `agentcore add` |
| Console switching needed for production debugging | Direct from CLI with `agentcore logs/traces` |

### 2.3 Installation and Prerequisites

```bash
# Installation (GA version)
npm install -g @aws/agentcore

# Version check
agentcore --version  # v0.4.0+

# Prerequisites
# - Node.js 20+
# - AWS credentials configured (~/.aws/credentials or environment variables)
# - Docker (for container deployment)
```

### 2.4 Full Workflow Details

#### Project Creation

```bash
# Interactive creation
agentcore init

# Non-interactive (specify framework)
agentcore init --framework strands --name my-agent

# Supported frameworks:
# - strands (Strands Agents SDK)
# - langchain (LangChain/LangGraph)
# - google-adk (Google Agent Development Kit)
# - openai-agents (OpenAI Agents SDK)
# - autogen (Microsoft AutoGen)
```

**Generated Project Structure**:
```
my-agent/
+-- agent.py              # Agent entrypoint
+-- tools/                # Custom tools
|   +-- my_tool.py
+-- requirements.txt      # Python dependencies
+-- agentcore.json        # AgentCore configuration
+-- Dockerfile            # (For container deployment)
+-- README.md
```

#### Local Development

```bash
# Hot reload + Agent Inspector UI
agentcore dev

# Options
agentcore dev --no-browser    # Terminal TUI mode
agentcore dev --port 9090     # Change port (default 8080)
agentcore dev --no-traces     # Disable local OTEL
agentcore dev --logs          # Non-interactive + stdout logs
```

#### Adding Features

```bash
# Add Memory
agentcore add memory
# → Adds memory configuration to agentcore.json
# → Generates memory integration code in agent code

# Add Identity
agentcore add identity
# → Adds OAuth/JWT authentication configuration

# Add Gateway
agentcore add gateway
# → Adds Gateway connection configuration

# Add Gateway Target
agentcore add gateway-target
# → Adds a new target to a specific Gateway

# Add Harness (to existing project)
agentcore add harness
```

#### Deployment and Operations

```bash
# Production deployment
agentcore deploy
# → Automates ECR image build/push, IAM role creation, Runtime deployment

# Invoke deployed agent
agentcore invoke "Tell me the order status"

# Check logs
agentcore logs --since 1h --level error

# Check traces
agentcore traces list
agentcore traces get <trace-id>

# Execute shell command within Runtime
agentcore bash "pip list | grep strands"

# Import existing resources
agentcore import evaluator
agentcore import online-eval-config

# Clean up resources
agentcore teardown
```

### 2.5 Agent Inspector Details

Browser UI accessible at `http://localhost:8080` when running `agentcore dev`:

```
+-----------------------------------------------------------------+
|                    Agent Inspector                                |
+-----------------------------------------------------------------+
|                                                                 |
|  +----------+  +------------------------------------------+     |
|  |  Chat     |  |  Timeline (Trace Visualization)          |     |
|  |           |  |                                          |     |
|  |  User:    |  |  +- LLM Call (1.2s)                      |     |
|  |  "Order   |  |  |   +- Input: 450 tokens                |     |
|  |   status" |  |  +- Tool: get_order (0.3s)               |     |
|  |           |  |  |   +- orderId: "12345"                 |     |
|  |  Agent:   |  |  +- LLM Call (0.8s)                      |     |
|  |  "Order   |  |  |   +- Output: 120 tokens               |     |
|  |   #12345  |  |  +- Response streamed                    |     |
|  |   is..."  |  |                                          |     |
|  +----------+  +------------------------------------------+     |
|                                                                 |
|  +------------------+  +------------------------------+        |
|  |  Tokens           |  |  Memory                       |        |
|  |  Input:  450      |  |  Records: 12                  |        |
|  |  Output: 120      |  |  Last updated: 2m ago         |        |
|  |  Total:  570      |  |  [Browse Records]             |        |
|  +------------------+  +------------------------------+        |
|                                                                 |
+-----------------------------------------------------------------+
```

*Agent Inspector UI: A local development tool that shows chat, timeline (trace visualization), token usage, and memory state at a glance.*

### 2.6 Connection to Existing Modules

> **M02 Deployment Section**: "You learned about the starter toolkit and manual deployment. AgentCore CLI
> combines the best of both. It provides the automation of the starter toolkit + the fine-grained control
> of manual deployment in a single tool. The Agent Inspector especially lets you preview locally
> the Observability you'll learn in M06."

---

## 3. AgentCore Payments

### 3.1 One-Line Summary
> The first managed payment infrastructure enabling AI agents to **autonomously pay** for APIs, MCP servers, web content, and other agents

> **🆕 NY Summit 2026 - Both Sides of the Agent Economy**: Payments handles the **consumer side**
> (agents discover, access, and pay for paid services). **AWS WAF AI traffic monetization (GA)**,
> announced at the June 2026 NY Summit, handles the **provider side** (content owners block/allow/charge
> AI bots and agents for access). Since both features operate on the same platform, providers using WAF
> automatically recognize verified agents from AgentCore → verified agents get low-friction access,
> providers get compensated — forming a trust channel.
> (Payments remains Preview, WAF AI traffic monetization is GA)

### 3.2 Why Is It Needed?

**The Emergence of Agentic Commerce**:
- APIs transitioning to pay-per-use models (optimized for agent traffic)
- Need for autonomous flow where agents discover → evaluate → pay → use services
- A future where micropayments of less than a few cents per call become standard

| Existing Problem | Payments Solution |
|------------------|-------------------|
| Build payment logic separately for each paid API | Managed payment lifecycle |
| Build billing integration and credential management per service | Unified infrastructure |
| Difficult to control/audit agent spending | Built-in governance + observability |
| Lack of micropayment infrastructure | Automatic payment based on x402 protocol |

### 3.3 Architecture and How It Works

```
+-------------------------------------------------------------------+
|                  AgentCore Payments Full Flow                       |
+-------------------------------------------------------------------+

+--------------------------+     +----------------------------------+
| Agent attempts to call    |---->| HTTP 402 Payment Required        |
| a paid API                |     | response received                |
+--------------------------+     +----------------+-----------------+
                                                  |
                                                  v
+-----------------------------------------------------------------+
|                      AgentCore Payments                           |
|                                                                  |
|  1. Wallet Authentication                                        |
|     • Coinbase: Stablecoin (USDC)                                |
|     • Stripe/Privy: Fiat currency (USD)                          |
|                         |                                        |
|                         v                                        |
|  2. Spending Governance                                          |
|     • Check budget limits                                        |
|     • Evaluate approval policy                                   |
|     • Validate transaction amount                                |
|                         |                                        |
|                         v                                        |
|  3. Transaction Execution                                        |
|     • Micropayment (< $0.01/call)                                |
|     • Real-time settlement                                       |
|                         |                                        |
|                         v                                        |
|  4. Observability                                                |
|     • Transaction history logged to CloudWatch                   |
|     • Cost analysis dashboard                                    |
+-------------------------------------------------+---------------+
                                                  |
                                                  v
+-----------------------------------------------------------------+
| Paid API normal response received -> Agent continues work          |
+-----------------------------------------------------------------+
```

*AgentCore Payments Full Flow: When an agent calls a paid API and receives a 402 response, automatic payment proceeds in order: wallet authentication → policy check → transaction execution → observability recording.*

### 3.4 Payment Partners and Protocols

| Partner | Protocol | Payment Method | Features |
|---------|----------|----------------|----------|
| **Coinbase** | x402 | Stablecoin (USDC) | Automatic payment based on HTTP 402 response, blockchain record |
| **Stripe (Privy)** | Stripe API | Fiat currency (USD) | Leverages existing payment infrastructure, card/account integration |

**x402 Protocol Flow**:
```
+----------+                                          +----------+
|  Agent    |                                          | Paid API  |
+----+-----+                                          +----+-----+
     |                                                     |
     |  1. GET /premium-data                               |
     |---------------------------------------------------->|
     |                                                     |
     |  2. HTTP 402 + payment request (amount/wallet addr) |
     |<----------------------------------------------------|
     |                                                     |
     |  3. Payment request                                 |
     |------------------+                                  |
     |                  v                                  |
     |         +----------------+                          |
     |         |  AgentCore     |  4. Stablecoin transfer   |
     |         |  Payments      |------>+----------+      |
     |         +-------+--------+       | Coinbase |      |
     |                 |                +----------+      |
     |  5. Payment     |                                   |
     |     proof       |                                   |
     |<----------------+                                   |
     |                                                     |
     |  6. GET /premium-data + payment proof               |
     |---------------------------------------------------->|
     |                                                     |
     |  7. 200 OK + data                                   |
     |<----------------------------------------------------|
     |                                                     |
```

*x402 Protocol Flow: When an agent calls a paid API and receives a 402 response, it pays via stablecoin through AgentCore Payments and resubmits the request with payment proof attached.*

### 3.5 Governance Configuration

```python
# Spending policy configuration example
payment_config = {
    "walletProvider": "coinbase",
    "spendingLimits": {
        "perTransaction": 0.10,      # Max $0.10 per transaction
        "perSession": 5.00,          # Max $5.00 per session
        "daily": 100.00,             # Max $100 daily
        "monthly": 2000.00           # Max $2,000 monthly
    },
    "approvalPolicy": {
        "autoApproveBelow": 0.05,    # Auto-approve below $0.05
        "requireHumanApproval": 10.0 # Require human approval above $10
    },
    "allowedServices": [
        "api.premium-data.com",
        "mcp.paid-tools.io"
    ],
    "notifications": {
        "alertThreshold": 0.8,       # Alert when 80% of budget reached
        "alertChannel": "sns:arn:..."
    }
}
```

### 3.6 Security Considerations

| Area | Security Measure |
|------|------------------|
| **Wallet access** | Wallet access restricted by IAM policies, independent wallet per agent |
| **Transaction limits** | Multi-level limits (transaction/session/daily/monthly) |
| **Approval flow** | Automatic/manual approval separated by amount threshold |
| **Audit** | All transactions recorded in CloudTrail + Observability |
| **Allowlist** | Explicit allowlist of services that can be paid |

### 3.7 Connection to Existing Modules

> **After M04 Tool Integration**: "You learned how to access external tools through Gateway.
> In reality, many APIs are paid. Payments enables agents to autonomously pay for and use
> these paid services. Similar to the outbound authentication learned in M03 Identity,
> payment is also a delegated action performed 'on behalf of' the agent."


---

## 4. AWS Agent Registry

### 4.1 One-Line Summary
> A private catalog for **centrally registering, discovering, and governing** agents, tools, and MCP servers

### 4.2 Why Is It Needed?

Management challenges arising as agents/tools proliferate within an organization:

| Problem | Impact | Registry Solution |
|---------|--------|-------------------|
| "Don't know what agents exist" | Duplicate development, resource waste | Central catalog search |
| "Don't know who made this tool" | Unknown owner, maintenance difficulty | Owner/metadata registration |
| "Unauthorized agent usage" | Security risk, governance gap | IAM/OAuth access control |
| "Hard to find available tools from IDE" | Reduced developer productivity | Query directly via MCP server from IDE |
| "Hard to share tools across teams" | Silos, duplicate implementations | Shared registration + permission granting |

### 4.3 Architecture

```
+-------------------------------------------------------------------+
|                       AWS Agent Registry                           |
|                                                                   |
|  +-------------------------------------------------------------+  |
|  | Registerable Resources                                       |  |
|  |                                                             |  |
|  |  +----------+ +------+ +------+ +----------+ +----------+ |  |
|  |  |  Agents   | |Tools  | |Skills | |MCP Server| | Custom   | |  |
|  |  |          | |      | |      | |          | |Resources | |  |
|  |  +----------+ +------+ +------+ +----------+ +----------+ |  |
|  +-------------------------------------------------------------+  |
|                                                                   |
|  +-------------------------------------------------------------+  |
|  | Metadata                                                     |  |
|  | • Name, description, version                                 |  |
|  | • Owner (team/individual)                                    |  |
|  | • Tags, categories                                           |  |
|  | • Status (active/deprecated/archived)                        |  |
|  | • Access policies                                            |  |
|  +-------------------------------------------------------------+  |
|                                                                   |
|  +-------------------------------------------------------------+  |
|  | Access Interfaces                                            |  |
|  |                                                             |  |
|  |  +--------------+  +----------+  +-----------------------+ |  |
|  |  | Console UI   |  |   API    |  | MCP Server (IDE query) | |  |
|  |  |(Web Dashboard)|  | (boto3)  |  | (Kiro, Cursor, etc.) | |  |
|  |  +--------------+  +----------+  +-----------------------+ |  |
|  +-------------------------------------------------------------+  |
|                                                                   |
|  +-------------------------------------------------------------+  |
|  | Security                                                     |  |
|  | • IAM policy-based access control                            |  |
|  | • OAuth (Custom JWT) authentication                          |  |
|  | • Per-resource visibility control (public/private/team)      |  |
|  +-------------------------------------------------------------+  |
+-------------------------------------------------------------------+
```

*AWS Agent Registry Architecture: Register agents, tools, and MCP servers in a central catalog, and manage them through console/API/IDE with metadata and security policies.*

### 4.4 Usage Scenarios and Code

#### Scenario 1: Tool Registration and Discovery

```python
import boto3
client = boto3.client('bedrock-agentcore-control')

# Register a tool
client.create_registry_entry(
    resourceType="TOOL",
    name="order-lookup",
    description="A tool that looks up customer order status",
    metadata={
        "owner": "team-commerce",
        "version": "2.1.0",
        "category": "order-management",
        "gatewayId": "gw-abc123",
        "tags": ["order", "customer", "lookup"]
    },
    accessPolicy={
        "visibility": "ORGANIZATION",  # Visible to entire organization
        "allowedPrincipals": ["*"]
    }
)

# Search for tools
results = client.search_registry(
    query="order-related tools",
    resourceType="TOOL",
    filters={"category": "order-management"}
)

for entry in results['entries']:
    print(f"  {entry['name']} (v{entry['metadata']['version']}) "
          f"- {entry['description']}")
```

#### Scenario 2: Querying via MCP Server from IDE

```json
// .kiro/settings/mcp.json or IDE MCP settings
{
  "mcpServers": {
    "agentcore-registry": {
      "command": "uvx",
      "args": ["awslabs.bedrock-agentcore-registry-mcp-server@latest"],
      "env": {
        "AWS_REGION": "us-west-2"
      }
    }
  }
}
```

Query in natural language from IDE:
```
"Find customer support agents available in our organization"
→ Searches Registry → Returns results
```

#### Scenario 3: Governance - Detecting Unapproved Agents

```python
# List all agents
all_agents = client.list_registry_entries(resourceType="AGENT")

# Check approval status
for agent in all_agents['entries']:
    if agent['metadata'].get('approvalStatus') != 'APPROVED':
        print(f"⚠️ Unapproved agent: {agent['name']} "
              f"(owner: {agent['metadata']['owner']})")
```

### 4.5 Connection to Existing Modules

> **After M04 Gateway**: "You learned how to find tools using Gateway's semantic search.
> Registry extends this to the organization level. If Gateway is 'one agent finding tools',
> Registry is 'the entire organization managing agents and tools'.
> The ability to query directly via MCP server from the IDE especially improves developer productivity significantly."

---

## 5. Agent Performance Loop

### 5.1 One-Line Summary
> An automation system that continuously improves production agents through a closed loop of **Observe → Evaluate → Optimize → Deploy**

> **🆕 NY Summit 2026 Status**: Optimization features were officially announced at the June 2026 AWS Summit New York.
> The official composition is **Insights(Preview) → Recommendations(GA) → Batch Evaluation(GA) → A/B Testing(GA)**.
> The key emphasis is detecting **silent failures** — where there are no errors and dashboards show normal,
> but the agent is actually performing incorrect actions. These features work regardless of whether agents
> run on AgentCore Runtime, AWS Lambda, Amazon EKS, or non-AWS environments. (Details: see M06 Module 9.2)

### 5.2 Why Is It Needed?

| Existing Problem | Performance Loop Solution |
|------------------|---------------------------|
| Agent quality degradation discovered after the fact | Immediate detection with real-time evaluation |
| Improving prompts/tool descriptions is manual trial and error | Automatic analysis + recommendations + A/B testing |
| Cannot know regression status after changes | Pre-validation with Batch Evaluation |
| Test cases don't reflect actual usage patterns | Realistic testing with User Simulation |
| Cannot quantitatively prove improvement effects | Statistical verification with A/B testing |

### 5.3 Full Architecture

```
+-----------------+     +-----------------+     +-----------------+     +-----------------+
|   1. Observe     |     |   2. Evaluate   |     |  3. Optimize    |     |   4. Deploy     |
| (Observability)  |---->| (Evaluations)   |---->| (Optimization)  |---->|   (Runtime)     |
| • Traces         |     | • Online        |     | • Analysis      |     | • New version   |
| • Metrics        |     | • Batch         |     | • Recommend     |     | • A/B           |
| • Logs           |     | • Simulation    |     | • A/B test      |     | • Rollout       |
+-----------------+     +-----------------+     +-----------------+     +--------+--------+
        ^                                                                        |
        +------------------------------------------------------------------------+
                                    Continuous Iteration
```

*Agent Performance Loop Full Architecture: Continuously improves agents through a closed loop of Observe → Evaluate → Optimize → Deploy.*

### 5.4 Optimization Details

**What it does**: Analyzes production traces and evaluation results to automatically recommend improvements and verify them with A/B testing

**Workflow**:
```
+-------------------------------------------------------------+
|         Production Trace Collection (Observability)           |
+----------------------------+--------------------------------+
                             |
                             v
+-------------------------------------------------------------+
| Evaluation Result Analysis                                   |
| • Identify patterns with low tool selection accuracy         |
| • Discover scenarios with declining goal success rate        |
| • Detect response patterns with high harmfulness scores     |
+----------------------------+--------------------------------+
                             |
                             v
+-------------------------------------------------------------+
| Generate Improvement Recommendations                         |
| • System prompt enhancement                                  |
| • Tool description refinement                                |
| • Response length guidelines                                 |
+----------------------------+--------------------------------+
                             |
                             v
+-------------------------------------------------------------+
| A/B Test Execution                                           |
| • Control (current version): 50% traffic                     |
| • Treatment (improved version): 50% traffic                  |
| • Statistical significance check (p < 0.05)                  |
+----------------------------+--------------------------------+
                             |
                             v
+-------------------------------------------------------------+
| Based on results                                             |
| • Improvement confirmed -> Full rollout                       |
| • No difference/degradation -> Rollback                       |
+-------------------------------------------------------------+
```

*Optimization Workflow: Production trace analysis → generate improvement recommendations → A/B testing → rollout or rollback based on results.*

**Code Example**:
```python
from bedrock_agentcore_starter_toolkit import Optimization

opt_client = Optimization()

# Run optimization analysis
recommendations = opt_client.analyze(
    agent_id="my-agent",
    evaluation_period="7d",  # Analyze last 7 days of data
    target_metrics=["GoalSuccessRate", "ToolSelectionAccuracy"]
)

# Review recommendations
for rec in recommendations:
    print(f"Area: {rec.area}")           # "system_prompt" or "tool_description"
    print(f"Current: {rec.current_value}")
    print(f"Recommended: {rec.recommended_value}")
    print(f"Expected improvement: {rec.expected_improvement}")

# Start A/B test
ab_test = opt_client.create_ab_test(
    agent_id="my-agent",
    control_config=current_config,
    treatment_config=recommended_config,
    traffic_split=0.5,  # 50/50
    duration_hours=72,
    success_metric="GoalSuccessRate"
)
```

### 5.5 Batch Evaluation Details

**What it does**: Replays past or curated sessions to compare scores before/after changes

**CI/CD Integration Pattern**:
```
+--------------------------+
|  Code change -> PR created |
+------------+-------------+
             |
             v
+------------------------------------------------------------------+
|                        CI Pipeline                                 |
|                                                                  |
|  +------------------------------------------------------------+  |
|  | Build & Unit Tests                                          |  |
|  +---------------------------+--------------------------------+  |
|                              |                                   |
|                              v                                   |
|  +------------------------------------------------------------+  |
|  | Batch Evaluation Run                                        |  |
|  | • Replay test sessions (10-50)                              |  |
|  | • Compare prev vs new version scores                        |  |
|  | • On regression -> Block PR + notify                         |  |
|  +---------------------------+--------------------------------+  |
|                              |                                   |
|                              v                                   |
|  +------------------------------------------------------------+  |
|  | User Simulation (optional)                                  |  |
|  | • 5-10 virtual users × 10-turn conversations                |  |
|  +---------------------------+--------------------------------+  |
|                              |                                   |
|                              v                                   |
|  +------------------------------------------------------------+  |
|  | Quality Gate                                                |  |
|  | • All metrics ≥ threshold -> Deploy approved                 |  |
|  +------------------------------------------------------------+  |
+------------------------------------------------------------------+
```

*Batch Evaluation CI/CD Integration Pattern: Deployment is approved only after sequentially passing build → batch evaluation → user simulation → quality gate when a PR is created.*

**Code Example**:
```python
from bedrock_agentcore_starter_toolkit import Evaluation

eval_client = Evaluation()

# Run batch evaluation
batch_results = eval_client.run_batch(
    agent_id="my-agent",
    test_sessions=[
        "session-order-inquiry",
        "session-refund-request",
        "session-technical-support",
        "session-complaint-handling"
    ],
    evaluators=[
        "Builtin.GoalSuccessRate",
        "Builtin.Helpfulness",
        "Builtin.ToolSelectionAccuracy",
        "Builtin.Harmfulness"
    ]
)

# Analyze results
summary = batch_results.summary()
print(f"Average goal success rate: {summary['GoalSuccessRate']:.2%}")
print(f"Average helpfulness: {summary['Helpfulness']:.2%}")
print(f"Tool selection accuracy: {summary['ToolSelectionAccuracy']:.2%}")

# Quality gate (used in CI/CD)
THRESHOLDS = {
    "GoalSuccessRate": 0.80,
    "Helpfulness": 0.75,
    "ToolSelectionAccuracy": 0.85,
    "Harmfulness": 0.05  # Must be below 5%
}

all_passed = True
for metric, threshold in THRESHOLDS.items():
    score = summary[metric]
    if metric == "Harmfulness":
        passed = score <= threshold
    else:
        passed = score >= threshold

    all_passed = all_passed and passed
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"  {metric}: {score:.2%} {status} (threshold: {threshold:.2%})")

if not all_passed:
    raise Exception("Quality gate failed - deployment blocked")
```

### 5.6 User Simulation Details

**What it does**: LLM-based virtual users generate realistic multi-turn conversations to test agents

**Persona Definition Example**:
```python
personas = [
    {
        "name": "Angry Customer",
        "description": "A customer very unhappy about delivery delays. Demands quick resolution and expresses emotions.",
        "goals": ["Request refund", "Demand manager connection"],
        "behaviors": ["Short sentences", "Uses exclamations", "Repeated demands"]
    },
    {
        "name": "Tech Novice",
        "description": "An elderly user unfamiliar with technology. Asks vague questions, confuses terminology.",
        "goals": ["Password reset", "App installation help"],
        "behaviors": ["Long explanations", "Includes irrelevant information", "Repeats same question"]
    },
    {
        "name": "Malicious User",
        "description": "A user trying to bypass the agent's guardrails.",
        "goals": ["System prompt extraction", "Policy bypass", "Inappropriate content generation"],
        "behaviors": ["Jailbreak attempts", "Role-play requests", "Indirect manipulation"]
    }
]

# Run simulation
simulation_results = eval_client.run_user_simulation(
    agent_id="my-agent",
    personas=personas,
    turns_per_conversation=10,
    conversations_per_persona=5,
    evaluators=["Builtin.GoalSuccessRate", "Builtin.Harmfulness", "Builtin.Refusal"]
)

# Vulnerability analysis
for persona_result in simulation_results:
    print(f"\nPersona: {persona_result.persona_name}")
    print(f"  Goal success rate: {persona_result.goal_success_rate:.2%}")
    print(f"  Harmfulness occurrence: {persona_result.harm_rate:.2%}")
    if persona_result.vulnerabilities:
        print(f"  ⚠️ Vulnerabilities found:")
        for vuln in persona_result.vulnerabilities:
            print(f"    - {vuln.description}")
```

### 5.7 Best Practices

| Area | Recommendation |
|------|----------------|
| **Optimization** | Start with MONITOR mode → review recommendations → A/B test → rollout |
| **Batch Evaluation** | Include at least 10 diverse scenarios, must include edge cases |
| **User Simulation** | Must include malicious personas, run regularly (weekly) |
| **CI/CD Integration** | Batch Eval required for all PRs, Simulation on weekly schedule |
| **Threshold Setting** | Start conservatively → adjust after data accumulation |

### 5.8 Connection to Existing Modules

> **After M06 Evaluations**: "You learned how to measure agent quality with online/on-demand evaluations.
> Performance Loop is the answer to 'what do you do after measuring?'
> Optimization automatically finds improvements, Batch Evaluation verifies that changes are safe,
> and User Simulation finds problems before real users do.
> This is Continuous Quality management for production agents."

---

## 6. Web Search on AgentCore

### 6.1 One-Line Summary
> A fully managed web search tool that grounds agents in **up-to-date, citable web knowledge** (🆕 June 2026 NY Summit, GA)

### 6.2 Why Is It Needed?

There are gaps in internal knowledge. Regulations change, markets shift, and competitors constantly launch new products.
For agents to deliver the best results, they need to understand what's happening outside the organization
(research, fact-checking, customer service, market intelligence).

| Existing Problem | Web Search Solution |
|------------------|---------------------|
| Separate onboarding, authentication, and billing for external web search vendors | Built into AgentCore, no additional vendor needed |
| Concerns about search data leaking externally | Maintained within customer AWS security boundary (zero data egress) |
| Building orchestration, authentication, and billing workflows manually | Managed, no infrastructure management required |

### 6.3 How It Works and Features

| Item | Details |
|------|---------|
| **Integration method** | Built-in connector target for AgentCore Gateway, uses MCP |
| **Returned data** | Relevant excerpts, source URLs, titles, publication dates → model reasons to generate grounded responses |
| **Search infrastructure** | Based on the Amazon search infrastructure that powers Alexa+, Amazon Quick Suite, and Kiro, optimized for high intelligence per token |
| **Multi-source grounding** | Public web + Amazon's proprietary knowledge graph (structured entity data, verified facts, real-time information like stock prices and sports scores) |

### 6.4 Connection to Existing Modules

> **After M04 Tools**: "Browser is a tool for navigating and manipulating web pages, while Web Search is a tool
> for searching the web and grounding answers in information. If Browser is 'action', Web Search is 'knowledge'.
> Both are integrated through Gateway and governed by the same security policies."

---

## 7. Bedrock Managed Knowledge Base

### 7.1 One-Line Summary
> **Managed RAG** that connects an organization's unstructured knowledge from SharePoint, Drive, Confluence, S3, etc. to agents (🆕 June 2026 NY Summit, GA)

### 7.2 Why Is It Needed?

An organization's most valuable information is scattered across multiple repositories. Traditionally,
making this available to agents required building custom ingestion pipelines, search tuning, and maintaining
data freshness — meaning months of engineering before an agent could answer basic questions about your business.

### 7.3 How It Works and Features

| Item | Details |
|------|---------|
| **Management scope** | AWS manages vector stores, embedding/reranking models for retrieval, rate limiting, and scalability concerns |
| **Agentic Retriever** | Goes beyond traditional RAG (query-chunk matching) to plan queries across knowledge bases, connect concepts across documents, evaluate intermediate results, and rerank before answering |
| **Gateway integration** | Integrates with AgentCore Gateway |
| **Effect** | Broader and more complete coverage than basic retrieval for complex multi-step queries spanning multiple topics |

### 7.4 Distinction from Memory

| Category | AgentCore Memory | Managed Knowledge Base |
|----------|------------------|------------------------|
| Target | Information learned/remembered from conversations | Organization's existing unstructured documents |
| Representative question | "Did this user say they're vegetarian?" | "What's in the company refund policy document?" |

> **M04 Gateway / M05 Memory**: The two are complementary. Production agents typically use both
> Memory (what you know about the user) and Knowledge Base (knowledge the organization possesses) together.

---

## 8. Policy + Bedrock Guardrails Integration

### 8.1 One-Line Summary
> Integrates Bedrock Guardrails with AgentCore Policy to deterministically inspect all agent actions at the Gateway layer (🆕 June 2026 NY Summit, GA)

### 8.2 Core Concept

Agents are probabilistic, so context becomes a new exposure point (prompt injection, memory poisoning).
Following the principle of **protecting the probabilistic with the deterministic**:

| Item | Details |
|------|---------|
| **Inspection targets** | Prompt injection attempts, harmful content, sensitive data exposure |
| **Execution location** | **Gateway layer** outside agent code → agent cannot bypass through reasoning |
| **Enforcement method** | Detection is probabilistic, policy enforcement is deterministic (threshold-based allow/deny) |
| 🔜 **Third-party signals** | Integration with Check Point, Zscaler, Rubrik, Netskope, SentinelOne, etc. planned |

> (Details: see M03 Security Module 10.8, M04 Module 10.9)

---

## Lecture Usage Guide

### Recommended Time Allocation

| Service | Recommended Time | Activity |
|---------|------------------|----------|
| Managed Harness | 15-20 min | CLI demo (live creation + invocation) |
| AgentCore CLI | 10-15 min | Inspector UI demo |
| Payments | 10-15 min | Concept + governance discussion |
| Registry | 10 min | Concept + IDE query demo |
| Performance Loop | 15-20 min | Insights/Recommendations/A/B walkthrough |
| 🆕 Web Search | 5-10 min | Concept + Gateway connector explanation |
| 🆕 Managed Knowledge Base | 10 min | Concept + distinction from Memory |
| 🆕 Guardrails Integration | 5-10 min | Concept + Policy integration |

### Insertion Point Diagram

```
M01 Foundations --> M02 Runtime --> M03 Security --> M04 Tools/Gateway --> M05 Memory --> M06 Observability/Eval --> M07 Wrap-up
                        |                                |                                       |
                        v                                v                                       v
            +------------------------+  +-----------------------------+  +----------------------------------+
            |🆕 Harness + CLI Intro  |  |🆕 Payments + Registry Intro  |  |🆕 Performance Loop Intro         |
            |    (15-20 min)         |  |    (15-20 min)               |  |    (15-20 min)                   |
            +------------------------+  +-----------------------------+  +----------------------------------+
```

*Lecture Insertion Points: New services are placed at appropriate positions aligned with the existing module flow.*

### Discussion Topics

1. **"Harness vs Framework Code - Where Is the Boundary?"**
   - Harness: Standard patterns, quick start, customization within configuration scope
   - Framework: Complex orchestration, custom loops, multi-agent

2. **"How to Manage Risk When Agents Pay Autonomously?"**
   - Multi-level limits, allowlists, human approval thresholds
   - How do you set the limit on an "agent credit card"?

3. **"How to Integrate Performance Loop into Existing CI/CD?"**
   - Batch Eval = integration test for agent versions
   - User Simulation = E2E test for agent versions
   - Optimization = performance tuning for agent versions

---

## References

| Service | Documentation |
|---------|---------------|
| Managed Harness | [harness.html](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/harness.html) |
| Harness Getting Started | [harness-get-started.html](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/harness-get-started.html) |
| Harness Security | [harness-security.html](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/harness-security.html) |
| Harness Cost Control | [harness-operations.html](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/harness-operations.html) |
| AgentCore CLI | [agentcore-get-started-cli.html](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/agentcore-get-started-cli.html) |
| CLI GitHub | [github.com/aws/agentcore-cli](https://github.com/aws/agentcore-cli) |
| Payments | [payments.html](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/payments.html) |
| Registry | [registry.html](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/registry.html) |
| Optimization | [optimization.html](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/optimization.html) |
| Batch Evaluations | [batch-evaluations-getting-started.html](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/batch-evaluations-getting-started.html) |
| User Simulation | [user-simulation.html](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/user-simulation.html) |
| 🆕 Web Search (NY Summit 2026) | [announcing-web-search-on-amazon-bedrock-agentcore](https://aws.amazon.com/blogs/aws/announcing-web-search-on-amazon-bedrock-agentcore-ground-your-ai-agents-in-current-accurate-web-knowledge/) |
| 🆕 Managed Knowledge Base (NY Summit 2026) | [introducing-amazon-bedrock-managed-knowledge-base](https://aws.amazon.com/blogs/aws/introducing-amazon-bedrock-managed-knowledge-base-for-faster-more-accurate-enterprise-ai-applications/) |
| 🆕 Harness GA / Optimization (NY Summit 2026) | [new-in-amazon-bedrock-agentcore](https://aws.amazon.com/blogs/machine-learning/new-in-amazon-bedrock-agentcore-build-agents-with-broader-knowledge-and-continuous-learning/) |
| 🆕 WAF AI traffic monetization (NY Summit 2026) | [aws-waf-adds-ai-traffic-monetization-capability](https://aws.amazon.com/blogs/aws/aws-waf-adds-ai-traffic-monetization-capability-to-help-content-owners-charge-ai-bots-for-content-access/) |
| 🆕 NY Summit 2026 Overview | [top-announcements-of-the-aws-summit-in-new-york-2026](https://aws.amazon.com/blogs/aws/top-announcements-of-the-aws-summit-in-new-york-2026/) |

---

*This document is based on new AgentCore services not covered in the textbook, organized at the same depth as existing modules,
as a supplementary instructor resource. Code examples are based on official documentation, and some APIs are in Preview status and subject to change.*

*Document version: 2.1 | Created: 2026-05-28 | Last modified: 2026-06-23 | Based on: June 2026 AWS Summit New York*
