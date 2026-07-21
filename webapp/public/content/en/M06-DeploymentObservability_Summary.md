# Module 6: Production Monitoring and Observability

## Building Agentic AI with Amazon Bedrock AgentCore

---

## Table of Contents

1. [Observability and Agents](#1-observability-and-agents)
2. [AgentCore Observability Overview](#2-agentcore-observability-overview)
3. [Key Concepts (Sessions, Traces, Spans)](#3-key-concepts)
4. [CloudWatch Generative AI Dashboard](#4-cloudwatch-generative-ai-dashboard)
5. [Observability View Hierarchy](#5-observability-view-hierarchy)
6. [Configuration Requirements and Best Practices](#6-configuration-requirements-and-best-practices)
7. [AgentCore Evaluations](#7-agentcore-evaluations)
8. [Knowledge Check and Key Takeaways](#8-knowledge-check-and-key-takeaways)
9. [Additional Key Points - Instructor Supplementary Materials](#9-additional-key-points---instructor-supplementary-materials)

> 🆕 Marker: Content added/changed after the textbook (v1.0.4, April 2026 build)

---

## 1. Observability and Agents

### Why Is Observability Important for Agents?

Agents have fundamentally different characteristics from traditional applications:

| Characteristic | Reason for Observability |
|----------------|--------------------------|
| **Non-deterministic control flow** | Selects different paths each time based on model reasoning |
| **Complex chained calls** | Root cause analysis needed for multi-step tool invocations |
| **System state assessment** | Holistic evaluation of operational performance required |
| **Performance degradation detection** | Monitoring latency, error rates, and token usage |

---

## 2. AgentCore Observability Overview

### Service Position

```
+----------------------------------------------------------+
|                    AgentCore Services                      |
|                                                          |
|  Runtime | Identity | Gateway | Memory                   |
|  Browser | Code Interpreter | Evaluations                |
|  Policy | MCP | A2A                                      |
|                                                          |
|  +----------------------------------------------------+  |
|  |         AgentCore Observability (OTEL-based)        |  |
|  +----------------------------------------------------+  |
+----------------------------------------------------------+
        ^                           ^
        |                           |
   +----+----+              +-------+-------------------+
   |   App   |              | All Models / All Frameworks|
   +---------+              +---------------------------+
```
*Service position of AgentCore Observability: OTEL-based observability layer supporting all models/frameworks*

### 3 Key Benefits

| Benefit | Description |
|---------|-------------|
| **Maintain quality and trust** | Comprehensive visibility, accelerated debugging, rapid issue detection |
| **Reduce time to market** | CloudWatch-provided dashboards save developer time, no manual data integration needed |
| **3P tool integration** | Integration with various monitoring tools beyond CloudWatch, leveraging existing observability stacks (details below) |

#### 3P Tool Integration Details

AgentCore Observability exports telemetry data in standard **OpenTelemetry (OTEL) compatible format**, enabling direct integration with your existing observability stack.

**OTEL-Compatible 3rd Party Solutions:**

| Solution | Integration Method |
|----------|-------------------|
| **Datadog** | Collects agent traces and spans via LLM Observability SDK |
| **Dynatrace** | Provides end-to-end insights for production environments via OpenLLMetry (OpenTelemetry-based) |
| **Grafana Cloud** | Monitors LLM metrics, costs, and quality assessments via AI Observability Integration |
| **Langfuse** | Open-source LLM observability platform, integrates traces and monitoring via OTEL standard |
| **Elastic Observability** | Monitors agent reasoning paths and performance via Elastic APM |
| **IBM Instana** | Provides AgentCore agent observability through automatic instrumentation |
| **Honeycomb** | Offers unified trace view of agent execution trajectories and environment changes via Agent Timeline |
| **Splunk** | Real-time metric delivery via CloudWatch Metric Streams → Kinesis Firehose |
| **New Relic** | Real-time metric delivery via CloudWatch Metric Streams → Kinesis Firehose |
| **Sumo Logic** | Real-time metric delivery via CloudWatch Metric Streams → Kinesis Firehose |

> **Key Point**: Because AgentCore adopts the OTEL standard format, telemetry can be routed to any backend that supports OTEL Collector. The design intent is to leverage existing observability infrastructure without vendor lock-in.

---

## 3. Key Concepts

### Hierarchy Structure

```
+-------------------------------------------------------------+
|                      Session                                 |
|                                                             |
|  +-------------------------------------------------------+  |
|  |          Trace — a single turn                        |  |
|  |                                                       |  |
|  |  +-------------------------------------------------+  |  |
|  |  |  Span — one unit of agent work                  |  |  |
|  |  |         (Reasoning, Action, Observation)        |  |  |
|  |  |                                                 |  |  |
|  |  |  +-------------------------------------------+  |  |  |
|  |  |  |       Sub-span                            |  |  |  |
|  |  |  +-------------------------------------------+  |  |  |
|  |  +-------------------------------------------------+  |  |
|  +-------------------------------------------------------+  |
+-------------------------------------------------------------+
```
*Observability hierarchy structure: Session > Trace > Span > Sub-span*

| Concept | Description |
|---------|-------------|
| **Session** | The entire interaction unit between a user and an agent |
| **Trace** | The complete execution path for a single request |
| **Span** | An individual unit of work within a trace (model invocation, tool execution, etc.) |
| **Sub-span** | Detailed operations within a span |

#### Scenario Example: Shopping Mall Customer Support Agent — Defective Product Handling

> Customer "Kim Minsu" contacts support via chat about a defective wireless earbuds purchased last week

```
📦 Session: session-a1b2c3
|  Customer: Kim Minsu | Start: 14:02:10 | End: 14:08:45
|  (Entire conversation from chat open to close)
|
+-- 🔹 Trace 1: "Order history lookup request" (14:02:10 ~ 14:02:14)
|   |  Customer message: "I have a problem with the wireless earbuds I ordered last week"
|   |
|   +-- Span 1-1: LLM Reasoning (intent detection)  --- 120ms
|   |     +-- Sub-span: Prompt assembly + tokenization (15ms)
|   +-- Span 1-2: Tool call [OrderHistory API]  --- 850ms
|   |     +-- Sub-span: DB query (customer_id=C-9921) (620ms)
|   +-- Span 1-3: LLM Reasoning (response generation)  --- 200ms
|   |     +-- Sub-span: Identify order #ORD-20260619 + response formatting
|   +-- Agent response: "Confirmed wireless earbuds, order #ORD-20260619.
|                         What issue are you experiencing?"
|
+-- 🔹 Trace 2: "Defect report intake & policy check" (14:03:02 ~ 14:03:09)
|   |  Customer message: "No sound from the left earbud"
|   |
|   +-- Span 2-1: LLM Reasoning (defect type classification)  --- 150ms
|   +-- Span 2-2: Tool call [ReturnPolicy API]  --- 300ms
|   |     +-- Sub-span: Return window calc (within 14 days of purchase)
|   +-- Span 2-3: Tool call [InventoryCheck API]  --- 420ms
|   |     +-- Sub-span: Exchange stock availability check
|   +-- Span 2-4: LLM Reasoning (resolution options)  --- 180ms
|   +-- Agent response: "Confirmed hardware defect. Please choose between
|                         a free exchange or a full refund."
|
+-- 🔹 Trace 3: "Exchange processing" (14:04:15 ~ 14:04:22)
|   |  Customer message: "I'd like an exchange please"
|   |
|   +-- Span 3-1: LLM Reasoning (exchange procedure planning)  --- 100ms
|   +-- Span 3-2: Tool call [CreateExchange API]  --- 1,200ms
|   |     +-- Sub-span: Create return receipt (400ms)
|   |     +-- Sub-span: Create exchange shipment (500ms)
|   |     +-- Sub-span: Send customer notification email (300ms)
|   +-- Span 3-3: LLM Reasoning (confirmation message)  --- 130ms
|   +-- Agent response: "Exchange confirmed! Return pickup is scheduled for
|                         tomorrow, new product arrives in 2-3 days. (Exchange #: EX-88432)"
|
+-- 🔹 Trace 4: "No further questions -> Session end" (14:08:40 ~ 14:08:45)
    |  Customer message: "Thank you, that's all"
    |
    +-- Span 4-1: LLM Reasoning (end-of-conversation intent)  --- 80ms
    +-- Agent response: "Glad I could help. Have a great day!"
```
*Shopping mall customer support agent scenario: Hierarchical observability structure of Session > Trace > Span > Sub-span*

**Value provided by observability in this scenario:**

| Observation Target | Insight |
|--------------------|---------|
| Entire session | Total conversation time 6 min 35 sec, 4 turns, successful resolution |
| Total latency of Trace 3 | 7 seconds → CreateExchange API is the bottleneck (1.2s) |
| If error occurs in Span 2-3 | Inventory API timeout → Root cause traceable for why only refund was offered instead of exchange |
| Token usage | Entire session InputToken 1,840 / OutputToken 620 |

### Model Invocation Metrics

| Category | Metrics |
|----------|---------|
| **Invocations** | Count, latency, throttles, error count |
| **Tokens** | Token count per model, daily token count per ModelID, InputTokenCount, OutputTokenCount |


---

## 4. CloudWatch Generative AI Dashboard

### Unified Monitoring Targets

AgentCore Observability provides unified metrics in CloudWatch for the following services:

| Service | Monitoring Content |
|---------|--------------------|
| **Agents** | Overall agent metrics, session list |
| **Gateway** | Tool call metrics, routing performance |
| **Memory** | Storage/retrieval metrics |
| **Browser** | Web browsing session metrics |
| **Code Interpreter** | Code execution metrics |
| **Identity** | Authentication metrics |

---

## 5. Observability View Hierarchy

### 4-Level Drill-Down Structure

```
+---------------------------------------------------------------+
| Level 1: Agent View                                           |
| • Overall agent metrics                                       |
| • AgentCore Runtime metrics                                   |
| • List of agents connected to CloudWatch                      |
+-------------------------------+-------------------------------+
                                |
                                v
+---------------------------------------------------------------+
| Level 2: Agent Detail View                                    |
| • Individual agent metrics                                    |
| • AgentCore Runtime metrics                                   |
| • Session list                                                |
+-------------------------------+-------------------------------+
                                |
                                v
+---------------------------------------------------------------+
| Level 3: Session Detail View                                  |
| • Trace summary (server errors, client errors, throttles)     |
| • Session details                                             |
| • Trace list                                                  |
+-------------------------------+-------------------------------+
                                |
                                v
+---------------------------------------------------------------+
| Level 4: Trace Detail View                                    |
| • Span count, throttles, client/server errors                 |
| • P95 span latency                                            |
| • Start/end time                                              |
| • Span timeline and trajectory                                |
+---------------------------------------------------------------+
```
*Observability 4-level drill-down view hierarchy structure*

### Trace Details - Span Timeline

The span timeline visually displays the start/end times and parallel/sequential relationships of each operation.

### Trace Details - Span Trajectory

The span trajectory visualizes the agent's reasoning path as a node graph.

### Span Details

Detailed information for individual spans: input/output, latency, metadata, error information, etc.

---

## 6. Configuration Requirements and Best Practices

### Required Configuration

| Requirement | Description |
|-------------|-------------|
| **CloudWatch setup** | Enable transaction search in CloudWatch per AWS account |
| **X-Ray configuration** | Enable trace data collection |
| **Package requirement** | Include `aws-opentelemetry-distro` in `requirements.txt` |
| **Runtime execution** | Use the `opentelemetry-instrument` command |
| **IAM permissions** | Grant access permissions for CloudWatch, CloudWatch Logs, and X-Ray |

### Production Observability Best Practices

| Area | Recommendation |
|------|----------------|
| **Instrumentation** | Instrument custom runtime metrics with ADOT SDK |
| **Visibility** | Prevent production execution blind spots with comprehensive observability |
| **Monitoring** | Monitor error rates, latency thresholds, and token usage |
| **Tracing** | Fully trace customer interactions with session-level tracking |
| **Availability** | Maintain high availability while quickly identifying issues |

🆕 **Latest Updates**:
- **One-Click Enablement**: One-click observability activation for Memory/Gateway (Runtime, Browser, Code Interpreter already supported)
- **Trace latency under 10 seconds**: Full trace with spans + logs available for immediate query
- **UI improvements**: Repetitive span bundling, visual icons, infrastructure noise filtering

---

## 7. AgentCore Evaluations

### Need for Agent Performance Evaluation

| Purpose | Description |
|---------|-------------|
| **Quality assurance** | Verify accuracy, usefulness, and safety of agent responses |
| **Performance monitoring** | Track quality changes over time |
| **Business impact** | Measure goal achievement rate and customer satisfaction |
| **Risk mitigation** | Detect harmful responses and hallucinations |

### Evaluations Architecture

```
+----------+     +-----------------+     +----------+
|   User   |---->| AgentCore       |---->|  Agent   |
+----------+     | Runtime         |     +----------+
                 +--------+--------+
                          |
                          v
              +-------------------------------+
              |  AgentCore Observability       |
              |     (Trace Collection)         |
              +---------------+---------------+
                              |
                              v
              +-------------------------------+
              |    AgentCore Evaluations       |
              |                               |
              |  LLM Judge call per metric     |
              |  Results with judge explanation |
              +-------+---------------+-------+
                      |               |
                      v               v
              +--------------+ +--------------+
              |Online Eval   | |On-demand Eval|
              +-------+------+ +-------+------+
                      |                |
                      +--------+-------+
                               v
                  +--------------------------+
                  | Agent Owner <- Review     |
                  | Results                  |
                  +--------------------------+
```
*AgentCore Evaluations architecture: Trace collection → LLM judge evaluation → Results review*


### Evaluation Metrics by Level

| Level | Metric | Question |
|-------|--------|----------|
| **Session** | Goal success rate | "Did the agent complete the user's entire task across multiple turns?" |
| **Trace** | Correctness, faithfulness, helpfulness, relevance, conciseness, coherence, guideline adherence, refusal, harmfulness, stereotyping | "Is this response accurate and useful?" |
| **Span** | Tool selection accuracy, parameter selection accuracy | "Was the correct tool selected? Were the parameters accurate?" |

### Evaluation Types

| Type | Description | Use Cases |
|------|-------------|-----------|
| **Online evaluation** | Real-time production traffic sampling and continuous monitoring | Quality degradation detection, real-time monitoring |
| **On-demand evaluation** | Ad-hoc evaluation of specific interactions | Pre-deployment testing, CI/CD gates, regression testing |
| **🆕 Batch Evaluation** | Run agents against pre-defined datasets (scenarios) and perform server-side batch evaluation | Before/after score comparison, regression detection, large-scale test suite execution |

#### Evaluation Type Support Matrix

| Evaluation Method | Online Evaluation | On-demand Evaluation | Batch Evaluation |
|-------------------|:-----------------:|:--------------------:|:----------------:|
| **LLM-as-a-Judge** (built-in + custom) | ✅ | ✅ | ✅ |
| **Code-based evaluation** (Lambda) | ✅ | ✅ | ✅ |
| **Ground Truth comparison** | ❌ | ✅ | ✅ |


### Evaluation Methods

#### LLM-as-a-Judge Evaluation

AgentCore Evaluations uses the **LLM-as-a-Judge** technique. After converting agent traces into a unified format, a separate evaluation LLM (judge model) scores them according to pre-defined prompt templates and scoring criteria.

```
+----------------------------------------------------------------------+
| LLM-as-a-Judge Evaluation Flow                                       |
+----------------------------------------------------------------------+

+--------------------------+     +-------------------+     +------------------------------+
| Agent Trace               |---->| Convert to         |---->| LLM Judge call per evaluator  |
| (OTEL Collection)         |     | unified format     |     |                              |
+--------------------------+     +-------------------+     | Input: Prompt template +     |
                                                           |        Scoring criteria +    |
                                                           |        Trace                 |
                                                           |                              |
                                                           | Output: Score(0~1) + Label + |
                                                           |         Explanation           |
                                                           +--------------+---------------+
                                                                          |
                                                                          v
                                                           +------------------------------+
                                                           | Display results in CloudWatch |
                                                           | dashboard                    |
                                                           +------------------------------+
```
*LLM-as-a-Judge evaluation flow: Agent trace collection → Unified format conversion → Judge model evaluation → Dashboard display*

**Key Characteristics:**
- Built-in evaluators include AWS-optimized prompt templates, evaluation models, and scoring criteria that cannot be modified
- Scores are returned as normalized values in the 0.0-1.0 range
- Each score comes with an explanation written by the LLM judge, enabling tracking of "why this score"

##### Built-in Evaluators Details

**Session-Level Evaluators**

| Evaluator | What It Evaluates | Evaluation Method |
|-----------|-------------------|-------------------|
| **GoalSuccessRate** | Determines whether the user's goal was successfully completed across the entire conversation | Analyzes all turns in the session to comprehensively assess whether the user's requested task was completed |

**Trace-Level Evaluators (Individual Response Quality)**

| Evaluator | What It Evaluates | Evaluation Method |
|-----------|-------------------|-------------------|
| **Correctness** | Whether the information in the response is factually accurate | Compares claims in the response against facts to determine factual errors |
| **Faithfulness** | Whether the response is grounded in provided context/sources | Checks whether response content is supported by reference materials such as tool outputs and search results (hallucination detection) |
| **Helpfulness** | Whether the response is useful to the user | Comprehensively evaluates instruction following, consistency, and meeting the user's implicit expectations |
| **Relevance** | Whether the response is related to the user's question | Determines if the response directly addresses the core intent of the question |
| **Conciseness** | Whether it is appropriately concise without omitting key information | Evaluates whether the response delivers only the essentials without unnecessary repetition or verbosity |
| **Coherence** | Whether the response is logically structured and consistent | Checks logical flow between sentences and absence of contradictions |
| **GuidelineAdherence** | Whether it complies with guidelines specified in the system prompt | Determines violations of guidelines and rules configured for the agent |
| **Refusal** | Whether the agent evades or directly refuses a question | Detects patterns of inappropriate refusal to answer answerable questions |
| **Harmfulness** | Whether the response contains harmful content | Determines presence of harmful content such as violence, hate, or dangerous information |
| **Stereotyping** | Whether the response contains stereotypes | Detects biased expressions regarding gender, race, religion, etc. |

**Span-Level Evaluators (Tool Usage Accuracy)**

| Evaluator | What It Evaluates | Evaluation Method |
|-----------|-------------------|-------------------|
| **ToolSelectionAccuracy** | Whether the correct tool was selected | Determines the appropriateness of the called tool against user intent |
| **ParameterSelectionAccuracy** | Whether parameters passed to the tool are accurate | Verifies whether the input values of the called tool match the user's request |

#### Code-Based Evaluation (Custom Code-Based Evaluator)

Instead of an LLM judge, this approach uses an **AWS Lambda function** as the evaluation engine to programmatically assess agent performance. It does not consume FM tokens and is suitable for cases requiring deterministic verification.

```
+--------------------------------------------------------+
| Code-Based Evaluation (Custom Code-Based Evaluator)     |
+--------------------------------------------------------+

+----------------------+     +--------------------------+
| Agent Trace           |---->| AgentCore Evaluations    |
| (OTEL Collection)     |     | Service                  |
+----------------------+     +------------+-------------+
                                          | Lambda invocation
                                          | (pass evaluation input)
                                          v
                             +--------------------------+
                             |   User Lambda Function    |
                             |                          |
                             | Input: Agent span data   |
                             |        (I/O, tools)      |
                             |                          |
                             | Logic: Business rules,   |
                             |        regex, ext. APIs  |
                             |                          |
                             | Output: Score(0~1) +     |
                             |         Label + Explain  |
                             +------------+-------------+
                                          |
                                          v
                             +--------------------------+
                             | Display results in       |
                             | CloudWatch dashboard     |
                             +--------------------------+
```
*Code-based evaluation flow: Trace collection → Programmatic evaluation via Lambda function → Dashboard display*

**Differences Compared to LLM-as-a-Judge:**

| Item | LLM-as-a-Judge | Code-Based Evaluation |
|------|:--------------:|:---------------------:|
| Evaluation entity | LLM (judge model) | Lambda function (user code) |
| FM token consumption | Yes | No |
| Deterministic | Non-deterministic (same input can yield different scores) | Deterministic (same input → same score) |
| Suitable evaluation | Semantic judgment (helpfulness, correctness, coherence, etc.) | Structure verification, rule compliance, format validation, etc. |

**Examples implementable with code-based evaluation:**

| Evaluation Logic | Description |
|------------------|-------------|
| Regex validation | Pattern matching to ensure PII like email/phone numbers are not exposed in responses |
| Structure validation | Verify JSON responses conform to expected schema |
| External API lookup | Verify price/inventory information mentioned in responses matches actual DB |
| Business rules | Domain-specific rule violation checks (e.g., financial regulation compliance) |
| Response length limits | Verify response token count is within allowed range |

> **Note**: Code-based evaluators can be used in both online and on-demand evaluations, but are not yet supported in A/B Testing (only built-in/custom LLM-as-a-Judge available).

#### Ground Truth Evaluation (Programmatic — No LLM Invocation)

In addition to built-in LLM judges, programmatic comparison against pre-defined correct answers is also supported:

| Comparison Target | Evaluation Method |
|-------------------|-------------------|
| **Expected Response** | Semantic comparison of agent response against pre-defined expected response using LLM |
| **Expected Trajectory** | Programmatic verification that the actual tool call sequence exactly matches the expected sequence (order, tool names, omissions, additions) |
| **Assertions** | Verify whether the response satisfies specific conditions (assertions) |

### Online Evaluation Creation Code

```python
from bedrock_agentcore_starter_toolkit import Evaluation

eval_client = Evaluation()

config = eval_client.create_online_config(
    config_name="YOUR_CONFIG_NAME",
    agent_id="YOUR_AGENT_ID",
    sampling_rate=1.0,
    evaluator_list=["Builtin.GoalSuccessRate", "Builtin.Helpfulness"],
    config_description="Online Evaluation Config",
    auto_create_execution_role=True,
    enable_on_create=True
)

config_id = config['onlineEvaluationConfigId']
print(f"Saved config_id: {config_id}")
```

### On-Demand Evaluation Creation Code

```python
from bedrock_agentcore_starter_toolkit import Evaluation

eval_client = Evaluation()

results = eval_client.run(
    agent_id="YOUR_AGENT_ID",
    session_id="YOUR_SESSION_ID",
    evaluators=["Builtin.Helpfulness", "Builtin.GoalSuccessRate"]
)

successful = results.get_successful_results()
failed = results.get_failed_results()

print(f"Successful: {len(successful)}")
print(f"Failed: {len(failed)}")

if successful:
    result = successful[0]
    print(f"Evaluator: {result.evaluator_name}")
    print(f"Score: {result.value:.2f}")
    print(f"Label: {result.label}")
    if result.explanation:
        print(f"Explanation: {result.explanation[:150]}...")
```

### Viewing Evaluations in CloudWatch

| View | Content |
|------|---------|
| **Agent detail view** | Evaluator list, average scores, changes over time |
| **Evaluations tab** | Evaluator details, list of evaluated sessions/traces |
| **Trace detail view** | Evaluator scores for sessions/traces/spans |

---

## 8. Knowledge Check and Key Takeaways

### Knowledge Check Questions

**Question 1**: Agent performance monitoring + understanding tool call/decision process + understanding overall flow
- ✅ **Answer: B** - Configure AgentCore Observability with OpenTelemetry instrumentation to capture sessions, traces, and spans
- Key point: AgentCore Observability = OTEL-based + Session/Trace/Span hierarchy = Full flow visibility

**Question 2**: Which view provides individual agent metrics + Runtime metrics + session list?
- ✅ **Answer: B** - Agent detail view
- Key point: Level 2 view = Detailed information for an individual agent

### Module Learning Objectives Achievement

Upon completing this module, you can:
- ✅ Configure AgentCore Observability for production monitoring
- ✅ Implement Amazon CloudWatch integration and specialized tracing
- ✅ Describe the core capabilities of AgentCore Evaluations

---

## 9. Additional Key Points - Instructor Supplementary Materials

### 9.1 🆕 Evaluations GA (March 2026)

AgentCore Evaluations significantly enhanced with general availability release:

| Feature | Description |
|---------|-------------|
| **13 built-in evaluators** | Response quality, safety, task completion, tool usage |
| **Ground Truth support** | Reference answers, behavioral assertions, expected tool execution sequence comparison |
| **Custom Evaluators** | LLM-based or code-based (Lambda) evaluation logic |
| **50% evaluation latency improvement** | P90 processing time significantly reduced through incremental state management |

### 9.2 🆕 Agent Performance Loop (May 2026)

Closed loop of Observe → Evaluate → Optimize → Deploy:

```
+-------------+     +-------------+     +-------------+     +-------------+
|   Observe    |     |  Evaluate   |     |  Optimize   |     |   Deploy    |
|  (Observe)   |---->| (Evaluate)  |---->| (Optimize)  |---->|  (Deploy)   |
|Observability |     | Evaluations |     |Optimization |     |  Runtime    |
+-------------+     +-------------+     +-------------+     +------+------+
       ^                                                           |
       +-----------------------------------------------------------+
                         Continuous iteration
```
*Agent Performance Loop: Continuous closed loop of Observe → Evaluate → Optimize → Deploy*

**3 New Features**:

| Feature | Description |
|---------|-------------|
| **Optimization** | Analyze production traces + evaluation results → Recommend prompt/tool description improvements → Validate with A/B testing |
| **Batch Evaluation** | Replay past/curated sessions → Compare before/after scores → Detect regressions |
| **User Simulation** | Generate multi-turn conversations with LLM-based virtual users → Discover behaviors beyond scripted test cases |

**🆕 NY Summit 2026 Update (June 2026) - Optimization Enhancement**:

At AWS Summit New York in June 2026, AgentCore announced optimization capabilities that "transform production traces into continuous improvement." The emphasis is that the most dangerous failures are not those that throw errors, but **silent failures that appear normal on dashboards**. (e.g., confirming an order modification that was never executed, fabricating inventory when API times out, skipping approval steps while showing 99% success rate)

| Feature | Status | Description |
|---------|--------|-------------|
| **Insights** | **Preview** | Failure, intent, and trajectory insights across hundreds of sessions. ① **Failure insights**: Discover recurring failure patterns (including error-free silent failures), explain root causes, rank by impact scale ② **Intent insights**: Cluster requests by actual user intent ③ **Trajectory insights**: Group paths agents take to handle tasks. Continuous daily/weekly monitoring or targeted investigation after deployments/complaint spikes (results in minutes) |
| **Recommendations** | **GA** | Analyze traces and evaluation outputs to provide specific improvement suggestions for system prompts and tool descriptions |
| **Batch Evaluation** | **GA** | Validate recommendations with defined test datasets, report aggregate scores → Detect regressions before reaching production |
| **A/B Testing** | **GA** | Split live production traffic for controlled comparison between agent versions → Obtain real evidence before committing |

> **Important - Execution Environment Independence**: All these features work regardless of whether the agent runs on **AgentCore Runtime, AWS Lambda, Amazon EKS, or non-AWS environments**.

> **Note on 'User Simulation' from the textbook**: This guide previously introduced User Simulation as one axis of the closed loop based on an earlier release. The core components from the NY Summit 2026 official announcement are **Insights → Recommendations → Batch Evaluation → A/B Testing**. (User Simulation-related APIs may change, so please verify with the latest official documentation)

### 9.3 🆕 Cross-Account Monitoring (April 2026)

Monitor agents across multiple accounts centrally in enterprise environments:

```
+------------------------------------------------------------------+
|                   Central Monitoring Account                       |
|                                                                  |
|          Logs + Metrics + Traces + Evaluations Results            |
|                                                                  |
|  Limits: Max 100,000 log groups / monitoring account             |
|          Max 5 monitoring accounts / source account              |
+------------------------------------------------------------------+
        ^                       ^                       ^
        |                       |                       |
+-------+----------+  +--------+---------+  +---------+------------+
| Source Account A  |  | Source Account B  |  |  Source Account C     |
| (Agents 1,2,3)   |  | (Agents 4,5)     |  |  (Agents 6,7,8,9)    |
+------------------+  +------------------+  +----------------------+
```
*Cross-Account Monitoring architecture: Centralized monitoring of agents across multiple source accounts*

### 9.4 🆕 Observability Performance Improvements

| Improvement Area | Before | Current |
|------------------|--------|---------|
| Trace query latency | Spans 10s, logs 30s | **Under 10 seconds** (spans + logs unified) |
| Evaluation processing time | Baseline | **50% reduction** (P90) |
| Log query cost | Baseline | **60-80% decrease** |
| X-Ray resource limit | 1,200 | **Unlimited** (wildcard) |

### 9.5 Observability Configuration Checklist

#### Basic Configuration
- [ ] Enable CloudWatch transaction search
- [ ] Enable X-Ray trace collection
- [ ] Include `aws-opentelemetry-distro` package
- [ ] Grant IAM permissions (CloudWatch, Logs, X-Ray)
- [ ] 🆕 Enable Memory/Gateway One-Click activation

#### Production Configuration
- [ ] Set up alarms (error rate, P95 latency, token usage)
- [ ] Configure online evaluation (set sampling_rate)
- [ ] 🆕 Cross-Account Monitoring (multi-account environments)
- [ ] 🆕 Batch Evaluation CI/CD pipeline integration
- [ ] Dashboard customization

### 9.6 Evaluator Selection Guide

| Evaluation Purpose | Recommended Evaluator |
|--------------------|----------------------|
| Overall task completion | `Builtin.GoalSuccessRate` |
| Response usefulness | `Builtin.Helpfulness` |
| Factual accuracy | `Builtin.Correctness` |
| Source faithfulness | `Builtin.Faithfulness` |
| Safety | `Builtin.Harmfulness`, `Builtin.Refusal` |
| Tool usage accuracy | `Builtin.ToolSelectionAccuracy`, `Builtin.ParameterAccuracy` |
| 🆕 Custom business logic | Custom Evaluator (Lambda) |
| 🆕 Reference answer comparison | Ground Truth Evaluator |

### 9.7 Pattern for Integrating Evaluations into CI/CD

```
Code Change -> PR Created
    |
    v
CI Pipeline:
    +-- Build & Test
    +-- 🆕 Batch Evaluation (past session replay)
    |       +-- Score comparison: previous version vs new version
    |       +-- Regression detected -> Block PR
    +-- 🆕 User Simulation (virtual user test)
    |       +-- Edge case discovery
    +-- Deploy approval gate
         +-- Score threshold met -> Proceed with deployment
```
*Pattern for integrating Evaluations into CI/CD pipeline: Build → Batch evaluation → Simulation → Deploy approval*

### 9.8 Lecture Discussion Points

1. **"How can evaluations improve the design of the agent you are building?"**
   - Low tool selection accuracy → Improve tool descriptions
   - Low goal success rate → Improve system prompt
   - High harmfulness score → Add guardrails

2. **"Online evaluation vs on-demand evaluation — when to use which?"**
   - Online: Continuous production quality monitoring (always on)
   - On-demand: Pre-deployment verification, specific issue investigation, CI/CD gates

3. **"Which metrics should be monitored first?"**
   - Priority 1: Error rate, goal success rate
   - Priority 2: Latency, token usage
   - Priority 3: Tool selection accuracy, harmfulness

---

## Changes Summary Compared to Textbook

| Textbook Content (v1.0.4) | Current Status (May 2026) |
|----------------------------|---------------------------|
| Evaluations basic description | **🆕 GA** + 13 built-in evaluators + Ground Truth + Custom |
| Online/on-demand only | **🆕 + Batch Evaluation + User Simulation + Optimization** |
| Basic trace latency | **🆕 Under 10 seconds** (spans + logs unified) |
| Single account monitoring | **🆕 Cross-Account Monitoring** (max 100K log groups) |
| Manual observability activation | **🆕 One-Click Enablement** (Memory/Gateway) |
| Basic UI | **🆕 UI improvements** (span bundling, icons, noise filtering) |
| X-Ray 1,200 resource limit | **🆕 Unlimited** (wildcard) |
| Basic evaluation speed | **🆕 50% faster evaluation** (incremental state management) |
| Optimization not released | 🆕 **NY Summit 2026**: Insights (Preview), Recommendations/Batch Eval/A/B Testing (GA), execution environment independence (Runtime/Lambda/EKS/non-AWS) |

---

## References

- [AgentCore Observability Official Documentation](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/observability.html)
- [AgentCore Evaluations Documentation](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/evaluations.html)
- [Optimization Documentation](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/optimization.html)
- [Batch Evaluations Getting Started](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/batch-evaluations-getting-started.html)
- [User Simulation Documentation](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/user-simulation.html)
- [Cross-Account Monitoring](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/observability-cross-account.html)
- [Observability Configuration](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/observability-configure.html)
- [AgentCore New Optimization Capabilities (NY Summit 2026)](https://aws.amazon.com/about-aws/whats-new/2026/06/amazon-bedrock-agentcore-new-optimization-capabilities/)
- [New in Amazon Bedrock AgentCore - Continuous Learning (NY Summit 2026)](https://aws.amazon.com/blogs/machine-learning/new-in-amazon-bedrock-agentcore-build-agents-with-broader-knowledge-and-continuous-learning/)

---

*This document is based on the content of MLAGAC-10-KO-KR-M06-DeploymentObservablity_InstructorDeck.pdf,
and content marked with 🆕 is instructor supplementary material reflecting the latest service updates as of May 2026.*

*Document version: 2.1 | Created: 2026-05-28 | Last modified: 2026-06-23 | Update basis: Reflects AWS Summit New York June 2026*
