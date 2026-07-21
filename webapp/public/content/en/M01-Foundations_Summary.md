# Module 1: Foundations of Agentic AI Patterns

## Building Agentic AI with Amazon Bedrock AgentCore

---

## Table of Contents

1. [Agentic AI Overview](#1-agentic-ai-overview)
2. [Traditional AI vs Agentic AI Comparison](#2-traditional-ai-vs-agentic-ai-comparison)
3. [Core Components of an Agent](#3-core-components-of-an-agent)
4. [Agentic Loop](#4-agentic-loop)
5. [Introduction to Amazon Bedrock AgentCore](#5-introduction-to-amazon-bedrock-agentcore)
6. [AgentCore Core Services in Detail](#6-agentcore-core-services-in-detail)
7. [Deployment Architecture](#7-deployment-architecture)
8. [Practical Agent Design Examples](#8-practical-agent-design-examples)
9. [Knowledge Check and Key Summary](#9-knowledge-check-and-key-summary)
10. [Additional Key Points - Instructor Supplementary Materials](#10-additional-key-points---instructor-supplementary-materials)

> 🆕 Marker: Content added/changed after the textbook (v1.0.4, April 2026 build)
> Source: [AgentCore Release Notes](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/release-notes.html)

---

## 1. Agentic AI Overview

### What is Agentic AI?

Agentic AI refers to **AI systems that autonomously make decisions, adapt to
environmental changes, and act independently toward goals**.

### Core Characteristics

| Characteristic | Description |
|------|------|
| **Autonomy** | Performs tasks independently without continuous human intervention |
| **Adaptability** | Dynamically responds to changing conditions and new information |
| **Goal-oriented** | Formulates and executes plans toward clear objectives |
| **Tool Use** | Extends capabilities by leveraging external tools and APIs |
| **Reasoning** | Decomposes complex problems and solves them step by step |
| 🆕 **Transact** | Autonomously accesses and pays for APIs and services |


### Why Agentic AI?

- **Complex workflow automation**: Autonomously performs multi-step tasks beyond simple Q&A
- **Dynamic decision-making**: Judgment based on real-time data and context
- **Scalable intelligence**: Infinite capability expansion by combining tools and resources
- **Human-AI collaboration**: Humans focus on strategic decisions, AI handles execution

### Agentic AI Maturity Model

| Level | Stage | Description | Example |
|------|------|------|------|
| L1 | **Reactive** | Simple input-output, no state | Chatbots, Q&A |
| L2 | **Tool-augmented** | Can call external tools | RAG, Function Calling |
| L3 | **Autonomous** | Multi-step planning and execution | Single agent systems |
| L4 | **Collaborative** | Multi-agent collaboration | Agent teams |
| L5 | 🆕 **Transacting** | Autonomous service access and payment | Agentic commerce |

---

## 2. Traditional AI vs Agentic AI Comparison

### Architecture Comparison

```
+----------------------------------------------------------------------+
| Traditional Generative AI Application                                |
|                                                                      |
|   User -> Application -> LLM -> Response (Single-turn)                 |
+----------------------------------------------------------------------+

+---------------------------------------------------------------------+
| Agentic AI Application                                              |
|                                                                     |
|   +------+    +-------------+    +----------------------+          |
|   | User |--->| Application |--->|    Agentic Loop      |          |
|   +------+    +-------------+    |  +-----------+       |          |
|                                  |  | Reasoning |       |          |
|                                  |  +-----------+       |          |
|                                  |  |   Tool    |       |          |
|                                  |  | Selection |       |          |
|                                  |  +-----------+       |          |
|                                  |  | Execution |       |          |
|                                  |  +-----------+       |          |
|                                  +----+------+----------+          |
|                                       |      |                     |
|                                       v      v                     |
|                             +----------+  +------------------+     |
|                             | Tools &  |  | Model Invocation |     |
|                             |Resources |  +------------------+     |
|                             +----------+                           |
+---------------------------------------------------------------------+
```
*Comparison of traditional generative AI (single-turn) and agentic AI (multi-step loop) architectures*


### Detailed Comparison Table

| Category | Traditional Generative AI | Agentic AI |
|------|---------------|------------|
| **Interaction Mode** | Single-turn request-response | Multi-turn autonomous execution |
| **Control Flow** | Deterministic | Non-deterministic |
| **Tool Use** | None or limited | Dynamic tool selection and invocation |
| **Memory** | In-session context only | Short-term + Long-term memory |
| **Decision Making** | Humans make all decisions | Agent makes autonomous decisions |
| **Error Handling** | Simple retry | Adaptive strategy changes |
| **Complexity** | Simple pipeline | Complex agentic loop |
| **Scalability** | Horizontal scaling | Expansion through inter-agent collaboration |

---

## 3. Core Components of an Agent

### 5 Essential Architecture Components

The **5 core components** that form the essential architecture of agentic systems:

```
+---------------------------------------------------------+
| Security                                 Observability   |
|  +---------------------------------------------------+  |
|  |                                                   |  |
|  |         +---------------------+                   |  |
|  |         |   Framework or      |                   |  |
|  |         |    Agent Code       |                   |  |
|  |         +--+------+-------+--+                   |  |
|  |            |      |       |                       |  |
|  |     +------+      |       +------+               |  |
|  |     v             |              v               |  |
|  | +--------+        |        +----------+          |  |
|  | | Other  |        |        |          |          |  |
|  | | Agents |        |        |   LLM    |          |  |
|  | +--------+        |        +----------+          |  |
|  |                   |                               |  |
|  |     +-------------+-------------+                 |  |
|  |     v                           v                 |  |
|  | +--------+                +----------+            |  |
|  | |        |                |          |            |  |
|  | | Tools  |                |  Memory  |            |  |
|  | |        |                |          |            |  |
|  | +--------+                +----------+            |  |
|  |                                                   |  |
|  +---------------------------------------------------+  |
+---------------------------------------------------------+
```
*5 core architecture components of agentic systems*


![Agent Architecture 5 Core Components](images/M01-agent_architecture_5components.png)

### Component Details

#### 1) Framework or Agent Code
- Handles the agent's orchestration logic
- Controls the execution flow of the agentic loop
- Examples: Strands Agents SDK, LangChain, CrewAI, Google ADK, OpenAI Agents
- 🆕 **Managed Harness Option**: Run agents with configuration only, no framework needed (no orchestration code required)

#### 2) LLM (Large Language Model)
- Acts as the agent's "brain"
- Reasoning, planning, and tool selection decisions
- Model-independent design is important (avoid dependency on specific models)
- 🆕 Supported models: Bedrock (Claude, Nova, Llama, Mistral, Titan, Cohere), Anthropic Direct, OpenAI, Gemini

#### 3) Tools
- External capabilities that extend the agent's abilities
- API calls, database queries, web search, code execution, etc.
- Standardized integration through MCP (Model Context Protocol)
- 🆕 **AWS Agent Registry** for centralized tool discovery and governance

#### 4) Memory
- **Short-term memory**: Current session conversation context
- **Long-term memory**: Learned information persisted across sessions
- Ensures agent personalization and continuity
- 🆕 **Episodic memory strategy** added, **metadata filtering** support, **record streaming** (event-based notifications)

#### 5) Agent-to-Agent Communication (A2A)
- Collaboration in multi-agent systems
- Task delegation and result sharing
- Orchestration between specialized agents
- 🆕 **AG-UI Protocol**: Agent↔Frontend real-time streaming (CopilotKit partnership)

---

## 4. Agentic Loop

### How the Agentic Loop Works

The agentic loop is the core execution pattern that repeats until the agent achieves its goal.

```
+--------------+
|  User Input  |
+------+-------+
       v
+--------------+
| 1. Perceive  |
|              |
+------+-------+
       v
+--------------+
| 2. Reason    |
|              |
+------+-------+
       v
+--------------+
| 3. Act       |
|              |
+------+-------+
       v
+--------------+
| 4. Observe   |
|              |
+------+-------+
       v
+------------------+     Yes     +------------------------+
| Goal Achieved?   |------------>| Return Final Response  |
+--------+---------+             +------------------------+
         | No (loop continues)
         +--------------------------^
                                    |
         +--------------------------+
         v
+--------------+
| 1. Perceive  | (repeat)
+--------------+
```
*Agentic loop iterative execution flow: Perceive→Reason→Act→Observe→Goal Check*

### Step-by-Step Explanation of the Loop

| Step | Role | Details |
|------|------|------|
| **Perceive** | Receive input | Collect user requests, environmental changes, and tool results |
| **Reason** | Formulate plan | Use LLM to determine the next action |
| **Act** | Execute | Perform tool calls, API requests, code execution, etc. |
| **Observe** | Evaluate results | Analyze outcomes and determine whether the goal is achieved |

### ReAct Pattern (Reasoning + Acting)

The most representative implementation pattern of the agentic loop:

```
Thought: The user is asking about order status. I need to check the order number.
Action: get_order_status(order_id="12345")
Observation: Order #12345 is in transit, with an estimated delivery date of tomorrow.
Thought: I have the order status information. I can inform the user.
Answer: Order #12345 is currently in transit and is expected to arrive tomorrow.
```
*Example of the ReAct pattern's Thought-Action-Observation flow*

### Significance of Non-deterministic Control Flow

- May choose different paths even with the same input
- Tool call order and frequency vary based on LLM reasoning
- This is why **Observability** is critically important
- 🆕 **Agent Performance Loop**: Automatically optimizes prompts/tool descriptions by analyzing production traces, validated through A/B testing


---

## 5. Introduction to Amazon Bedrock AgentCore

### The Gap from Prototype to Production

5 core challenges faced when transitioning agents from prototype to production:

| Challenge | Description |
|------|------|
| **Performance** | Latency, throughput, cost optimization |
| **Security** | Authentication, authorization, data protection |
| **Governance** | Policy compliance, auditing, regulatory management |
| **Scalability** | Auto-scaling with traffic increases |
| **Context** | Memory management, state maintenance, personalization |

### What AgentCore Solves

Amazon Bedrock AgentCore is a **fully managed agent infrastructure service**
designed to solve these production challenges.

Core values:
- **Framework-independent**: Supports any agent framework
- **Model-independent**: Can use any LLM
- **End-to-end management**: Full lifecycle management from deployment to monitoring
- **Built-in security**: Authentication/authorization provided by default
- 🆕 **ISO/CSA STAR certification** obtained, **GovCloud (US-West)** support for regulated workloads

### Service Timeline

| Timing | Event |
|------|--------|
| July 2025 | Preview launch |
| October 2025 | **GA (General Availability)** - 9 regions |
| January 2026 | 5 region expansion including Seoul region |
| March 2026 | CLI GA, Evaluations GA, Policy GA |
| April 2026 | 🆕 Managed Harness, Registry, Payments Preview |
| May 2026 | 🆕 CDK Stable, MCP Sessions, File System, GovCloud |
| June 2026 | 🆕 **NY Summit**: Harness GA, Web Search, Managed Knowledge Base, Guardrails Integration, Optimization (Insights/Recommendations/A/B) |

---

## 6. AgentCore Core Services in Detail

### Overall Service Architecture Map

![AgentCore Full Component Architecture](images/M01-agentcore_all_components_final.png)

### 6.1 AgentCore Runtime

**Role**: Serverless hosting and execution environment for agents

- Container-based deployment or direct code (.zip) deployment support
- Auto-scaling (instance adjustment based on traffic)
- Framework-independent (supports Strands, LangChain, CrewAI, etc.)
- Endpoint management and version control

🆕 **Latest Updates**:
- **Node.js Direct Code Deploy**: Node.js .zip deployment support in addition to Python
- **Managed Session Storage**: File system state persistence across sessions (1GB, 14-day retention)
- **Shell Command Execution** (`InvokeAgentRuntimeCommand`): Direct shell command execution within microVM, HTTP/2 streaming output
- **Bring-Your-Own File System**: Amazon S3 Files, Amazon EFS mount support (up to 5)
- **AG-UI Protocol**: Frontend real-time streaming (text, reasoning steps, tool calls)
- **OAuth WebSocket Authentication**: Direct browser JS client authentication
- **Python 3.14 support**
- **25-35% latency improvement**: Sequential call optimization through auth token caching
- **VPC Egress**: Access to private resources within customer VPC

### 6.2 AgentCore Identity

**Role**: Authentication (AuthN) and authorization (AuthZ) management for agents

**Inbound Authentication (User → Agent)**:
- "Who is this user?" (Authentication)
- "Can this user invoke this agent?" (Authorization)

**Outbound Authentication (Agent → External Resources)**:
- "Is this agent really who it claims to be?" (Agent identity verification)
- "Can this agent access this resource on behalf of the user?" (Delegated authority)

🆕 **Latest Updates**:
- **OBO (On-Behalf-Of) Token Exchange**: Agent accesses protected resources on behalf of authenticated users (no multi-consent flow needed)
- **VPC Egress**: Support for connecting to Identity Providers within customer VPC
- **Additional IAM Condition Keys**: `RuntimeAuthorizerType`, `aws:VpceOrgID`

### 6.3 AgentCore Gateway

**Role**: Centralized gateway for tool discovery, integration, and routing

- MCP (Model Context Protocol) based standard interface
- Tool listing (List), tool indirect invocation (Invoke), and search (Search) capabilities
- **Zero-code MCP tool creation**: Automatically generate MCP tools from APIs/Lambda without code
- Target types:
  - **API Endpoint Target**: Connect to RESTful API services
  - **AWS Lambda Target**: Connect to serverless functions
  - **MCP Server Target**: Connect to external MCP servers

🆕 **Latest Updates (May 2026 major update)**:
- **MCP Sessions**: Stateful sessions (user-scoped, up to 8-hour timeout)
- **Response Streaming (SSE)**: Real-time response delivery via Server-Sent Events (previously: full buffering before return)
- **Elicitation Pass-Through**: Request user input during tool execution (Human-in-the-loop)
  - Form mode: Structured forms ("Would you like to proceed with this refund?")
  - URL mode: Redirect to OAuth consent pages, etc.
- **Sampling Messages**: MCP servers can request LLM calls during tool execution
- **Progress/Logging Notifications**: Real-time progress streaming for long-running tasks
- **3LO (Three-Legged OAuth) GA**: Access external services with per-user tokens
- **VPC Egress**: Access to private resources within customer VPC (e.g., EKS-hosted MCP servers)


### 6.4 AgentCore Policy

**Role**: Dynamic policy evaluation and control over agent tool invocations

- **Policy authoring**: Convert natural language to Cedar policy language (NL2Cedar)
- **Dynamic policy evaluation**: Real-time allow/deny decisions for tool calls
- **Policy lifecycle management**: Policy creation, update, and deletion
- Integration with AgentCore Gateway and Observability
- 🆕 **March 2026 GA** - Available for production use in 13 regions

### 6.5 AgentCore Memory

**Role**: Short-term and long-term memory management for agents

| Memory Type | Characteristics | Use Case |
|------------|------|------|
| **Short-term Memory** | Synchronous, within session | Chat messages, event storage |
| **Long-term Memory** | Asynchronous, across sessions | Semantic search, user preferences, summaries |

**Memory Strategies**:
- **Semantic Memory**: Meaning-based search and storage
- **User Preference Memory**: Personalized preference learning
- **Summary Memory**: Compression and key extraction from conversations
- 🆕 **Episodic Memory**: Memory by specific episode/event units

🆕 **Latest Updates**:
- **Structured Metadata Filtering**: Filter long-term memory search by metadata attributes (priority, department, tags, time range)
- **Record Streaming**: Push notifications on memory record creation/modification/deletion (eliminates polling, event-based)
- **Resource-Based Policies**: Attach policies directly to memory resources (no need to modify caller IAM roles)

### 6.6 AgentCore Observability

**Role**: Provides complete visibility into agent lifecycle

- OpenTelemetry (OTEL) based instrumentation
- Amazon CloudWatch Generative AI observability dashboard integration
- Hierarchical view: Agent → Session → Trace → Span
- Monitoring for both agents inside and outside Runtime

🆕 **Latest Updates**:
- **Cross-Account Monitoring**: Observe up to 100,000 log groups from a central monitoring account (up to 5 monitoring accounts)
- **Trace latency under 10 seconds**: Immediate querying of complete traces with spans + logs
- **One-Click Enablement**: One-click observability activation for Memory/Gateway
- **X-Ray Unlimited Resources**: Enterprise-scale limit removal with wildcard support
- **UI Improvements**: Repetitive span bundling, visual icons, infrastructure noise filtering

### 6.7 AgentCore Evaluations

**Role**: Agent performance evaluation using LLM judges

- **Online evaluation**: Real-time production traffic sampling and assessment
- **On-demand evaluation**: Ad-hoc evaluation of specific interactions
- 🆕 **March 2026 GA** - Available for production use

🆕 **Latest Updates**:
- **13 built-in evaluators**: Response quality, safety, task completion, tool usage
- **Ground Truth support**: Compare against reference answers, behavioral assertions, expected tool execution sequences
- **Custom Evaluators**: LLM-based or code-based (Lambda) evaluation logic
- **Batch Evaluation**: Score comparison before/after changes by replaying past sessions (regression testing)
- **User Simulation**: Generate multi-turn conversations with LLM-based virtual users
- **Optimization**: Production trace analysis → prompt/tool description improvement recommendations → A/B test validation
- **50% evaluation latency improvement**: Significant P90 processing time reduction through incremental state management


### 6.8 Built-in Tools

#### AgentCore Browser
- Serverless browser infrastructure
- Web navigation and workflow automation
- Interaction, content extraction, screenshot capture
- Runs in isolated secure environments

🆕 **Latest Updates**:
- **OS-Level Interaction**: Mouse, keyboard, system notifications, print dialogs and other OS-level controls
- **Chrome Enterprise Policies**: 100+ browser behavior policy configurations
- **Custom Root CA**: Organization-signed SSL certificate support for internal services
- **Proxy Configuration**: IP stability, enterprise network integration
- **Browser Profiles**: Cookie/local storage persistence across sessions
- **Browser Extensions**: Load Chrome extensions (ad blockers, auth helpers, etc.)
- **Web Bot Auth (Preview)**: Reduce CAPTCHAs through cryptographic signing of HTTP requests

#### AgentCore Code Interpreter
- Safe code execution in isolated environments
- Large-scale data processing and analysis
- Data visualization and mathematical modeling
- File processing and transformation

🆕 **Latest Updates**:
- **Node.js Runtime Support**: JavaScript/TypeScript execution (with pre-installed libraries)
- **Custom Root CA**: Organization certificates for internal service connections
- **LangChain Deep Agents Integration**: LangChain official AWS native sandbox provider

### 🆕 6.9 AgentCore Payments (Preview)

**Role**: Autonomous payment infrastructure for AI agents

- Built in partnership with Coinbase and Stripe
- Agents autonomously pay for APIs, MCP servers, web content, and other agents
- Supports stablecoin or fiat currency payments
- Full payment lifecycle management: Wallet authentication → Transaction execution → Spending governance → Observability

**Significance**: The beginning of Agentic Commerce - a future where agents discover services, evaluate them, and pay in real-time

### 🆕 6.10 AWS Agent Registry (Preview)

**Role**: Centralized agent/tool discovery and governance catalog

- Register and discover agents, tools, skills, MCP servers, and custom resources
- Query via Console UI, API, or MCP server directly from IDE
- IAM and OAuth (Custom JWT) based access control
- Private governance catalog for managing agents within an organization

### 🆕 6.11 AgentCore CLI (GA)

**Role**: Manage the entire agent lifecycle via CLI

```bash
# Create project (supports various frameworks)
agentcore init --framework strands

# Local development (hot reload + Agent Inspector UI)
agentcore dev

# Add features
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
*AgentCore CLI commands for full agent lifecycle management*

**Supported Frameworks**: Strands, LangChain, Google ADK, OpenAI Agents, AutoGen

**Agent Inspector** (when running `agentcore dev`):
- Browser-based UI to chat with the agent
- Real-time inspection of token usage and tool calls
- Execution trace timeline visualization
- AgentCore Memory browsing


---

## 7. Deployment Architecture

### Three Deployment Methods

#### Method 1: Container-based Deployment
- **Maximum flexibility**: Custom frameworks, complex dependencies
- Build image with Dockerfile → Push to Amazon ECR → Deploy to Runtime

```
Agent Code + Dockerfile → Container Image → ECR → Runtime Endpoint
```
*Container-based deployment flow*

#### Method 2: Direct Code Deployment
- **Fast deployment**: Simple deployment via .zip file
- 🆕 Python + **Node.js** support

```
Agent Code (.zip) + Runtime Decorator → Runtime Endpoint
```
*Direct code deployment flow*

#### 🆕 Method 3: Managed Harness (GA - June 2026 NY Summit)
- **Fastest path**: Create an agent with 2 API calls (CreateHarness + InvokeHarness)
- No orchestration code needed - runs with configuration only
- Automatically manages reasoning, tool selection, execution, and response streaming
- Runs in isolated microVM
- Supports all model providers (Bedrock, Anthropic, OpenAI, Gemini)

```
Config File (Model + Prompt + Tools) → AgentCore manages the entire agentic loop
```
*Managed Harness deployment flow*

### Deployment Method Selection Guide

| Criteria | Container | Direct Code | 🆕 Managed Harness |
|------|----------|-----------|-------------------|
| **Setup Complexity** | High | Medium | Low (2 API calls) |
| **Flexibility** | Maximum | Medium | Within configuration scope |
| **Framework** | All supported | Python/Node.js | Not required |
| **Custom Dependencies** | Freely | Limited | Limited |
| **Best For** | Complex agents | Fast prototypes | Starting with minimal code |
| **File System** | 🆕 S3/EFS mount | 🆕 S3/EFS mount | 🆕 S3/EFS + session storage |

### Components Included in Deployment

| Component | Description |
|-----------|------|
| Runtime Endpoint Configuration | Scaling, timeout, resource settings |
| Dockerfile | Container image definition (container method only) |
| AgentCore Runtime Decorator | Agent entry point definition |
| AgentCore Observability Configuration | Monitoring and tracing settings |
| AgentCore Identity Configuration | Authentication/authorization settings |
| 🆕 File System Configuration | S3 Files / EFS mount settings |

---

## 8. Practical Agent Design Examples

### Customer Service Agent Architecture

```
+---------------------------------------------------------------------+
| Customer Service Agent                                              |
|                                                                     |
|  Framework: Strands Agents                                          |
|  Model: Amazon Bedrock (All Models)                                 |
|                                                                     |
|  +- Tools (via Gateway) ------------------------------------------+ |
|  |  • get_product_info()    — Product info lookup                  | |
|  |  • get_return_policy()   — Return policy lookup                 | |
|  |  • get_technical_support() — Technical support info             | |
|  |  • Web Browser           — Web browsing                         | |
|  |  • 🆕 Elicitation        — User confirmation request            | |
|  +----------------------------------------------------------------+ |
|                                                                     |
|  +----------------------+  +--------------------------------------+ |
|  | Short-term Memory    |  | Long-term Memory                     | |
|  | (Session Context)    |  | (Customer Preferences) 🆕 Metadata   | |
|  +----------------------+  | Filter                               | |
|                            +--------------------------------------+ |
|                                                                     |
|  -----------------------------------------------------------  |
|  Infrastructure: Runtime | Identity | Observability | Gateway       |
|          Policy | Evaluations | MCP                                |
|          🆕 Payments | Registry | CLI                              |
|  -----------------------------------------------------------  |
+---------------------------------------------------------------------+
```
*Complete customer service agent architecture utilizing AgentCore services*


### Agent Design Considerations

When designing an agent, you should answer the following questions:

1. **What do you plan to do with agentic AI?** → Define business objectives
2. **Which AgentCore services will you use?**
   - Runtime: How will you deploy? (Container / Direct Code / 🆕 Harness)
   - Memory: What information needs to be remembered? (Which memory strategy?)
   - Gateway: What tools are needed? (🆕 Is Elicitation needed?)
   - Policy: What constraints exist?
   - Identity: Who can access? (🆕 Is OBO needed?)
   - Browser/Code Interpreter: Is web browsing or code execution needed?
   - Observability: What needs to be monitored?
   - Evaluations: How will performance be measured? (🆕 Which evaluators to use?)
   - 🆕 Payments: Does the agent need to pay for external services?
   - 🆕 Registry: How will agents/tools be managed within the organization?

### Multi-Agent Patterns

Commonly used multi-agent architecture patterns in production environments:

#### Pattern 1: Orchestrator-Worker
```
         +------------------+
         |   Orchestrator   |
         |     Agent        |
         +---+------+---+---+
             |      |   |
             v      v   v
    +--------+ +--------+ +--------+
    |Worker A| |Worker B| |Worker C|
    |(Search)| |(Analysis)| |(Writing)|
    +--------+ +--------+ +--------+
```
*Pattern where an orchestrator delegates tasks to specialized worker agents*

#### Pattern 2: Pipeline
```
+---------------+    +---------------+    +---------------+    +--------------+
|   Agent A     |--->|   Agent B     |--->|   Agent C     |--->| Final Result |
|(Data Collection)|  |  (Analysis)   |    |(Report Writing)|   +--------------+
+---------------+    +---------------+    +---------------+
```
*Pipeline pattern where agents process tasks sequentially*

#### Pattern 3: Debate/Consensus
```
+------------+         +------------+
|  Agent A   |<------->|  Agent B   |
+-----+------+         +------+-----+
      |                       |
      v                       v
      +-------+   +----------+
              v   v
          +----------+
          |Consensus |
          +----+-----+
               v
          +--------------+
          |Final Decision|
          +--------------+
```
*Pattern where agents reach consensus through debate*

---

## 9. Knowledge Check and Key Summary

### Knowledge Check Questions

**Question 1**: What is the primary characteristic that demonstrates the need for an agentic AI solution?
- ✅ **Answer: B** - The requirement for cyclical decision-making through continuous adaptation
- Key point: Autonomous decisions + change adaptation + goal orientation = the essence of Agentic AI

**Question 2**: What are the 5 essential architecture components of an agentic system?
- ✅ **Answer: B** - Framework/Agent Code, Memory, Tools, LLM, Agent-to-Agent Communication
- Key point: Services (Runtime, Policy, etc.) are infrastructure, not the agent's own components

### Module Learning Objective Achievement Check

Upon completing this module, you can:
- ✅ Define characteristics of agentic AI and understand differences from traditional AI systems
- ✅ Identify core agent components and interactions between elements
- ✅ Explain how Bedrock AgentCore services support agentic AI


---

## 10. Additional Key Points - Instructor Supplementary Materials

### 10.1 MCP (Model Context Protocol) Deep Dive

MCP is a **standardized communication protocol** between agents and tools.

```
+--------------------+         +--------------------+
|      Agent         |<------->|     MCP Server     |
|  (MCP Client)      |  MCP    |  (Tool Provider)   |
+--------------------+Protocol +--------------------+
```
*Standardized communication between agent (MCP client) and MCP server*

**Core Values of MCP**:
- **Standardization**: Consistent interface for tool integration
- **Discoverability**: Agents dynamically discover available tools
- **Interoperability**: Compatibility between various frameworks and tools
- **Security**: Authenticated tool access and policy-based control

🆕 **Stateful MCP (March 2026)**:
- MCP servers maintain session context
- Elicitation: Collect user input during workflow
- Sampling: Server requests LLM calls during tool execution
- Progress Notifications: Real-time progress delivery for long-running tasks

🆕 **AgentCore MCP Server (awslabs/mcp)**:
- Use AgentCore directly from MCP clients like Kiro, Claude Code, Cursor
- Call Runtime, Memory, Browser, Code Interpreter without boto3
- Authenticate with AWS default credential chain

### 10.2 Strands Agents SDK Core Concepts

Strands Agents is an open-source agent framework provided by AWS.

**Basic Structure**:
```python
from strands import Agent, tool

@tool
def get_weather(city: str) -> str:
    """Retrieves the current weather for a city."""
    return f"Current weather in {city}: Clear, 25°C"

# Create agent
agent = Agent(tools=[get_weather])

# Run agent
response = agent("Tell me the weather in Seoul")
```

### 10.3 Agent Design Anti-patterns

Common mistakes to avoid when building production agents:

| Anti-pattern | Problem | Correct Approach |
|----------|--------|------------|
| **Excessive Autonomy** | Unpredictable behavior, cost explosion | Set guardrails with Policy |
| **Infinite Loops** | Repeated iterations without goal achievement | Set maximum iteration count, timeouts |
| **Single Monolithic Agent** | Increased complexity, difficult debugging | Separate into specialized smaller agents |
| **Ignoring Memory** | Starts from scratch every time | Use appropriate short/long-term memory |
| **Lack of Observability** | Unable to identify root causes | Configure Observability from the start |
| **Security as Afterthought** | Production security incidents | Apply Identity/Policy from early design |

### 10.4 Production Checklist

Items to verify before deploying an agent to production:

#### Security
- [ ] AgentCore Identity configured (inbound + outbound)
- [ ] Principle of least privilege applied (IAM policies)
- [ ] Tool call restrictions with AgentCore Policy
- [ ] 🆕 VPC Egress configured (when accessing private resources)
- [ ] 🆕 PrivateLink configured (for enterprise security requirements)

#### Performance
- [ ] Appropriate timeout settings
- [ ] Maximum loop iteration limits
- [ ] Token usage monitoring
- [ ] Auto-scaling configured
- [ ] 🆕 File system mount (when shared data is needed)

#### Observability
- [ ] AgentCore Observability enabled
- [ ] CloudWatch dashboard configured
- [ ] Alarms set (error rate, latency)
- [ ] 🆕 Cross-Account Monitoring (multi-account environments)

#### Quality
- [ ] AgentCore Evaluations online evaluation configured
- [ ] Key metrics defined (target success rate, usefulness, etc.)
- [ ] 🆕 Batch Evaluation regression test pipeline
- [ ] 🆕 User Simulation for edge case discovery
- [ ] 🆕 Optimization for automatic prompt/tool description improvement


### 10.5 Cost Considerations

Cost structure when operating production agents:

| Cost Factor | Description | Optimization Method |
|-----------|------|------------|
| **LLM Calls** | Token-based billing (input + output) | Prompt optimization, caching |
| **Loop Iterations** | Iteration count × LLM call cost | Maximum iteration limits, efficient tool design |
| **Tool Calls** | Lambda execution, API call costs | Minimize unnecessary calls |
| **Memory** | Storage and retrieval costs | Appropriate TTL, memory strategy optimization |
| **Runtime** | Computing resource costs | Appropriate instance size, auto-scaling |
| 🆕 **Harness** | microVM execution time | Set token budget/tool call limits |

### 10.6 Lecture Discussion Points

1. **"What workflows in your organization could be automated with agentic AI?"**
   - Customer service, data analysis, code review, incident response, etc.

2. **"How much autonomy should be granted to an agent?"**
   - Human-in-the-loop vs fully autonomous
   - 🆕 Gateway Elicitation enables mid-process confirmation

3. **"What is the biggest challenge when transitioning from prototype to production?"**
   - Security, scalability, cost management, observability
   - 🆕 AgentCore CLI can reduce this gap

4. 🆕 **"How do you think about a future where agents autonomously make payments?"**
   - Possibilities and governance challenges of AgentCore Payments

### 10.7 "What's the difference between existing Bedrock Agents and AgentCore?"

A frequently asked question from students:

| Category | Amazon Bedrock Agents | Amazon Bedrock AgentCore |
|------|----------------------|--------------------------|
| **Approach** | Fully managed, declarative | Infrastructure service, developer control |
| **Orchestration** | AWS managed | Developer's choice (or 🆕 Harness) |
| **Framework** | Bedrock only | All frameworks |
| **Model** | Bedrock models only | All model providers |
| **Best For** | Quick start, simple agents | Complex agents, custom logic |
| **Flexibility** | Limited | Maximum |

### 🆕 10.8 New York Summit 2026 - 3 Knowledge Layers for Agents

At the AWS Summit New York on June 17-18, 2026, AgentCore announced 3 knowledge layers
to help agents "know more and reach more." The core message is that **"a capable model is
just the starting point, and production performance comes from access to the right context,
resources, and feedback loops."**

| Knowledge Layer | Service | Status | Description |
|-----------|--------|------|------|
| **Organizational Knowledge** | Bedrock Managed Knowledge Base | GA | Connect unstructured data from SharePoint, Google Drive, Confluence, S3, etc. via managed RAG. AWS manages vector stores/embeddings/reranking, and Agentic Retriever plans, connects, and evaluates multi-step queries |
| **World Knowledge** | Web Search on AgentCore | GA | Search real-time web information within customer AWS security boundary (no data egress) |
| **Paid Knowledge** | AgentCore Payments + AWS WAF AI traffic monetization | Payments: Preview / WAF: GA | Agent autonomous payments (consumer side) + content provider billing (supplier side) |

> **Lecture Point**: This announcement extends concepts from existing modules.
> - Organizational Knowledge / World Knowledge → M04 (Tools and Gateway, Built-in Tools)
> - Paid Knowledge → M04 Payments, M03 Outbound Authentication
> - Continuous Learning (Optimization) → M06 (Observability and Evaluations)
> - Guardrails Integration → M03/M04 (Security and Policy)
> - Harness GA → M02 (Runtime Deployment)

Additionally, **AWS Context** (coming soon) was announced. It automatically maps relationships
between an organization's existing data as a knowledge graph, and provides agentic retrieval
where agents can access governed data relationships, business rules, and domain knowledge
at runtime.

---

## Region Availability (as of May 2026)

```
GA Regions (15+):
+-- Americas: US East (Virginia, Ohio), US West (Oregon), Canada (Central), São Paulo
+-- Europe: Frankfurt, Ireland, Stockholm, Paris, London
+-- Asia Pacific: Tokyo, Singapore, Sydney, Mumbai, Seoul ✅
+-- GovCloud: GovCloud (US-West)
```
*AgentCore GA region availability (as of May 2026)*

> **Note**: Seoul region (ap-northeast-2) has supported Runtime, Browser, Code Interpreter,
> and Observability since January 2026.

---

## Changes Summary vs Textbook

| Textbook Content (v1.0.4) | Current Status (May 2026) |
|---------------------|----------------------|
| 2 deployment methods | **3 methods** (+ Managed Harness) |
| No CLI | **AgentCore CLI GA** |
| No Payments | **AgentCore Payments Preview** |
| No Registry | **AWS Agent Registry Preview** |
| Gateway: Basic MCP | **MCP Sessions, SSE, Elicitation, Sampling** |
| Runtime: Python only | **Python + Node.js** |
| Memory: 3 strategies | **4 strategies** (+ Episodic) + Metadata Filtering |
| Evaluations: Basic | **GA** + Batch + Simulation + Optimization |
| Browser: Basic web navigation | **OS-Level, Proxy, Profiles, Extensions, Chrome Policies** |
| Security: IAM-based | **+ OBO, VPC Egress, ISO Certification, GovCloud** |
| (N/A) | 🆕 **NY Summit 2026**: Harness GA, Web Search, Managed Knowledge Base, Guardrails Integration, Optimization, WAF AI Traffic Monetization |

---

## References

- [Amazon Bedrock AgentCore Official Documentation](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/)
- [AgentCore Release Notes](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/release-notes.html)
- [New in Amazon Bedrock AgentCore (NY Summit 2026)](https://aws.amazon.com/blogs/machine-learning/new-in-amazon-bedrock-agentcore-build-agents-with-broader-knowledge-and-continuous-learning/)
- [Top announcements of the AWS Summit in New York, 2026](https://aws.amazon.com/blogs/aws/top-announcements-of-the-aws-summit-in-new-york-2026/)
- [Strands Agents SDK GitHub](https://github.com/strands-agents/sdk-python)
- [AgentCore CLI GitHub](https://github.com/aws/agentcore-cli)
- [AgentCore MCP Server (awslabs/mcp)](https://github.com/awslabs/mcp)
- [Model Context Protocol (MCP) Specification](https://modelcontextprotocol.io/)
- [OpenTelemetry Official Documentation](https://opentelemetry.io/docs/)

---

*This document is based on the content of MLAGAC-10-KO-KR-M01-Foundations_InstructorDeck.pdf,
and content marked with 🆕 is instructor supplementary material reflecting the latest service updates as of May 2026.*

*Document Version: 2.1 | Created: 2026-05-28 | Last Modified: 2026-06-23 | Update Baseline: Reflects AWS Summit New York June 2026*
