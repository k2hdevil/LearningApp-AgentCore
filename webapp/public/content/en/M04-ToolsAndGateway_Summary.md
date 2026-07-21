# Module 4: Tool Integration with AgentCore

## Building Agentic AI with Amazon Bedrock AgentCore

---

## Table of Contents

1. [Tool Integration Patterns Overview](#1-tool-integration-patterns-overview)
2. [AgentCore Built-in Tools](#2-agentcore-built-in-tools)
3. [MCP (Model Context Protocol)](#3-mcp-model-context-protocol)
4. [MCP Server Implementation and Hosting](#4-mcp-server-implementation-and-hosting)
5. [AgentCore Gateway Overview](#5-agentcore-gateway-overview)
6. [Gateway Target Types and Integration Patterns](#6-gateway-target-types-and-integration-patterns)
7. [Gateway Authentication and Authorization](#7-gateway-authentication-and-authorization)
8. [AgentCore Policy](#8-agentcore-policy)
9. [Knowledge Check and Key Takeaways](#9-knowledge-check-and-key-takeaways)
10. [Additional Key Points - Instructor Supplementary Material](#10-additional-key-points---instructor-supplementary-material)

> 🆕 Marker: Content added/changed after the textbook (v1.0.4, April 2026 build)

---

## 1. Tool Integration Patterns Overview

### Two Categories of Tools

Tools used by agents are broadly divided into **local tools** and **remote tools**:

| Category | Type | Characteristics |
|----------|------|-----------------|
| **Local Tools** | Framework-provided tools | Pre-built libraries, community-tested, rapid development |
| **Local Tools** | Runtime-defined tools | Maximum customization, direct access to internal systems, optimized for specific use cases |
| **Remote Tools** | Via AgentCore Gateway | Central management, authentication integration, semantic search |
| **Remote Tools** | External MCP servers | Standard protocol, independent scaling, tool sharing |

### Tool Integration Decision Tree

```
Need a tool?
|
+-- AWS managed tools sufficient?
|   +-- Web browsing needed ----> [AgentCore Browser]
|   +-- Code execution needed --> [AgentCore Code Interpreter]
|
+-- Existing API/service available?
|   +-- REST API ---------------> [Gateway (OpenAPI Target)]
|   +-- Lambda function --------> [Gateway (Lambda Target)]
|   +-- MCP server ------------> [Gateway (MCP Server Target)]
|
+-- Custom logic needed?
    +-- Latency critical -------> [Local MCP Server (in Runtime)]
    +-- Shared/independent -----> [Remote MCP Server]
```
*Tool integration decision tree for choosing the appropriate approach*

---

## 2. AgentCore Built-in Tools

### AgentCore Browser

**Serverless browser infrastructure for web browsing and workflow automation**


**Operation Flow**:
```
+--------------------------+
| User Query               |
| ("Buy shoes on Amazon")  |
+------------+-------------+
             v
+--------------------------+    +------------------------------------------+
|         Agent            |--->| LLM (Convert instructions to commands)   |
+------------+-------------+    +------------------+-----------------------+
             |                                     |
             |                                     v
             |                  +------------------------------------------+
             |                  | Computer Tool Call:                      |
             |                  | {type: "click", button: "left",          |
             |                  |  x:286, y:102}                           |
             |                  +------------------------------------------+
             v
+--------------------------+
| Execution Environment    |
| (Headless Browser)       |
+------------+-------------+
             v
+--------------------------+
| Execute Command ->        |
| Screenshot Capture ->     |
| Return Result            |
+--------------------------+
```
*Flow from user query through agent and LLM to execution in a headless browser*

**AgentCore Browser Architecture (Managed Infrastructure + User-Selected Libraries)**:

```
+--------------------------------------------------------------------------+
| User Agent Code                                                          |
|                                                                          |
|  +------------+ +------------+ +------------+ +----------------+       |
|  | Playwright | |browser-use | |  Nova Act  | |Puppeteer/CDP   |       |
|  |(Structured | |(Autonomous | |(Computer   | |Direct          |       |
|  | Control)   | | Agent)     | | Use)       | |                |       |
|  +-----+------+ +-----+------+ +-----+------+ +-------+--------+       |
|        +---------------+---------------+---------------+                |
|                              |                                           |
|                    CDP WebSocket Connection                               |
|                              |                                           |
+------------------------------+-------------------------------------------+
                               v
+--------------------------------------------------------------------------+
| AWS Managed — AgentCore Browser                                          |
|                                                                          |
|  +--------------------------------------------------------------------+  |
|  | Isolated MicroVM (Firecracker)                                    |  |
|  |                                                                    |  |
|  |  Headless Chrome Browser:                                          |  |
|  |  • Chrome DevTools Protocol (CDP) Endpoint Exposed                 |  |
|  |  • Chrome Enterprise Policies (100+ Policies)                      |  |
|  |  • Browser Extensions, Profiles, Proxy Configuration               |  |
|  |  • Custom Root CA (Internal Service SSL)                           |  |
|  |  • OS-Level Interaction (Mouse, Keyboard, System Alerts)           |  |
|  |                                                                    |  |
|  |  • Session Management (Create/Pause/Terminate)                     |  |
|  |  • DCV Live View Streaming                                         |  |
|  |  • Web Bot Auth (CAPTCHA Reduction)                                |  |
|  |  • VPC Connectivity (Internal Web App Access)                      |  |
|  +--------------------------------------------------------------------+  |
|                                                                          |
|  Managed: Provisioning, Scaling, Isolation, Security Patches,            |
|           Observability                                                   |
+--------------------------------------------------------------------------+
```
*AgentCore Browser architecture: User code libraries and AWS managed MicroVM infrastructure*

**Key Characteristics**:
- Enterprise-grade security (isolated environment)
- Serverless infrastructure (no management required)
- Enterprise observability integration
- Support for CDP-compatible libraries including Browser-use, Playwright, Nova Act

**Supported Library Comparison**:

| Category | Playwright | Browser Use | Nova Act |
|----------|-----------|-------------|----------|
| **Provider** | Microsoft (Open Source) | Browser Use Inc. (Open Source) | Amazon (AWS) |
| **Design Philosophy** | Deterministic — specify exact actions in code | Autonomous — give natural language goals, agent decides steps | Computer Use — screenshot-based visual control |
| **Operation Method** | Accessibility tree/DOM selector-based command execution | LLM reasoning loop: observe page → decide next action → execute → re-evaluate | Screen capture → coordinate-based click/input |
| **Language** | TypeScript, Python | Python | Python |
| **Best For** | Repeatable automation, testing, scraping | Complex multi-step goals, dynamic UI navigation | Visual interface manipulation, legacy apps without APIs |
| **Reliability** | High (deterministic execution) | Medium (depends on LLM reasoning) | Medium (depends on visual recognition accuracy) |
| **Token Efficiency** | High (structured snapshots) | Low (DOM + screenshot combined) | Low (screenshot image tokens) |
| **MCP Support** | Native MCP server provided | Custom wrapping required | Direct SDK calls |

### AgentCore Code Interpreter

**Safely write and execute code in an isolated environment**

**Operation Flow**:
```
+--------------+    +----------+    +----------------------------------+
| User Query   |--->|  Agent   |--->| LLM (Tool Selection)             |
+--------------+    +----+-----+    +----------------------------------+
                         |
                         v
              +---------------------------------+
              | Code Interpreter Session Created |
              |  +----------------------------+ |
              |  | Shell (Code Execution)     | |
              |  | File System (Data Storage) | |
              |  | Observability (Telemetry)  | |
              |  +----------------------------+ |
              +--------------+------------------+
                             v
              +---------------------------------+
              | Tool Result Returned -> Agent    |
              +---------------------------------+
```
*Code Interpreter operation flow: From user query to isolated session creation and result return*

**Key Characteristics**:
- **Secure Code Execution**: Isolated sandbox, access to internal data sources via VPC
- **Large-scale Data Processing**: S3 integration, gigabyte-scale dataset processing
- **Ease of Use**: Python, 🆕 JavaScript/TypeScript pre-built runtimes

🆕 **Latest Updates**:
- **Node.js Runtime**: JavaScript/TypeScript execution support
- **Custom Root CA**: Organization certificates for internal service connectivity
- **LangChain Deep Agents Integration**: LangChain official AWS native sandbox

**AgentCore Code Interpreter vs Unmanaged Code Execution Sandboxes Comparison**:

| Category | AgentCore Code Interpreter | E2B (Self-host) | Daytona | Lambda MicroVMs |
|----------|---------------------------|-----------------|---------|-----------------|
| **Offering Type** | AWS fully managed service | Open source, self-hosted | Open source, self-hosted | AWS service (manual configuration) |
| **Isolation Technology** | MicroVM (Firecracker) | MicroVM (Firecracker) | gVisor (userspace kernel) | MicroVM (Firecracker) |
| **Access Method** | AWS-specific API (CreateSession → ExecuteCode) | REST API + SDK (Python/JS) | REST API + SDK (Python/TS/Go/Java/Ruby) | HTTPS URL (HTTP/2, gRPC, WebSocket) |
| **Supported Languages** | Python, JavaScript/TypeScript | All languages (custom templates) | All languages (Docker images) | All languages (Dockerfile-based) |
| **Session Persistence** | State maintained between API calls | Maintained during sandbox lifetime | Maintained during sandbox lifetime | Up to 8 hours, pause/resume supported |
| **S3 Integration** | Native (gigabyte-scale datasets) | User implementation required | User implementation required | User implementation required |
| **VPC Connectivity** | Native support | Within VPC when deployed on EC2 | Within VPC when deployed on EKS | Native support |
| **Observability** | CloudWatch/X-Ray automatic integration | Build yourself | Build yourself | CloudWatch integration |
| **Infrastructure Management** | Not required (serverless) | EC2 bare metal + Nomad/Consul operation | EKS cluster operation | Minimal (only provide Dockerfile) |
| **Customization** | Limited (pre-built runtimes) | High (custom Dockerfiles) | High (custom Docker images) | High (free Dockerfile configuration) |
| **GPU Support** | Not supported | Not supported (CPU only) | Supported | Not supported |
| **Cost Model** | Pay-per-use based on execution time | EC2 instance costs | EKS/EC2 instance costs | Pay-per-use based on execution time |
| **AWS Deployment Location** | — (managed) | EC2 bare metal (KVM required) | EKS or EC2 | Lambda |

**Selection Guide**:

```
Need a code execution sandbox?
+-- Quick start, minimize ops overhead -> AgentCore Code Interpreter
+-- Custom runtime/packages needed (Go, Rust, GPU, etc.)
|   +-- Can operate Kubernetes -> Daytona (EKS)
|   +-- VM-level isolation required -> E2B self-host (EC2 bare metal)
|   +-- Serverless + stateful -> Lambda MicroVMs
+-- Execute within existing AgentCore Runtime -> Runtime-defined tool (local)
```
*Code execution sandbox selection guide*

---

## 3. MCP (Model Context Protocol)

### What is MCP?

An **open standard protocol** that allows LLMs to access tools and data.

**Core Value**:
- Flexible plug-and-play integration across the entire system
- AWS supports MCP to improve agent interoperability
- Framework-independent tool integration

### MCP Architecture

```
+--------------------------------------------------------------------------+
| Application Host Process                                                 |
|                                                                          |
|  +-------------------------------------+                                 |
|  | Host (App, LLM, IDE, etc.)          |                                 |
|  |                                     |                                 |
|  |  +---------------+ +-------------+ |                                 |
|  |  | MCP Client 1  | | MCP Client  | |                                 |
|  |  +-------+-------+ |     2       | |                                 |
|  |          |          +------+------+ |                                 |
|  +----------+-----------------+--------+                                 |
|             |                 |                                           |
+-------------+-----------------+------------------------------------------+
              |                 |
              v                 v
+---------------------+  +---------------------+
|    MCP Server 1     |  |    MCP Server 2     |
|  • Resources        |  |  • Resources        |
|  • Tools            |  |  • Tools            |
|  • Prompts          |  |  • Prompts          |
+----------+----------+  +----------+----------+
           |                        |
           v                        v
+------------------+     +------------------+
| Remote Resource A|     | Remote Resource B |
+------------------+     +------------------+
```
*MCP architecture: Clients within the host process communicate with remote MCP servers*

### Three Components of an MCP Server

| Component | Role |
|-----------|------|
| **Resources** | Data that agents can read (files, DB records, etc.) |
| **Tools** | Functions/actions that agents can invoke |
| **Prompts** | Reusable prompt templates |


---

## 4. MCP Server Implementation and Hosting

### Creating an MCP Server (Python)

```python
from mcp.server.fastmcp import FastMCP

# Create MCP server instance (Streamable HTTP, stateless)
mcp = FastMCP("OrderService", stateless_http=True, json_response=True)

# Declare data to query as resources
@mcp.resource("config://settings")
def get_settings() -> str:
    """Retrieve application settings and return as JSON"""
    return '{"currency": "KRW", "timezone": "Asia/Seoul", "max_results": 50}'


@mcp.resource("orders://{order_id}")
def get_order(order_id: str) -> str:
    """Retrieve order information by order ID"""
    # In practice, this queries a DB
    return f'{{"order_id": "{order_id}", "status": "shipped", "amount": 45000}}'


# Declare tools that the agent can use
@mcp.tool()
def calculate_shipping(weight_kg: float, destination: str) -> dict:
    """Calculate shipping cost"""
    rates = {"domestic": 3000, "international": 15000}
    base = rates.get(destination, rates["international"])
    return {"cost": base + (weight_kg * 500), "currency": "KRW", "destination": destination}


@mcp.tool()
def cancel_order(order_id: str, reason: str) -> str:
    """Cancel an order"""
    # In practice, this updates DB + sends notification
    return f"Order {order_id} cancelled. Reason: {reason}"


# Declare reusable prompt templates
@mcp.prompt()
def customer_support(issue: str, tone: str = "professional") -> str:
    """Prompt template for generating customer support responses"""
    tones = {
        "professional": "In a polite and professional tone,",
        "friendly": "In a friendly and warm tone,",
        "concise": "In a concise and to-the-point tone,",
    }
    style = tones.get(tone, tones["professional"])
    return f"{style} respond to the following customer inquiry: {issue}"


@mcp.prompt()
def order_summary(order_id: str) -> str:
    """Prompt template for generating order summary reports"""
    return f"Summarize the status, shipping tracking, and estimated delivery date for order {order_id}."


# Run server
if __name__ == "__main__":
    mcp.run(transport="streamable-http")
```

### Creating an MCP Client (Python)

```python
import asyncio
from mcp import ClientSession
from mcp.client.streamable_http import streamable_http_client


async def main():
    mcp_url = "http://localhost:8000/mcp"

    async with streamable_http_client(mcp_url) as (read_stream, write_stream, _):
        async with ClientSession(read_stream, write_stream) as session:
            # Initialize connection
            await session.initialize()

            # ─── Query Resources ───
            resources = await session.list_resources()
            print(f"Available resources: {[r.uri for r in resources.resources]}")

            # Read specific resource
            order_data = await session.read_resource("orders://ORD-12345")
            print(f"Order info: {order_data.contents[0].text}")

            # ─── List and Call Tools ───
            tools = await session.list_tools()
            print(f"Available tools: {[t.name for t in tools.tools]}")

            # Call shipping cost calculation tool
            result = await session.call_tool(
                "calculate_shipping",
                arguments={"weight_kg": 2.5, "destination": "domestic"}
            )
            print(f"Shipping cost: {result.structuredContent}")

            # Call order cancellation tool
            result = await session.call_tool(
                "cancel_order",
                arguments={"order_id": "ORD-12345", "reason": "Customer request"}
            )
            print(f"Cancellation result: {result.content[0].text}")

            # ─── List and Get Prompts ───
            prompts = await session.list_prompts()
            print(f"Available prompts: {[p.name for p in prompts.prompts]}")

            # Get prompt template
            prompt = await session.get_prompt(
                "customer_support",
                arguments={"issue": "Delivery delayed by 3 days", "tone": "friendly"}
            )
            print(f"Generated prompt: {prompt.messages[0].content.text}")

# Used to run directly at the script's top level
asyncio.run(main())
```
### MCP Server Hosting Strategy

| Method | Advantages | Best For |
|--------|-----------|----------|
| **Local Hosting** (same Runtime as agent) | • Minimal tool execution latency<br>• Reduced management overhead<br>• Process isolation for enhanced security | Frequent calls, low latency requirements |
| **Remote Hosting** (separate Runtime) | • Independent scaling of server resources<br>• Tool sharing across multiple agents<br>• Stack flexibility and specialization | Shared tools, independent deployment |

```
+----------------------------------------------------------------------+
| Local Hosting                       | Remote Hosting                 |
|                                     |                                |
|  +--------------------------------+ | +--------------+ +----------+ |
|  |          Runtime               | | |   Runtime    | | Runtime  | |
|  |  +----------+ +------------+  | | | +----------+| |+--------+| |
|  |  |  Agent   | | MCP Server |  | | | |  Agent   || ||MCP     || |
|  |  +----------+ +------------+  | | | +----------+| ||Server  || |
|  +--------------------------------+ | +--------------+ |+--------+| |
|                                     |                  +----------+ |
+----------------------------------------------------------------------+
```
*Local hosting vs Remote hosting: Comparison of agent and MCP server deployment approaches*

🆕 **Stateful MCP Support (March 2026)**: MCP servers hosted in Runtime maintain session context, enabling the following advanced features:
- **Elicitation**: Collecting user input during workflow execution
- **Sampling**: Server requests LLM calls during tool execution
- **Progress Notifications**: Real-time progress updates for long-running operations


---

## 5. AgentCore Gateway Overview

### What is AgentCore Gateway?

A **central access point** for agents to interact with various tools and services.

### Four Core Capabilities of AgentCore Gateway

| Capability | Description |
|------------|-------------|
| **Unified Tool Access** | Central access point for various tools/services. Tool discovery using natural language queries |
| **Authentication Handling** | Inbound/outbound authentication management via Amazon Cognito OAuth, IAM, etc. |
| **Protocol Support** | MCP (Model Context Protocol) implementation for standard agent-tool communication |
| **Multiple Target Types** | Integration with various backends including Lambda functions, REST APIs, MCP servers |

### Self-Managed Alternatives to Gateway

Open-source options that can provide the same MCP proxy functionality without using AgentCore Gateway:

| Option | Provider | License | Key Features |
|--------|----------|---------|--------------|
| **Envoy AI Gateway** | Tetrate-led (based on CNCF Envoy Gateway) | Apache-2.0 | Envoy Proxy based, MCP native proxy, v1.0 GA (2026.06.23) |
| **AgentGateway** | Solo.io → donated to Linux Foundation | Apache-2.0 | Rust implementation, MCP + A2A + LLM + REST/gRPC integration, K8s Gateway API compatible |
| **Kong AI/MCP Gateway** | Kong Inc. | Apache-2.0 (CE) | AI MCP Proxy plugin auto-converts REST APIs to MCP tools, A2A Proxy plugin |
| **Bifrost** | Maxim AI (maximhq) | Apache-2.0 | Go single binary, 11μs latency, MCP gateway + LLM routing integration |
| **DIY** | — | — | API Gateway + Cognito + Lambda + FastMCP server combination |

**AWS Deployment Methods**:

| Option | AWS Deployment Target | Configuration |
|--------|----------------------|---------------|
| **Envoy AI Gateway** | EKS | Helm chart deployment, define MCP routes via Kubernetes Gateway API resources |
| **AgentGateway** | EKS | Helm chart deployment, register MCP servers/LLM providers/A2A agents via CRDs |
| **Kong AI/MCP** | EKS / ECS / EC2 | Deploy Kong container, enable AI MCP Proxy plugin, register OpenAPI schemas |
| **Bifrost** | EC2 / ECS | Run single binary or Docker container, register MCP servers via YAML config file |
| **DIY** | API Gateway + Lambda | Configure MCP endpoints in API Gateway, Lambda Authorizer for auth, implement each tool as Lambda |

**AgentCore Gateway vs Self-Managed Comparison**:

| Feature | AgentCore Gateway | Self-Managed (Envoy/AgentGW/Kong/Bifrost) |
|---------|-------------------|------------------------------------------|
| **MCP Proxy** | ✅ Managed | ✅ Self-operated |
| **REST→MCP Auto-conversion** | ✅ (OpenAPI target) | Kong only (AI MCP Proxy plugin) |
| **Lambda Target** | ✅ Native | ❌ (DIY with API GW+Lambda combination required) |
| **Semantic Tool Search** | ✅ Built-in | ❌ (Build yourself with OpenSearch + embedding model) |
| **Cedar Policy Engine** | ✅ Built-in | ❌ (Integrate separate policy engine like OPA) |
| **Inbound Auth** | ✅ JWT/Cognito/IAM | ✅ (Self-configured) |
| **Outbound Auth** | ✅ (AgentCore Identity integration) | Build yourself (OAuth token management logic) |
| **3LO (Per-user tokens)** | ✅ GA | Build yourself |
| **A2A Protocol** | ✅ (Runtime + Gateway) | AgentGateway, Kong supported (Envoy AI GW not supported) |
| **Infrastructure Management** | None (serverless) | EKS/ECS/EC2 operation required |
| **Cost** | Pay-per-request | Instance/cluster costs |

> **Selection Criteria**: If you need semantic search, Cedar policies, Lambda targets, or outbound auth automation,
> AgentCore Gateway is advantageous. If you already have Kubernetes-based infrastructure and need full infrastructure
> control, or need to operate in multi-cloud/on-premises environments, self-managed options are appropriate.

### AgentCore Gateway Architecture

```
+----------+    +--------------+    +----------------------------------+
|  Agent   |--->|  MCP Client  |--->|       AgentCore Gateway (/mcp)   |
+----------+    +--------------+    +-------+--------+--------+--------+
                                            |        |        |
                                            v        v        v
                                   +------------++--------++----------+
                                   |API Endpoint||Lambda  ||MCP Server|
                                   |Target      ||Target  ||Target    |
                                   |            ||        ||          |
                                   |OpenAPI     ||Lambda  ||MCP Server|
                                   |Schema      ||Function||Tools     |
                                   |RESTful     ||Tools   ||1, 2, 3   |
                                   |Service     ||1,2,3   ||          |
                                   +------------++--------++----------+

  Features: List Tools | Invoke Tools | Semantic Search
```
*AgentCore Gateway architecture: Agents access various targets through the MCP protocol*

### Tool Discovery Methods

Agents can find appropriate tools in the Gateway through 3 methods.

| Method | Method/Mechanism | Behavior | Best For |
|--------|-----------------|----------|----------|
| **1. Full Listing** | `tools/list` (MCP standard) | Returns names, descriptions, and schemas of all registered tools | Dozens of tools or fewer |
| **2. Semantic Search** | `x_amz_bedrock_agentcore_search` (Gateway built-in tool) | Embeds natural language intent → compares similarity with tool descriptions → returns top N | Hundreds to thousands of tools |
| **3. LLM Self-Selection** | Framework level (Strands, LangChain, etc.) | Includes listing/search results in LLM prompt → LLM makes final tool selection | Always (final step) |

**Production Combination Patterns**:

```
+----------------------------------------------------------------------+
| When tool count is small (≤30)                                       |
|                                                                      |
|   tools/list (full listing) ---> LLM selects from full list         |
+----------------------------------------------------------------------+

+----------------------------------------------------------------------+
| When tool count is large (300+)                                      |
|                                                                      |
|   Semantic Search ---> Filter to top 10 ---> LLM selects from 10    |
|   (Natural language     relevant tools                               |
|    intent)                                                           |
+----------------------------------------------------------------------+
```
*Search strategy by tool count: Full listing for small scale, semantic search filtering for large scale*

### Semantic Search Details

Gateway automatically finds relevant tools among hundreds:

```
List-only approach: Returns all 300+ tools → Risk of exceeding LLM context
Semantic search:   "Create social media post" → Returns only top 10 relevant tools
```
*Difference between full listing and semantic search: Preventing context overflow risk*

**Core Value of Semantic Search**:
- Agents don't need to know the tool list in advance — new tools are automatically searchable by description alone
- Solves the N×M problem — selects only relevant tools instead of injecting hundreds of tools into the LLM every time
- Token efficiency — excludes unnecessary tool definitions from LLM context


---

## 6. Gateway Target Types and Integration Patterns

### Target Type Comparison

| Target Type | Description | Best For |
|-------------|-------------|----------|
| **REST API (OpenAPI)** | Expose existing REST services via OpenAPI schema | When existing APIs are available |
| **Lambda Function** | Execute custom business logic | Custom tool implementation |
| **MCP Server** | Connect dedicated MCP servers | When MCP servers already exist |
| 🆕 **Smithy Target** | Based on Smithy IDL (Interface Definition Language) | AWS services and internal services defined with Smithy |


### Lambda Target - Event Object Structure

When using a Lambda function as a Gateway tool, the Gateway converts the agent's MCP tool call into a Lambda event object and passes it.

**Lambda Target Invocation Flow**:

```
+----------+    +-----------------+    +--------------+    +--------------+
| /mcp     |--->|AgentCore Gateway|--->|   IAM Role   |--->|  AWS Lambda  |
+----------+    +-----------------+    +--------------+    +--------------+
                        |
                        v
                +-----------------------------------------+
                | Tool Schema                             |
                | (Event object must match tool schema)   |
                +-----------------------------------------+

  Lambda Event Object: Parameters passed by agent

  Lambda Context Custom Object (Gateway Meta):
  • bedrockAgentCoreMessageVersion
  • bedrockAgentCoreAwsRequestId
  • bedrockAgentCoreMcpMessageId
  • bedrockAgentCoreGatewayId
  • bedrockAgentCoreTargetId
  • bedrockAgentCoreToolName
```
*Lambda target invocation flow: Gateway converts MCP tool calls to Lambda events*

- **Tool Schema**: Tool input parameter specification defined when registering a Lambda target with the Gateway
- **Lambda Event Object**: Parameters passed by the agent (fields defined in the schema)
- **Lambda Context Custom Object**: Metadata automatically injected by the Gateway (tracing, routing information)

**What "must match tool schema" means**:
- When registering a Lambda target with the Gateway, you define a **Tool Schema** alongside it
- This schema declares "what tool this Lambda is and what input parameters it accepts"
- When an agent calls the tool, the Gateway includes the parameters defined in the schema in the event object and invokes the Lambda
- The Lambda function code must parse the event according to this schema

```
1. Register Tool Schema (during Gateway setup):
   {
     "name": "get_order_status",
     "description": "Retrieve order status",
     "inputSchema": {
       "type": "object",
       "properties": {
         "orderId": {"type": "string", "description": "Order ID"},
         "includeHistory": {"type": "boolean", "description": "Whether to include history"}
       },
       "required": ["orderId"]
     }
   }

2. Agent calls tool:
   tools/call → "get_order_status" {"orderId": "ORD-123", "includeHistory": true}

3. Event object Gateway passes to Lambda:
   {
     "orderId": "ORD-123",                          ← Parameters defined in schema
     "includeHistory": true,                         ← Parameters defined in schema
     "bedrockAgentCoreToolName": "get_order_status", ← Gateway metadata
     "bedrockAgentCoreMessageVersion": "1.0",
     "bedrockAgentCoreAwsRequestId": "abc-123",
     "bedrockAgentCoreMcpMessageId": "msg-456",
     "bedrockAgentCoreGatewayId": "gw-789",
     "bedrockAgentCoreTargetId": "target-012"
   }
```

> **Key Point**: Lambda functions don't use a "regular Lambda" as-is. They must be written to understand
> the metadata fields injected by the Gateway (`bedrockAgentCore*`) and extract parameters matching
> the tool schema from the event.

### OpenAPI / MCP Server Target Integration Flow

The complete authentication flow when integrating OpenAPI REST APIs or external MCP servers with AgentCore Gateway:

```
+--------------+                    +-------------------------------------+
|    Agent     |                    |         Inbound Auth                 |
| +----------+ |     /mcp          |  +---------+  +-----------+        |
| |MCP       |-+------------------->  | AWS IAM |  |OAuth Token|        |
| |Client    | |                   |  +---------+  +-----------+        |
| +----------+ |                    +------------------+------------------+
+--------------+                                       |
                                                       v
                                        +--------------------------+
                                        |    AgentCore Gateway     |
                                        +----------+---------------+
                                                   |
                                                   v
                                +-------------------------------------------+
                                |            Outbound Auth                   |
                                |                                           |
                                |  +-------------------------------------+ |
                                |  |       AgentCore Identity             | |
                                |  |  • Secure Token Store               | |
                                |  |  • Token Caching                    | |
                                |  |  • Workload Credentials             | |
                                |  |  • OAuth2 Authorizer                | |
                                |  |  • Resource Credential Provider     | |
                                |  +----------+--------------------------+ |
                                |             |   Credential Provider      |
                                +-------------+-----------+----------------+
                                              |           |
                                              v           v
                                +------------------+  +--------------------+
                                | MCP Server Target|  | OpenAPI Target     |
                                | (Tool 1, 2, 3)   |  | (REST API Service) |
                                | <- Token          |  | <- API Key/Token   |
                                +------------------+  +--------------------+
```
*OpenAPI / MCP server target integration inbound/outbound authentication flow*

**Flow Description**:

| Step | Action |
|------|--------|
| ① Inbound Auth | Agent accesses Gateway with AWS IAM (SigV4) or OAuth token |
| ② Gateway Reception | Processes tool listing/invocation/search requests via MCP protocol |
| ③ Outbound Auth | AgentCore Identity provides credentials needed to call target services |
| ④ Target Invocation | MCP servers called with token included, OpenAPI targets called with API key/OAuth token |
| ⑤ Result Return | Target service response converted to MCP format and delivered to agent |


### Gateway Creation and Usage Workflow

```
Step 1: Create Gateway
        → Name, description, inbound auth configuration

Step 2: Create Gateway Target
        → Name, description, API spec, credential provider configuration

Step 3: List and invoke tools
        → Agent framework, inspector, or coding IDE
```
*Gateway creation and usage 3-step workflow*

**Step 1: Create Gateway (Cognito Inbound Auth)**:

```python
import boto3
import json

# Initialize boto3 client
client = boto3.client("bedrock-agentcore-control", region_name="us-east-1")

# Create Gateway — Use Cognito for inbound auth
gateway = client.create_gateway(
    name="MyAgentGateway",
    # Communicate with agent via MCP protocol
    protocolType="MCP",
    # JWT token-based auth (validates tokens issued by Cognito)
    authorizerType="CUSTOM_JWT",
    authorizerConfiguration={
        "customJWTAuthorizer": {
            # Cognito User Pool OIDC Discovery URL — used by Gateway to verify token signature
            "discoveryUrl": "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_XXXXXXX/.well-known/openid-configuration",
            # Allowed Cognito App Client ID — only tokens issued by this client pass through
            "allowedClients": ["your-cognito-app-client-id"],
            # Allowed OAuth scopes — token must contain this scope for access
            "allowedScopes": ["openai-tools/invoke"]
        }
    },
    # IAM role used by Gateway to invoke targets like Lambda/API
    # Trust policy of this role must include bedrock-agentcore.amazonaws.com
    roleArn="arn:aws:iam::123456789012:role/AgentCoreGatewayRole",
    # Enable semantic search — auto-discover relevant tools via natural language from hundreds of tools
    protocolConfiguration={
        "mcp": {
            "searchType": "SEMANTIC"
        }
    }
)

print(f"Gateway URL: {gateway['gatewayUrl']}")
print(f"Gateway ID: {gateway['gatewayId']}")
```

**Step 2: Create Gateway Target (OpenAPI — OpenAI Chat Completions API Example)**:

```python
# Define OpenAPI schema to expose OpenAI API as MCP tools
openai_spec = {
    "openapi": "3.0.0",
    "info": {"title": "OpenAI Chat API", "version": "1.0.0"},
    # Base URL of target service — Gateway forwards HTTP requests to this URL
    "servers": [{"url": "https://api.openai.com/v1"}],
    "paths": {
        "/chat/completions": {
            "post": {
                # operationId is converted to MCP tool name
                "operationId": "createChatCompletion",
                # description is used for matching during semantic search
                "summary": "Call OpenAI Chat Completions API to generate text",
                "requestBody": {
                    "required": True,
                    "content": {
                        "application/json": {
                            "schema": {
                                "type": "object",
                                "required": ["model", "messages"],
                                "properties": {
                                    "model": {
                                        "type": "string",
                                        "description": "Model ID to use (e.g., gpt-4o)"
                                    },
                                    "messages": {
                                        "type": "array",
                                        "description": "Array of conversation messages",
                                        "items": {
                                            "type": "object",
                                            "properties": {
                                                "role": {"type": "string"},
                                                "content": {"type": "string"}
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                "responses": {
                    "200": {
                        "description": "Generated response",
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "properties": {
                                        "id": {"type": "string"},
                                        "choices": {"type": "array"}
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

# Create OpenAI API target — automatically inject API key into Authorization header
target = client.create_gateway_target(
    # Connect target to the Gateway created above
    gatewayIdentifier=gateway["gatewayId"],
    name="OpenAI-ChatCompletions",
    description="Expose OpenAI Chat Completions API as MCP tool",
    # Target configuration: pass OpenAPI schema inline
    targetConfiguration={
        "mcp": {
            "openApiSchema": {
                # Convert schema to JSON string (S3 URI also supported)
                "inlinePayload": json.dumps(openai_spec)
            }
        }
    },
    # Outbound auth config: Gateway auto-injects API key when calling OpenAI API
    credentialProviderConfigurations=[
        {
            # API_KEY type — injects a fixed key into header/query
            "credentialProviderType": "API_KEY",
            "credentialProvider": {
                "apiKeyCredentialProvider": {
                    # ARN of credential provider pre-registered in AgentCore Identity
                    "providerArn": "arn:aws:bedrock-agentcore:us-east-1:123456789012:credential-provider/openai-key",
                    # Insert API key into HTTP header (QUERY_PARAMETER also possible)
                    "credentialLocation": "HEADER",
                    # Header name: Authorization
                    "credentialParameterName": "Authorization",
                    # Add "Bearer " prefix before header value → "Bearer sk-xxxxx"
                    "credentialPrefix": "Bearer"
                }
            }
        }
    ]
)

print(f"Target ID: {target['targetId']}")
print(f"Target Name: {target['name']}")
```

> **Note**: The above code is based on the [AgentCore Starter Toolkit Official Guide](https://aws.github.io/bedrock-agentcore-starter-toolkit/user-guide/gateway/quickstart.md),
> [Boto3 create_gateway API](https://docs.aws.amazon.com/boto3/latest/reference/services/bedrock-agentcore-control/client/create_gateway.html), and
> [create_gateway_target API](https://docs.aws.amazon.com/boto3/latest/reference/services/bedrock-agentcore-control/client/create_gateway_target.html).

### Gateway Tool Invocation Code Examples

**List Tools**:
```python
def list_tools(gateway_url, access_token):
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {access_token}"
    }
    payload = {
        "jsonrpc": "2.0",
        "id": "list-tools-request",
        "method": "tools/list"
    }
    response = requests.post(gateway_url, headers=headers, json=payload)
    return response.json()
```

**Semantic Search**:
```python
def search_tools(gateway_url, access_token, query):
    payload = {
        "jsonrpc": "2.0",
        "id": "search-tools-request",
        "method": "tools/call",
        "params": {
            "name": "x_amz_bedrock_agentcore_search",
            "arguments": {"query": query}
        }
    }
    response = requests.post(gateway_url, headers=headers, json=payload)
    return response.json()

results = search_tools(gateway_url, access_token, "find order information")
```

**Tool Invocation**:
```python
result = call_tool(
    gateway_url, 
    access_token, 
    "openapi-target-1___get_orders_byId",  # <TargetId>___<ToolName>
    {"orderId": "ORD-12345-67890", "customerId": "CUST-98765"}
)
```


---

## 7. Gateway Authentication and Authorization

### Inbound Authentication

| Method | Description |
|--------|-------------|
| **JWT-based (OAuth 2.0)** | Customizable authorizer, JWT claims validation |
| **Amazon Cognito Client Credentials** | Machine-to-machine authentication, `/oauth2/token` endpoint |
| **AWS IAM** | SigV4 signature-based |

### Outbound Authentication

| Method | Target |
|--------|--------|
| **AWS IAM** | Lambda function invocation |
| **API Key** | External REST APIs |
| **OAuth Token** | Third-party services (AgentCore Identity integration) |

### Authentication Flow Details (MCP Server Target)

```
1. Agent → Gateway: invokeTool(getOrder())
2. Gateway → AgentCore Identity: getToken (Outbound Auth)
3. AgentCore Identity → Gateway: Return OAuth token
4. Gateway → MCP Server: Initialize + Tool call (with token)
5. MCP Server → Gateway: Return result
6. Gateway → Agent: Return tool result
```
*MCP server target authentication flow details - 6 steps*

🆕 **Latest Authentication Updates**:
- **3LO GA**: Per-user tokens for accessing user-specific data in external services
- **VPC Egress**: Access to private MCP servers (EKS-hosted, etc.) within customer VPCs
- **Custom Header Passthrough**: Pass arbitrary custom headers to agents (auth tokens, webhook signatures, etc.)

---

## 8. AgentCore Policy

### Why Agents Need Boundaries

| Risk | Description |
|------|-------------|
| **Unpredictable Runtime Behavior** | Agents produce results not anticipated during design |
| **Permission Abuse** | Actions beyond intended scope (e.g., executing high-value transactions) |
| **Business Rule Non-compliance** | Actions violating regulatory compliance constraints |
| **Data Exposure** | Personal information leaks or access to sensitive data outside authorized scope |

### AgentCore Policy Architecture

```
+------------------------+    +------------------------------------------+
| Agent / MCP Client     |--->|          AgentCore Policy                |
+------------------------+    |                                          |
                              |  • Policy Lifecycle                      |
  +--------------------+     |  • NL2Cedar Conversion                   |
  | Policy Admin       |---->|  • Dynamic Policy Evaluation             |
  | (Author/Manage)    |     |  • Allow/Deny Decision                   |
  +--------------------+     +----------+----------------+--------------+
                                        |                |
                                        v                v
                              +------------------+  +--------------------+
                              | Allow -> Gateway  |  | Deny ->             |
                              | -> Tools/API/     |  | Observability      |
                              |   Systems        |  | (Audit Logs)       |
                              +------------------+  +--------------------+
```
*AgentCore Policy architecture: Allow/deny decision flow through policy evaluation*

### Cedar Policy Language

Converting natural language to Cedar policies (NL2Cedar):

**Natural Language**: "Allow reimbursements under $1,000 only for finance department users."

**Cedar Policy**:
```cedar
permit(
    principal,
    action == MCP::Action::"process_reimbursement",
    resource
)
when {
    principal.department == "finance" &&
    resource.amount < 1000
};
```

| Element | Description |
|---------|-------------|
| **Effect** | `permit` or `forbid` |
| **Scope** | principal, action, resource |
| **Condition** | Detailed conditions specified with `when` clause |


### Policy Engine Configuration Code

**Adding a Policy**:
```python
import boto3
client = boto3.client('bedrock-agentcore-control')

response = client.create_policy(
    policyEngineId='my-policy-engine-id',
    name='my-policy',
    validationMode='FAIL_ON_ANY_FINDINGS',
    description='My Policy',
    definition={
        'cedar': {
            'statement': 'my-cedar-policy-statement'
        }
    }
)
```

**Creating a Gateway with Policy Engine**:
```python
response = gateway_client.create_gateway(
    name='my-gateway',
    protocolType='MCP',
    authorizerType='CUSTOM_JWT',
    authorizerConfiguration={
        'customJWTAuthorizer': {
            'allowedClients': ['clientId'],
            'discoveryUrl': 'https://cognito-idp.us-west-2.amazonaws.com/...'
        }
    },
    roleArn='arn:aws:iam::123456789012:role/my-gateway-service-role',
    policyEngineConfiguration={
        'mode': 'ENFORCE',  # ENFORCE or MONITOR
        'arn': 'arn:aws:policy-registry:us-west-2:123456789012:policy-engine/...'
    }
)
```

🆕 **Policy GA (March 2026)**: Available for production use in 13 regions. CDK submodule is still alpha.


---

## 9. Knowledge Check and Key Takeaways

### Knowledge Check Questions

**Question 1**: S3 large dataset + sensitive financial information protection + minimize operational overhead
- ✅ **Answer: A** - Implement AgentCore Code Interpreter with VPC support
- Key: Code Interpreter = isolated sandbox + S3 integration + VPC for sensitive data protection

**Question 2**: Need both local tools (frequent math calculations) + remote services (shared enterprise data)
- ✅ **Answer: C** - Local hosting for calculation tools + remote hosting for shared data services (hybrid)
- Key: Latency requirements → local, shared/independent scaling → remote

### Module Learning Objectives Verification

Upon completing this module, you can:
- ✅ Implement various tool integration patterns including built-in tools and protocol-based tools
- ✅ Design and deploy MCP-based servers and clients
- ✅ Describe common authentication patterns for agent tool usage
- ✅ Configure AgentCore Gateway components
- ✅ Create policies using AgentCore Policy to secure agent tool invocations

---

## 10. Additional Key Points - Instructor Supplementary Material

### 10.1 🆕 Gateway MCP Sessions (May 2026)

Gateway supports stateful sessions enabling advanced MCP features:

| Feature | Description |
|---------|-------------|
| **MCP Sessions** | Per-user scoping, unique Mcp-Session-Id, up to 8-hour timeout |
| **Response Streaming (SSE)** | Real-time responses via Server-Sent Events (previously: full buffering) |
| **Elicitation Pass-Through** | Request user input during tool execution (Human-in-the-loop) |
| **Sampling Messages** | MCP server requests LLM calls during tool execution |
| **Progress Notifications** | Real-time progress streaming for long-running operations |
| **Logging Notifications** | Structured log messages delivered in real-time |

**Elicitation Modes**:
- **Form Mode**: Structured forms ("Would you like to proceed with this refund?") → user responds → server continues
- **URL Mode**: Redirect to OAuth consent pages, etc. → continue processing after completion

### 10.2 🆕 AWS Agent Registry (Preview)

A catalog for centrally managing tools and agents:

```
+-------------------------------------------------------------------+
|                      AWS Agent Registry                           |
|                                                                   |
|  Registerable Items:                                              |
|  +----------++------++------++----------++------------------+   |
|  |  Agent   || Tool ||Skill ||MCP Server||Custom Resource   |   |
|  +----------++------++------++----------++------------------+   |
|                                                                   |
|  Access Methods:                                                  |
|  • Console UI                                                     |
|  • API                                                            |
|  • MCP Server (Query directly from IDE)                           |
|                                                                   |
|  Security: IAM + OAuth (Custom JWT)                               |
+-------------------------------------------------------------------+
```
*AWS Agent Registry: A catalog for centrally managing tools, agents, skills, and more*

### 10.3 Tool Integration Pattern Selection Guide

| Scenario | Recommended Pattern |
|----------|-------------------|
| Web scraping, form filling | AgentCore Browser |
| Data analysis, visualization | AgentCore Code Interpreter |
| Exposing existing REST APIs | Gateway + OpenAPI target |
| Custom business logic | Gateway + Lambda target |
| Connecting existing MCP servers | Gateway + MCP server target |
| Frequent calls, low latency | Local MCP server (within Runtime) |
| Shared tools across multiple agents | Remote MCP server (separate Runtime) |
| 🆕 User confirmation required | Gateway Elicitation |
| 🆕 LLM reasoning needed during tool execution | Gateway Sampling |

### 10.4 🆕 AgentCore MCP Server (awslabs/mcp)

Use AgentCore directly from coding agents (Kiro, Claude Code, Cursor, etc.):

```bash
# Use directly from MCP client without installation
# Supports Runtime, Memory, Browser, Code Interpreter
# Authenticates via AWS default credential chain
```

Features:
- Create/invoke AgentCore agents
- Run cloud browsers
- Execute code in Code Interpreter sandboxes
- Manage Memory resources

### 10.5 Policy Design Best Practices

| Principle | Description |
|-----------|-------------|
| **Default Deny** | Deny everything not explicitly permitted |
| **Least Privilege** | Allow only necessary tools, limit scope with conditions |
| **MONITOR First** | Analyze impact in MONITOR mode before production deployment |
| **Use Conditions** | Refine with amounts, departments, time zones, etc. |
| **Audit Integration** | Integrate with Observability to track denied calls |

### 10.6 Discussion Points for Class

1. **"Which integration pattern is appropriate for the agent you're building?"**
   - Consider existing infrastructure, latency requirements, security requirements

2. **"Local vs Remote MCP server — what criteria guide the choice?"**
   - Call frequency, latency, sharing needs, independent deployment needs

3. **"What policy boundaries should be set for agents?"**
   - Amount limits, data access scope, time zone restrictions, actions requiring approval

### 🆕 10.7 Web Search on AgentCore (June 2026 NY Summit, GA)

A **fully managed web search tool** that enables agents to access real-time web information to fill gaps in organizational knowledge (regulatory changes, market trends, competitor new products, etc.).

| Item | Details |
|------|---------|
| **Integration Method** | Provided as a **built-in connector target** in AgentCore Gateway, using MCP |
| **Operation** | Agent sends natural language query → returns relevant excerpts, source URLs, titles, publication dates → model reasons to generate grounded responses |
| **Data Security** | Queries remain within customer's AWS security/compliance boundary (**zero data egress**), no additional vendor onboarding required |
| **Search Infrastructure** | Based on Amazon search infrastructure powering Alexa+, Amazon Quick Suite, and Kiro, optimized for agentic search |
| **Multi-source Grounding** | Combines public web information + Amazon's proprietary knowledge graph (structured entity data, verified facts, real-time information like stock prices and sports scores) |

**Use Cases**: Research agents cross-referencing public sources, compliance agents monitoring regulatory/policy updates, grounding model responses with current information.

### 🆕 10.8 Bedrock Managed Knowledge Base on AgentCore (June 2026 NY Summit, GA)

A **managed RAG** capability that connects organizational knowledge scattered across SharePoint, Google Drive, Confluence, S3, internal wikis, etc. to agents. Previously, building custom ingestion pipelines, search tuning, and maintaining data freshness required months of engineering.

| Item | Details |
|------|---------|
| **Managed Scope** | AWS manages vector stores, embedding/reranking models used during retrieval, rate limiting, and scalability concerns |
| **Agentic Retriever** | Goes beyond traditional RAG that simply matches queries to nearest chunks — plans queries across the knowledge base, connects related concepts across documents, evaluates intermediate results, and re-ranks before answering |
| **Gateway Integration** | Integrated with AgentCore Gateway, invoked like a tool |
| **Impact** | Broader and more complete coverage than basic retrieval for complex multi-step queries spanning multiple topics |

> **Distinction from Memory (M05)**: Knowledge Base provides retrieval over "organizational static/unstructured knowledge," while AgentCore Memory is "information the agent learns/remembers from conversations." The two are complementary.

### 🆕 10.9 Guardrails Integration and Agent Economy (June 2026 NY Summit)

**Bedrock Guardrails + Policy Integration (GA)**:
- Bedrock Guardrails integrated into AgentCore Policy evaluates all agent actions against prompt injection, harmful content, and sensitive data exposure
- Checks run at the **Gateway layer** outside agent code → agents cannot bypass
- All tools and context sources pass through Gateway, so new features automatically get the same security layer
- 🔜 Future integration with third-party detection signals from Check Point, Zscaler, Rubrik, Netskope, SentinelOne, etc. planned
- (Details: See M03 Security Module 10.8)

**AWS WAF AI traffic monetization (GA) - Supply side of the agent economy**:
- While AgentCore Payments (Preview) handles the **consumer side** (agents discover, access, and pay for paid services),
  WAF AI traffic monetization handles the **supply side** (content owners block/allow/charge AI bots/agents for access)
- New Bot Control feature to set access prices, accept payments via third-party payment providers, and grant scoped access directly at the edge
- Both features operate on the same platform, so providers using WAF automatically recognize verified agents from AgentCore → low friction for verified agents + rewards for providers

---

## Changes Summary vs Textbook

| Textbook Content (v1.0.4) | Current Status (May 2026) |
|---------------------------|--------------------------|
| Gateway: Basic MCP support | **🆕 MCP Sessions, SSE Streaming, Elicitation, Sampling, Progress** |
| Browser: Basic web browsing | **🆕 OS-Level, Proxy, Profiles, Extensions, Chrome Policies, Web Bot Auth** |
| Code Interpreter: Python only | **🆕 + Node.js (JavaScript/TypeScript)** |
| Policy: Basic description | **🆕 GA** (13 regions, ENFORCE/MONITOR modes) |
| No Registry | **🆕 AWS Agent Registry Preview** |
| Basic authentication | **🆕 3LO GA, VPC Egress, Custom Header Passthrough** |
| Stateless MCP only | **🆕 Stateful MCP** (Elicitation, Sampling, Progress) |
| Gateway AZ limitation | **🆕 Full AZ coverage** |
| No web search tool | 🆕 **NY Summit 2026**: Web Search on AgentCore (GA, Gateway connector target) |
| Manual org knowledge connection | 🆕 **NY Summit 2026**: Bedrock Managed Knowledge Base (GA, Agentic Retriever) |
| No Policy safety checks | 🆕 **NY Summit 2026**: Bedrock Guardrails Integration (GA) |
| No supply-side payments | 🆕 **NY Summit 2026**: AWS WAF AI traffic monetization (GA) |

---

## References

- [AgentCore Gateway Official Documentation](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway.html)
- [AgentCore Policy Documentation](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/policy.html)
- [AgentCore Browser Documentation](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/browser-tool.html)
- [AgentCore Code Interpreter Documentation](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/code-interpreter.html)
- [MCP Sessions Documentation](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway-sessions.html)
- [Elicitation Documentation](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway-mcp-elicitation.html)
- [AWS Agent Registry Documentation](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/registry.html)
- [Model Context Protocol Specification](https://modelcontextprotocol.io/)
- [Announcing Web Search on Amazon Bedrock AgentCore (NY Summit 2026)](https://aws.amazon.com/blogs/aws/announcing-web-search-on-amazon-bedrock-agentcore-ground-your-ai-agents-in-current-accurate-web-knowledge/)
- [Introducing Amazon Bedrock Managed Knowledge Base (NY Summit 2026)](https://aws.amazon.com/blogs/aws/introducing-amazon-bedrock-managed-knowledge-base-for-faster-more-accurate-enterprise-ai-applications/)
- [AWS WAF AI traffic monetization (NY Summit 2026)](https://aws.amazon.com/blogs/aws/aws-waf-adds-ai-traffic-monetization-capability-to-help-content-owners-charge-ai-bots-for-content-access/)

---

*This document is based on the content of MLAGAC-10-KO-KR-M04-ToolsAndGateway_InstructorDeck.pdf,
and content marked with 🆕 is instructor supplementary material reflecting the latest service updates as of May 2026.*

*Document Version: 2.1 | Created: 2026-05-28 | Last Modified: 2026-06-23 | Update Basis: Reflects AWS Summit New York June 2026*
