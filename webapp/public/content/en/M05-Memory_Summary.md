# Module 5: Implementing Agentic Memory

## Building Agentic AI with Amazon Bedrock AgentCore

---

## Table of Contents

1. [Agentic Memory Overview](#1-agentic-memory-overview)
2. [Short-term Memory and Long-term Memory](#2-short-term-memory-and-long-term-memory)
3. [Memory Strategies](#3-memory-strategies)
4. [Conversation Storage and Retrieval](#4-conversation-storage-and-retrieval)
5. [Namespaces and Memory Organization](#5-namespaces-and-memory-organization)
6. [Strands Agents and Memory Integration](#6-strands-agents-and-memory-integration)
7. [Memory Security](#7-memory-security)
8. [Knowledge Check and Key Takeaways](#8-knowledge-check-and-key-takeaways)
9. [Additional Key Points - Instructor Supplementary Material](#9-additional-key-points---instructor-supplementary-material)

> 🆕 Marker: Content added/changed after the textbook (v1.0.4, April 2026 build)

---

## 1. Agentic Memory Overview

### Why Is Memory Needed?

For an agent to provide true personalization and continuity, it must maintain context across conversations and remember information learned about the user.

### Memory Implementation Approaches: Managed (AgentCore Memory) vs Self-Managed

There are two main approaches to implementing agent memory:
- **Managed**: Delegate storage, extraction, and retrieval entirely to AgentCore Memory
- **Self-Managed**: Build your own memory infrastructure by combining other AWS services

> According to the official AWS blog, the self-managed (DIY) approach requires developers to orchestrate multiple components themselves, including raw conversation stores, vector databases, session caching systems, and custom retrieval logic.
> AgentCore Memory provides all of this as a single managed service.
>
> — Source: [Amazon Bedrock AgentCore Memory: Building context-aware agents](https://aws.amazon.com/blogs/machine-learning/amazon-bedrock-agentcore-memory-building-context-aware-agents/)

#### AgentCore Memory vs Self-Managed Comparison

| Comparison Item | AgentCore Memory (Managed) | Self-Managed |
|----------------|---------------------------|--------------|
| **Infrastructure Management** | Not required (fully managed) | Must provision and operate yourself |
| **Memory Extraction** | Built-in strategies extract automatically (semantic, summary, user preferences, episodic) | Developer must implement extraction logic |
| **Memory Consolidation** | Automatic (ADD/UPDATE/SKIP decisions) | Must implement deduplication and merge logic |
| **Vector Embedding & Indexing** | Built-in | Separate embedding model calls + vector DB management |
| **Short-term + Long-term Memory Integration** | Single API manages both | Configure separate systems for each (e.g., DynamoDB + OpenSearch) |
| **Semantic Search** | Built-in (RetrieveMemoryRecords) | Implement directly in vector DB |
| **Framework Integration** | Official connectors for Strands, LangGraph | Implement per framework or use community libraries |
| **Fine-grained Access Control** | Namespace + IAM condition keys | Configure IAM/security policies individually per service |
| **Search Latency** | Service-internal optimization (tens to hundreds of ms) | Adjustable depending on service choice (sub-ms to seconds) |
| **Cost Model** | AgentCore Memory API call-based | Individual billing per service used |
| **Customization** | Override built-in strategies or use Self-Managed Strategy | Full control (custom models, logic, schemas) |
| **Best For** | Rapid development, delegating extraction logic, standard memory patterns | Leveraging existing infrastructure, special performance SLAs, domain-specific logic |

#### AWS Services Available for Self-Managed Memory

You can build agent memory directly using other AWS services without using AgentCore Memory.

##### Option 1: Amazon DynamoDB — Conversation History and Agent State Storage

With DynamoDB, you can store and retrieve conversation history, session state, and agent checkpoints in a serverless environment.

**Implementation Approach**:
- Single table design using `session_id` as partition key and `timestamp` as sort key
- Checkpoint storage through LangGraph `DynamoDBSaver` (S3 offloading for large payloads)
- Externalizing conversation context to DynamoDB via Strands SDK session manager

**Use Cases**:
- Maintaining session state for multi-turn conversations (customer service chatbots, order management agents)
- Workflow checkpoints for LangGraph agents (storing and resuming intermediate states of multi-step tasks)
- Key-value storage for user profiles and preferences (when fast lookups are needed)

**Example: Storing session conversations in DynamoDB and resuming them in the next session (LangChain)**

The code below uses LangChain's `DynamoDBChatMessageHistory` to store a session's conversation in DynamoDB, then loads the previous conversation in a new session to maintain context and continue the dialogue.

> Reference: [LangChain DynamoDB Integration Documentation](https://python.langchain.com/v0.2/docs/integrations/memory/aws_dynamodb/)

```python
# Prerequisites:
# pip install langchain-community langchain-aws boto3
#
# Create DynamoDB table (AWS CLI):
# aws dynamodb create-table \
#   --table-name AgentChatHistory \
#   --attribute-definitions AttributeName=SessionId,AttributeType=S \
#   --key-schema AttributeName=SessionId,KeyType=HASH \
#   --billing-mode PAY_PER_REQUEST

# Import AWS SDK and LangChain related libraries
import boto3
# LangChain integration module for using DynamoDB as a conversation history store
from langchain_community.chat_message_histories import DynamoDBChatMessageHistory
# Wrapper class for using Amazon Bedrock's LLM with LangChain
from langchain_aws import ChatBedrock
# Modules for configuring prompt templates and message placeholders
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
# Wrapper that automatically injects message history into the chain
from langchain_core.runnables.history import RunnableWithMessageHistory

# ─── Step 1: DynamoDB Session History Factory ───
# Factory function that retrieves conversation history from DynamoDB using session ID as key
# RunnableWithMessageHistory internally calls this function to load/save history
def get_session_history(session_id: str) -> DynamoDBChatMessageHistory:
    """Factory function to retrieve conversation history from DynamoDB by session_id"""
    return DynamoDBChatMessageHistory(
        table_name="AgentChatHistory",  # DynamoDB table name
        session_id=session_id           # Session identifier used as partition key
    )

# ─── Step 2: Configure LLM + Prompt Chain ───
# Initialize Claude model from Amazon Bedrock
llm = ChatBedrock(
    model_id="anthropic.claude-sonnet-4-20250514",  # Model ID to use
    region_name="us-west-2"                    # Bedrock endpoint region
)

# Define prompt template:
# - system: Sets the agent's role and behavioral guidelines
# - MessagesPlaceholder: Position where previous conversation history is automatically inserted
# - human: Position where the current user input goes
prompt = ChatPromptTemplate.from_messages([
    ("system", "You are an AI assistant that helps with travel planning. "
               "Remember previous conversation content and provide consistent responses."),
    MessagesPlaceholder(variable_name="history"),  # Past conversations are auto-injected here
    ("human", "{input}")  # Current turn's user message
])

# Create chain by connecting prompt and LLM with pipe operator (|)
# Input → Prompt formatting → LLM call → Response return
chain = prompt | llm

# ─── Step 3: Create Chain with Automatic Message History Management ───
# RunnableWithMessageHistory automatically:
# 1) Calls get_session_history to load previous conversations
# 2) Inserts previous messages at the "history" position in the prompt
# 3) Saves new conversation (input+response) to DynamoDB
chain_with_history = RunnableWithMessageHistory(
    chain,                          # Base chain to execute
    get_session_history,            # Factory function to retrieve history
    input_messages_key="input",     # Key pointing to user message in input dictionary
    history_messages_key="history"  # Variable name where history is inserted in the prompt
)

# ─── Step 4: First Session (Starting Conversation) ───
# Session configuration: Identify and group conversations by session_id
session_config = {"configurable": {"session_id": "user-123-travel"}}

# First turn: Provide basic travel plan information
response1 = chain_with_history.invoke(
    {"input": "I'm planning a trip to Tokyo next week. It's a 3-night, 4-day trip."},
    config=session_config  # Conversation is saved to DynamoDB under this session ID
)
print(f"AI: {response1.content}")

# Second turn (within same session): Provide additional conditions
# Using the same session_id, so it responds while remembering the first turn's content
response2 = chain_with_history.invoke(
    {"input": "My budget is about $2000, and I want to focus on restaurants."},
    config=session_config
)
print(f"AI: {response2.content}")

# ─── Application terminates here (conversation is auto-saved to DynamoDB) ───
# Even when the application terminates, conversations are permanently stored in DynamoDB
# so they can be resumed later by connecting with the same session_id

# ─── Step 5: Next Session (Previous Conversation Auto-Restored) ───
# When connecting with the same session_id after time has passed, previous conversations are auto-loaded
# DynamoDBChatMessageHistory loads existing messages from the table and injects them into the prompt

response3 = chain_with_history.invoke(
    {"input": "Can you recommend restaurants near Shibuya for the Tokyo trip I mentioned earlier?"},
    config=session_config  # Same session_id → Previous conversation context auto-loaded
)
print(f"AI: {response3.content}")
# AI remembers previous context like "3-night 4-day", "$2000 budget", "restaurant focus" and responds

# ─── (Optional) Verify Stored History ───
# Directly query messages actually stored in DynamoDB
history = get_session_history("user-123-travel")
print(f"\nNumber of stored messages: {len(history.messages)}")
for msg in history.messages:
    # msg.type: Identifies speaker as "human" or "ai"
    print(f"  [{msg.type}]: {msg.content[:50]}...")
```

**How It Works**:
1. `DynamoDBChatMessageHistory` stores conversation messages as JSON in a DynamoDB table using `SessionId` as partition key
2. When reconnecting with the same `session_id`, existing messages are loaded from the table and auto-injected into the LLM prompt
3. Since data is permanently stored in DynamoDB, conversation continuity is maintained even when the application restarts

**References**: [Build durable AI agents with LangGraph and Amazon DynamoDB](https://aws.amazon.com/blogs/database/build-durable-ai-agents-with-langgraph-and-amazon-dynamodb/) | [Using DynamoDB as a checkpoint store for LangGraph agents](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/ddb-langgraph-checkpoint.html)

##### Option 2: Amazon ElastiCache for Valkey — Ultra-Low Latency Vector Search-Based Memory

Implement semantic memory for agents using the vector search capabilities of ElastiCache for Valkey (Redis OSS compatible).

**Implementation Approach**:
- Convert conversation content to embeddings and store them in Valkey's vector index
- Retrieve related past conversations/knowledge in milliseconds using vector similarity search
- Automate memory extraction and retrieval through Mem0 open source integration

**Use Cases**:
- Agents requiring real-time personalization (recommendation engines, real-time support)
- Semantic caching — reuse responses from similar previous questions to reduce LLM call costs
- Preventing redundant research (agent remembers previously investigated content)

**References**: [Setting up ElastiCache for Valkey as a vector store for agentic memory](https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/agentic-memory-setup.html) | [Build persistent memory for agentic AI applications with Mem0, ElastiCache for Valkey, and Neptune Analytics](https://aws.amazon.com/blogs/database/build-persistent-memory-for-agentic-ai-applications-with-mem0-open-source-amazon-elasticache-for-valkey-and-amazon-neptune-analytics/)

##### Option 3: Amazon Aurora PostgreSQL (pgvector) — Combining Structured Memory with Vector Search

Using the pgvector extension with Aurora PostgreSQL allows you to manage structured data (relational) and vector embeddings in the same database.

**Implementation Approach**:
- Store conversation logs in relational tables and semantic embeddings in pgvector columns
- Combine SQL filtering + vector similarity search in a single query
- Integrate with Amazon Bedrock's embedding models for automatic vector generation

**Use Cases**:
- Multi-tenant agent memory (combining tenant-level row security with vector search)
- Long-term memory with complex metadata filtering (filtering by department, date, priority, etc.)
- Adding agent memory to existing PostgreSQL-based applications

**References**: [How Letta builds production-ready AI agents with Amazon Aurora PostgreSQL](https://aws.amazon.com/blogs/database/how-letta-builds-production-ready-ai-agents-with-amazon-aurora-postgresql/) | [Self-managed multi-tenant vector search with Amazon Aurora PostgreSQL](https://aws.amazon.com/blogs/database/self-managed-multi-tenant-vector-search-with-amazon-aurora-postgresql/)

##### Option 4: Amazon OpenSearch Service (Serverless) — Large-Scale Vector Index and Hybrid Search

OpenSearch Serverless combines vector search, lexical (keyword) search, and hybrid search for agent long-term memory retrieval.

**Implementation Approach**:
- Simultaneously store information extracted from conversations as vector embeddings + keyword indexes
- Hybrid search combining k-NN vector search with BM25 text search
- Minimize infrastructure management with serverless auto-scaling

**Use Cases**:
- Large-scale knowledge base agents (searching across millions of past conversations/documents)
- Use as vector store for RAG pipelines (agent references organizational documents)
- When hybrid search is needed (exact keywords + semantic similarity simultaneously)

**References**: [Amazon OpenSearch Serverless vector database](https://aws.amazon.com/opensearch-service/serverless-vector-database/) | [The next generation of OpenSearch Serverless: Built from the ground up for agents](https://aws.amazon.com/blogs/big-data/the-next-generation-of-amazon-opensearch-serverless-built-from-the-ground-up-for-agents/)

##### Option 5: Amazon S3 Vectors — Large-Scale Low-Cost Vector Memory

S3 Vectors is a cloud object storage supporting native vector storage and querying, enabling large-scale agent memory operation at up to 90% lower cost.

**Implementation Approach**:
- Store memories extracted from agent interactions in vector buckets
- Perform semantic search with subsecond query performance
- Enable hot/warm memory separation through tiering strategies with OpenSearch Service

**Use Cases**:
- Shared memory for multi-agent systems (sharing findings, completed tasks, decision history between agents)
- Long-term archival of large vector datasets at low cost (hundreds of millions of records or more)
- Archive-type agent memory where searches are infrequent

**References**: [Building persistent memory for multi-agent AI systems with Amazon S3 Vectors](https://aws.amazon.com/blogs/storage/building-persistent-memory-for-multi-agent-ai-systems-with-amazon-s3-vectors/) | [Amazon S3 Vectors](https://aws.amazon.com/s3/features/vectors/)

##### Option 6: Amazon MemoryDB — Durable In-Memory Vector Search

MemoryDB is an in-memory database with Multi-AZ durability that supports vector search, providing ultra-low latency semantic search without memory loss.

**Implementation Approach**:
- Vector storage and similarity search via Valkey/Redis compatible API
- Permanent data storage to disk ensures no memory loss during node failures
- Use as a semantic caching layer to reuse responses for identical/similar questions

**Use Cases**:
- Production agents where memory loss is unacceptable (regulated environments like finance, healthcare)
- Real-time agents requiring ultra-low latency (single-digit millisecond search)
- Reducing LLM inference costs through semantic caching while improving response speed

**References**: [Vector search for Amazon MemoryDB is now generally available](https://aws.amazon.com/blogs/aws/vector-search-for-amazon-memorydb-is-now-generally-available/) | [Improve speed and reduce cost for generative AI workloads with a persistent semantic cache in Amazon MemoryDB](https://aws.amazon.com/blogs/database/improve-speed-and-reduce-cost-for-generative-ai-workloads-with-a-persistent-semantic-cache-in-amazon-memorydb/)

##### Self-Managed Options Summary Table

| Service | Memory Type | Search Latency | Scalability | Primary Use Case |
|---------|-------------|---------------|-------------|-----------------|
| **DynamoDB** | Session/State (key-value) | Single-digit ms | Unlimited horizontal scaling | Conversation history, checkpoints |
| **ElastiCache (Valkey)** | Vector + Cache | Sub-ms | Cluster scaling | Real-time semantic search, caching |
| **Aurora PostgreSQL** | Relational + Vector | Tens of ms | Read replica scaling | Multi-tenant, complex filtering |
| **OpenSearch Serverless** | Vector + Lexical | Tens of ms | Serverless auto-scaling | Large-scale hybrid search |
| **S3 Vectors** | Vector (large-scale) | Subsecond | Virtually unlimited | Large-scale low-cost long-term memory |
| **MemoryDB** | Vector + Persistent storage | Sub-ms | Cluster scaling | Durability + ultra-low latency combination |

##### Self-Managed Considerations

| Consideration | Description |
|---------------|-------------|
| **Implement Extraction Logic Yourself** | Must write the logic (prompts/model calls) that decides what to remember from conversations |
| **Consolidation Logic** | Must handle deduplication and merging of existing and new memories yourself |
| **Embedding Pipeline Management** | Must build the model calls and batch processing for text→vector conversion |
| **Orchestrating Multiple Services** | Must combine and connect multiple services such as short-term (DynamoDB) + long-term (OpenSearch/S3 Vectors) |
| **Security & Access Control Per Service** | Must manage IAM policies, encryption, and VPC settings separately for each service |
| **Operational Overhead** | Must manage monitoring, scaling, and incident response per service |
| **Framework Integration** | Must write integration code with Strands/LangGraph yourself or use community libraries |

### AgentCore Memory Architecture

```
+-------------------------------------------------------------------------+
|                         AgentCore Memory                                 |
|                                                                         |
|  +--------------------------+      +----------------------------------+ |
|  |    Short-term Memory      |      |        Long-term Memory           | |
|  |                          |      |                                  | |
|  |  +--------------------+  |      |  +----------------------------+ | |
|  |  |   Chat Messages     |  |      |  |     Semantic Memory         | | |
|  |  +--------------------+  |      |  +----------------------------+ | |
|  |  +--------------------+  |      |  |     User Preferences        | | |
|  |  |      Events         |  |      |  +----------------------------+ | |
|  |  +--------------------+  |      |  |         Summary             | | |
|  |                          |      |  +----------------------------+ | |
|  |    (Synchronous)         |      |  |     🆕 Episodic            | | |
|  +-------------+------------+      |  +----------------------------+ | |
|                |                   +----------------------------------+ |
|                |                                 ^                      |
|                v                                 |                      |
|       +------------------------+                |                      |
|       |    Memory Strategy      |----------------+                      |
|       |  (Async Extraction)     |                                       |
|       +------------------------+                                       |
|                                                                         |
|  +-----------------------------------------------------------------+   |
|  |                    Agent Implementation                          |   |
|  |                                                                   |   |
|  |  +---------------+ +------------------+ +----------------------+ |   |
|  |  | Message Store  | | Event Retrieval   | | Memory Record        | |   |
|  |  |    (Sync)      | |    (Sync)         | |   Retrieval (Async)  | |   |
|  |  +---------------+ +------------------+ +----------------------+ |   |
|  +-----------------------------------------------------------------+   |
+-------------------------------------------------------------------------+
```
*Overall architecture of AgentCore Memory: relationship between short-term memory, long-term memory, and memory strategies*

---

## 2. Short-term Memory and Long-term Memory

### Comparison Table

| Category | Short-term Memory | Long-term Memory |
|----------|-------------------|------------------|
| **Stored Content** | Raw events (chat messages, tool calls) | Processed and structured information |
| **Access Method** | Synchronous | Asynchronous |
| **Scope** | Within session | Across sessions (persistent) |
| **API** | CreateEvent, GetEvent, ListEvents | RetrieveMemoryRecords |

### When to Use Short-term Memory vs Long-term Memory

**When to use short-term memory**:

| Scenario | Description |
|----------|-------------|
| Maintaining multi-turn conversation within current session | When a user references a previous turn with phrases like "that order I mentioned earlier," maintain raw messages from that session to provide context |
| Tracking tool call results | When an agent calls an API and reasons based on the result, preserve tool calls and responses as raw events |
| Single-session self-contained tasks | For one-time Q&A or one-off problem solving where cross-session memory is unnecessary |
| Debugging and audit trails | Preserve raw conversation records to reconstruct exact interactions when issues arise |

**When to use long-term memory**:

| Scenario | Description |
|----------|-------------|
| Remembering repeat visitor preferences | When a user mentions "window seat preferred" or "vegetarian," store in long-term memory for automatic application in future sessions (Source: [AgentCore Memory official documentation](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/memory.html)) |
| Accumulating knowledge across sessions | When a customer revisits days later, remember previous consultation content so they don't need to re-explain everything |
| Preserving conversation summaries | Compress and store the essence of long conversations, providing context via summaries instead of full raw history in subsequent sessions |
| Agent learning and improvement | Extract patterns from past interactions so the agent generates better responses over time |
| Multi-agent collaboration | Knowledge learned by one agent can be retrieved and utilized by other agents |


### Movement from Short-term to Long-term Memory

```
+---------------------+
|  Short-term Memory   |
|                     |
|  +---------------+  |
|  |  Raw Events    |  |
|  +---------------+  |
|  +---------------+  |
|  | .add_turns()  |  |
|  | create_event  |  |
|  +-------+-------+  |
+----------+----------+
           |
           v
+------------------------------------------+
|      Memory Extraction (Async)           |
|  Every K messages / After X seconds idle |
+----------------------+-------------------+
                       |
                       v
+------------------------------------------+
|          Long-term Memory                |
|                                          |
|  +----------------+  +----------------+  |
|  | Vector Storage  |  |Embedding &     |  |
|  |                 |  |  Indexing       |  |
|  +----------------+  +----------------+  |
+----------------------+-------------------+
                       |
                       v
+------------------------------------------+
|   Consolidation (ADD/UPDATE/SKIP)        |
|   Similar memory search                  |
+------------------------------------------+
```
*Asynchronous extraction and consolidation process from short-term to long-term memory*

**Key Points**:
- The `create_event` operation stores events in short-term memory
- Every K turns triggers asynchronous extraction to long-term memory
- Extracted memories are embedded and indexed in vector storage

#### Detailed Movement Process

According to official documentation, long-term memory creation is performed as an **asynchronous background process**. When raw conversations are stored in short-term memory via `CreateEvent`, the activated memory strategy automatically triggers extraction.

**Step 1: Trigger — Raw Conversation Storage**

Each time a conversation is stored in short-term memory via the `create_event` operation, the activated strategy (ACTIVE state) recognizes the new raw data as a processing target. Conversations stored **before** the strategy becomes ACTIVE are not included in extraction targets.

**Step 2: Extraction**

An LLM-based extraction agent identifies meaningful information from raw conversations based on the memory strategy. Choose from **Semantic**, **User Preferences**, **Summary**, or **Episodic**.

**Step 3: Consolidation**

The extracted new information is compared with existing long-term memory, and long-term memory is updated through **ADD**, **UPDATE**, or **SKIP** decisions.

This consolidation process ensures that long-term memory doesn't expand unnecessarily and stays up to date.

**Step 4: Embedding and Indexing**

Final records (ADD or UPDATE) are converted to vector embeddings and indexed. Semantic search is then possible via the `RetrieveMemoryRecords` operation.

#### Complete Flow Summary

```
+---------------+     +--------------+     +--------------------------+
| User           |---->|create_event()|---->| Short-term Memory        |
| Conversation   |     +--------------+     | (Raw event storage)      |
+---------------+                           +-------------+------------+
                                                          | Async trigger
                                                          v
                                            +--------------------------+
                                            | Extraction               |
                                            | LLM identifies &         |
                                            | extracts insights        |
                                            +-------------+------------+
                                                          |
                                                          v
                                            +--------------------------+
                                            | Consolidation            |
                                            | Compare with existing    |
                                            | memory                   |
                                            | ADD/UPDATE/SKIP          |
                                            +-------------+------------+
                                                          |
                                                          v
                                            +--------------------------+
                                            | Vector Embedding +       |
                                            | Indexing                 |
                                            | (Long-term memory        |
                                            |  record stored)          |
                                            +-------------+------------+
                                                          |
                                                          v
                                            +--------------------------+
                                            | RetrieveMemoryRecords()  |
                                            | enables semantic search  |
                                            +--------------------------+
```
*Complete processing flow from user conversation to long-term memory record*
---

## 3. Memory Strategies

### Strategy Types

| Strategy | Description | Use Cases |
|----------|-------------|-----------|
| **Semantic** | Meaning-based search and storage | General conversation memory, knowledge accumulation |
| **User Preferences** | Learning personalized preferences | Diet, language, style preferences |
| **Summary** | Compression and key extraction of conversation content | Long conversation summaries, meeting notes |
| 🆕 **Episodic** | Memory by specific episode/event units | Specific interaction records, problem-solving history |

### Memory Resource Creation Code

```python
# Import memory client from AgentCore Memory SDK
from bedrock_agentcore.memory import MemoryClient

# Create memory client (connecting to us-west-2 region)
client = MemoryClient(region_name="us-west-2")

# Create memory resource and wait until ACTIVE state
# create_memory_and_wait polls until the resource is ready after the creation request
memory = client.create_memory_and_wait(
    name="MyAgentMemory",  # Identifying name for the memory resource
    strategies=[{
        # User preference strategy: automatically extracts and stores user preferences from conversations
        "userPreferenceMemoryStrategy": {
            "name": "UserPreference",  # Strategy name (for reference during retrieval)
            # {actorId} is replaced with the actual user ID at runtime
            # Separates memory per user to ensure isolation
            "namespaces": ["/users/{actorId}"]
        }
    }]
)
```

**Semantic Strategy Example**:
```python
# Create memory resource with semantic (meaning-based) strategy
# Semantic strategy extracts facts and knowledge from conversations and stores them as vector embeddings
memory = client.create_memory_and_wait(
    name="MyAgentMemory",
    strategies=[{
        # StrategyType.SEMANTIC.value evaluates to the string "semanticMemoryStrategy"
        # Using Enum prevents typos
        StrategyType.SEMANTIC.value: {
            "name": "CustomerSupport",  # Semantic memory for customer support
            # Separating namespaces per user ensures
            # one user's memory is never exposed to another user
            "namespaces": ["/users/{actorId}"]
        }
    }]
)
```

---

## 4. Conversation Storage and Retrieval

### Event Storage (Short-term Memory)

```python
# Create memory resource combining multiple memory strategies
# Apply both semantic + user preference strategies to a single memory
# to extract and store different types of information in their respective appropriate ways
memory = client.create_memory_and_wait(
    name="CustomerSupportMemory",  # Memory for customer support agent
    strategies=[
        {
            # Semantic strategy: extracts facts and general knowledge from conversations
            # e.g., "Customer lives in Seoul", "Product ordered last week was damaged"
            "semanticMemoryStrategy": {
                "name": "FactsAndKnowledge",
                # Store factual information separately in /facts sub-namespace
                "namespaces": ["/users/{actorId}/facts"]
            }
        },
        {
            # User preference strategy: extracts preferences and settings from conversations
            # e.g., "Prefers next-day delivery", "Wants email notifications", "Vegetarian diet"
            "userPreferenceMemoryStrategy": {
                "name": "PreferenceLearner",
                # Store preferences separately in /preferences sub-namespace
                "namespaces": ["/users/{actorId}/preferences"]
            }
        }
    ]
)
# Store the unique ID of the created memory resource (used for subsequent event storage and retrieval)
memory_id = memory.get("id")
print(f"Memory created: {memory_id}")
```

**Key Point**: `create_event` stores events in short-term memory and triggers asynchronous extraction to long-term memory every K turns.
 Long-term memory extraction is performed asynchronously, so querying immediately may return no results.
 In production, use Record Streaming (Kinesis) to detect extraction completion, or verify through polling.

### Memory Retrieval (Long-term Memory)

```python
# Perform semantic (meaning-based) search on long-term memory
# retrieve_memories converts the query text to a vector embedding,
# then calculates similarity with stored memory records to return highly relevant results
memories = client.retrieve_memories(
    memory_id=memory_id,  # Memory resource ID to search
    # Limit search scope to a specific user's preference namespace only
    # This prevents access to other users' memories and also improves search speed
    namespace="/users/sarah-kim/preferences",
    # Natural language query: converted to embedding for cosine similarity-based search
    query="Delivery-related preferences"
)
print(f"\nRetrieved memories:")
for mem in memories:
    # Each memory record's content field contains extracted information as text
    print(f"  - {mem.get('content')}")
# Example result: "User prefers next-day delivery"
```

**Key Point**: `retrieve_memories` performs **semantic search** on stored memories.

---

## 5. Namespaces and Memory Organization

### What Are Namespaces?

A hierarchical structure for logically grouping and organizing long-term memories.

**Characteristics**:
- Uses hierarchical format with slashes (/)
- Can include variables such as `{actorId}`, `{strategyId}`, `{sessionId}`
- Useful for efficiently organizing and retrieving memories
- Required when defining memory strategies

**Examples**:
```
/users/{actorId}                    → Per-user memory
/summaries/{actorId}/{sessionId}    → Per-user + per-session summaries
/teams/{teamId}/knowledge           → Team shared knowledge
```

---

## 6. Strands Agents and Memory Integration

### Approach 1: Tool-Based Integration

```python
# Imports for Strands SDK and AgentCore memory tool integration
from strands import tool, Agent
# Provider that exposes AgentCore Memory as a tool for Strands agents
from strands_tools.agent_core_memory import AgentCoreMemoryToolProvider

# Create memory tool provider
# This provider automatically exposes memory storage/retrieval tools to the agent,
# and the LLM autonomously decides "when to remember" and "what to retrieve" during conversation
strands_provider = AgentCoreMemoryToolProvider(
    memory_id=memory.get("id"),         # AgentCore Memory resource ID to connect
    actor_id="CaliforniaPerson",        # Current user identifier (substituted for {actorId} in namespace)
    session_id="sess1",                 # Current session identifier (groups short-term memory events)
    namespace="/users/CaliforniaPerson", # Namespace path to use for memory retrieval/storage
    region="us-west-2"                  # AgentCore service region
)
```

### Approach 2: Hook-Based Integration

```python
# Imports for Strands SDK's Hook system
# Hooks are callbacks that automatically execute at specific points in the agent lifecycle
from strands.hooks import (
    AfterInvocationEvent, HookRegistry, 
    MessageAddedEvent, HookProvider
)

# Define custom memory hook class inheriting from HookProvider
# This class reacts to agent events to automatically retrieve/save memory
class MyMemoryHooks(HookProvider):
    def retrieve(self, event: MessageAddedEvent):
        """Automatically called whenever a message is added to the conversation.
        Retrieves past memories related to the current message so
        the agent can reference previous context"""
        memories = client.retrieve_memories(...)
    
    def save(self, event: AfterInvocationEvent):
        """Automatically called after the agent's entire invocation completes.
        Saves this conversation's content as events in short-term memory
        to serve as source data for long-term memory extraction"""
        self.client.create_event(...)
    
    def register_hooks(self, registry: HookRegistry) -> None:
        """Method to register callbacks with the hook registry.
        Defines which functions react to which events"""
        # When a message is added → retrieve related memories
        registry.add_callback(MessageAddedEvent, self.retrieve)
        # After invocation completes → save conversation content
        registry.add_callback(AfterInvocationEvent, self.save)

# Create memory hook instance (pass client and memory resource reference)
memory_hooks = MyMemoryHooks(client, memory)
# Create agent with hooks connected
# Now the agent automatically retrieves memory on every conversation turn,
# and automatically saves content when conversation ends (operates deterministically without LLM judgment)
agent = Agent(hooks=[memory_hooks])
```

**Characteristic**: Event-based automatic save/retrieval (no LLM inference needed, deterministic behavior)

### Comparison of Both Approaches

| Criteria | Tool-Based | Hook-Based |
|----------|-----------|------------|
| **Save/Retrieve Timing** | LLM decides autonomously | Event-based automatic |
| **Token Cost** | Tokens consumed per tool call | No additional tokens |
| **Flexibility** | High (LLM judgment) | Medium (rule-based) |
| **Predictability** | Low (non-deterministic) | High (deterministic) |
| **Best For** | Complex memory logic | Consistent save/retrieval patterns |

---

## 7. Memory Security

### Basic IAM Policy

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": [
      "bedrock-agentcore:CreateEvent",
      "bedrock-agentcore:GetEvent",
      "bedrock-agentcore:ListEvents",
      "bedrock-agentcore:DeleteEvent",
      "bedrock-agentcore:RetrieveMemoryRecords"
    ],
    "Resource": "arn:aws:bedrock-agentcore::123456789012:memory/memory-123"
  }]
}
```

### Fine-Grained Access Control

AgentCore Memory provides fine-grained access control for securely managing multi-user and multi-session memory.

**Short-term Memory Context Keys**:

| Operation | Available Context Keys |
|-----------|----------------------|
| CreateEvent, DeleteEvent, GetEvent, ListEvents | `bedrock-agentcore:actorId`, `bedrock-agentcore:sessionId` |

**Long-term Memory Context Keys**:

| Operation | Available Context Keys |
|-----------|----------------------|
| RetrieveMemoryRecords, ListMemoryRecords, GetMemoryRecord, DeleteMemoryRecord | `bedrock-agentcore:namespace`, `bedrock-agentcore:strategyId` |

### Namespace-Based Access Control Example

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "SpecificNamespaceAccess",
    "Effect": "Allow",
    "Action": ["bedrock-agentcore:RetrieveMemoryRecords"],
    "Resource": "arn:aws:bedrock-agentcore:us-east-1:123456789012:memory/memory_id",
    "Condition": {
      "StringEquals": {
        "bedrock-agentcore:namespace": "summaries/agent1"
      }
    }
  }]
}
```

---

## 8. Knowledge Check and Key Takeaways

### Knowledge Check Questions

**Question 1**: A customer support agent that needs to remember customer preferences across multiple conversations - which memory pattern?
- ✅ **Answer: C** - User preference memory strategy with actor-based namespace
- Key point: "revisits days later" = persistent across sessions = long-term memory + user preference strategy

**Question 2**: Which correctly describes the relationship between short-term and long-term memory?
- ✅ **Answer: C** - Short-term memory stores raw events while long-term memory contains processed and structured information
- Key point: Short-term = raw data, Long-term = processed/structured information (auto-extracted)

### Module Learning Objectives Achievement Check

Upon completing this module, you can:
- ✅ Implement agentic memory patterns suited to various use cases
- ✅ Configure AgentCore Memory operations for context-aware development
- ✅ Optimize memory performance for production workloads


---

## 9. Additional Key Points - Instructor Supplementary Material

### 9.1 🆕 Structured Metadata Filtering (April 2026)

Attach structured attributes to long-term memory records and retrieve only results matching specific values:

**How to Use**:
1. Declare keys to index when creating the memory (cannot be removed after creation)
2. Configure metadata schema in the strategy → LLM automatically extracts from conversations
3. Apply metadata filters during retrieval/listing

**Examples of Filterable Attributes**:
- Priority (priority: high/medium/low)
- Department (department: finance/engineering)
- Tags (tags: urgent, follow-up)
- Time range (created_after, created_before)

**Use Case**:
```python
# 🆕 Structured Metadata Filtering usage example
# Add structured metadata filters to semantic search
# to improve search accuracy and pre-eliminate irrelevant results

# Search only high-priority memories from a specific department
memories = client.retrieve_memories(
    memory_id=memory_id,
    namespace="/support/tickets",  # Support ticket-related namespace
    query="Refund-related issues",  # Semantic search query (vector similarity-based)
    # metadata_filter: Pre-filter by metadata attributes before performing semantic search
    # This searches only records matching conditions from the total memory pool,
    # improving both search accuracy and performance
    metadata_filter={
        "department": "finance",  # Only finance department-related memories
        "priority": "high"        # Only high priority
    }
)
```

### 9.2 🆕 Record Streaming (March 2026)

Push-based notifications when memory records change (eliminates polling):

| Event | Description |
|-------|-------------|
| **Created** | When a new memory record is created |
| **Updated** | When an existing record is updated |
| **Deleted** | When a record is deleted |

**Use Cases**:
- Triggering downstream workflows (memory change → send notification)
- Tracking state changes between agents
- Implementing event-driven architectures

### 9.3 🆕 Resource-Based Policies (March 2026)

Attach policies directly to memory resources for fine-grained access control:

**Previous approach**: Required updating caller IAM roles for each new principal
**New approach**: Attach policy directly to memory resource → No modification of caller roles needed

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {"AWS": "arn:aws:iam::987654321098:role/other-agent"},
    "Action": ["bedrock-agentcore:RetrieveMemoryRecords"],
    "Resource": "arn:aws:bedrock-agentcore:us-east-1:123456789012:memory/shared-memory"
  }]
}
```

### 9.4 Memory Strategy Selection Guide

| Scenario | Recommended Strategy | Namespace Example |
|----------|---------------------|-------------------|
| Remembering customer preferences | User Preferences | `/users/{actorId}` |
| Conversation summaries | Summary | `/summaries/{actorId}/{sessionId}` |
| Knowledge accumulation | Semantic | `/knowledge/{topic}` |
| 🆕 Problem-solving history | Episodic | `/episodes/{actorId}` |
| Team shared knowledge | Semantic | `/teams/{teamId}/shared` |

### 9.5 Memory Performance Optimization

| Optimization Area | Method |
|-------------------|--------|
| **Search Accuracy** | Appropriate namespace design, leverage metadata filtering |
| **Storage Efficiency** | Set appropriate TTL, consolidate duplicate memories (UPDATE/SKIP) |
| **Cost Optimization** | Activate only needed strategies, limit search scope |
| **Latency** | Narrow search scope with namespaces, 🆕 pre-filter with metadata filters |

### 9.6 Tool-Based vs Hook-Based - Practical Selection Criteria

```
Choose Tool-based when:
+-- Agent needs to decide "when to remember" autonomously
+-- Complex memory logic (conditional save, selective retrieval)
+-- Prototype phase (fast experimentation)

Choose Hook-based when:
+-- All conversations must be saved consistently
+-- Token costs must be minimized
+-- Predictable behavior is important (production)
+-- Memory save/retrieval is always needed
```
*Selection criteria for tool-based vs hook-based memory integration approaches*

### 9.7 Multi-Agent Memory Sharing Pattern

```
+--------------------+         +------------------------------+
|    Agent A          |         |       AgentCore Memory        |
| (Customer Support)  |-------->|                              |
+--------------------+         |  /users/{userId}             |
                               |  /shared/knowledge           |
+--------------------+         |                              |
|    Agent B          |-------->|                              |
| (Technical Support) |         +------------------------------+
+--------------------+
```
*Pattern where multiple agents share the same AgentCore Memory*

- Multiple agents share the same memory resource
- Separate access scope with namespaces
- 🆕 Cross-account sharing possible with Resource-Based Policies
- 🆕 Real-time synchronization of changes with Record Streaming

### 9.8 Lecture Discussion Points

1. **"What should an agent remember and what should it forget?"**
   - Privacy vs personalization trade-off
   - GDPR/personal data deletion request handling (DeleteMemoryRecord)

2. **"When is short-term memory sufficient vs when is long-term memory needed?"**
   - Single-session Q&A → Short-term memory only
   - Repeat visiting customers → Long-term memory essential

3. **"How to combine memory strategies?"**
   - Multiple strategies can be applied simultaneously to a single memory resource
   - Example: User Preferences + Semantic + Summary

### 🆕 9.9 Memory vs Knowledge Base (June 2026 NY Summit)

With the **GA release of Bedrock Managed Knowledge Base in AgentCore** at the June 2026 AWS Summit New York, there's a need to clearly distinguish "Memory vs Knowledge Base" which students frequently confuse.

| Category | AgentCore Memory | Bedrock Managed Knowledge Base |
|----------|------------------|--------------------------------|
| **What It Stores** | Information the agent learns and remembers from conversations | Organization's existing unstructured documents (SharePoint, Drive, Confluence, S3, etc.) |
| **How It's Created** | Auto-extracted from conversation events | Data source connection → managed ingestion and indexing |
| **Search Method** | Namespace-based semantic search | Agentic Retriever (multi-step query planning, linking, re-ranking) |
| **Lifespan** | User/session context | Organizational knowledge (relatively static) |
| **Representative Question** | "Did this user say they're vegetarian?" | "What does the company refund policy document say?" |

> **Key Point**: These two are not competitors but **complementary**. Memory is "what the agent knows about the user," Knowledge Base is "knowledge the organization possesses." Production agents typically use both.
> (Knowledge Base details in M04 Module Section 10.8)

---

## Changes Summary vs Textbook

| Textbook Content (v1.0.4) | Current Status (May 2026) |
|---------------------------|--------------------------|
| 3 memory strategies | **4 strategies** (+ 🆕 Episodic) |
| Basic retrieval only | **🆕 Structured Metadata Filtering** |
| Polling-based change detection | **🆕 Record Streaming** (push-based) |
| IAM role-based access only | **🆕 Resource-Based Policies** (direct resource policies) |
| Basic observability | **🆕 One-Click Observability** (Memory one-click activation) |
| Basic VPC support | VPC support (since September 2025) |
| Organizational knowledge connection separate | 🆕 **NY Summit 2026**: Bedrock Managed Knowledge Base added to AgentCore (complementary to memory) |
| Self-managed options not mentioned | 🆕 Added usage patterns for DynamoDB, ElastiCache, Aurora pgvector, OpenSearch, S3 Vectors, MemoryDB |

---

## References

- [AgentCore Memory Official Documentation](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/memory.html)
- [Long-term Memory Metadata Filtering](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/long-term-memory-metadata.html)
- [Memory Record Streaming](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/memory-record-streaming.html)
- [Resource-Based Policies](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/resource-based-policies.html)
- [Episodic Memory Strategy](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/episodic-memory-strategy.html)
- [Strands Agents SDK - Memory](https://github.com/strands-agents/sdk-python)

### Self-Managed Memory Implementation References

- [Build durable AI agents with LangGraph and Amazon DynamoDB](https://aws.amazon.com/blogs/database/build-durable-ai-agents-with-langgraph-and-amazon-dynamodb/)
- [Using DynamoDB as a checkpoint store for LangGraph agents](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/ddb-langgraph-checkpoint.html)
- [Setting up ElastiCache for Valkey as a vector store for agentic memory](https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/agentic-memory-setup.html)
- [Build persistent memory with Mem0, ElastiCache for Valkey, and Neptune Analytics](https://aws.amazon.com/blogs/database/build-persistent-memory-for-agentic-ai-applications-with-mem0-open-source-amazon-elasticache-for-valkey-and-amazon-neptune-analytics/)
- [How Letta builds production-ready AI agents with Amazon Aurora PostgreSQL](https://aws.amazon.com/blogs/database/how-letta-builds-production-ready-ai-agents-with-amazon-aurora-postgresql/)
- [Building persistent memory for multi-agent AI systems with Amazon S3 Vectors](https://aws.amazon.com/blogs/storage/building-persistent-memory-for-multi-agent-ai-systems-with-amazon-s3-vectors/)
- [Vector search for Amazon MemoryDB](https://aws.amazon.com/blogs/aws/vector-search-for-amazon-memorydb-is-now-generally-available/)
- [The next generation of OpenSearch Serverless: Built for agents](https://aws.amazon.com/blogs/big-data/the-next-generation-of-amazon-opensearch-serverless-built-from-the-ground-up-for-agents/)

---

*This document is based on the content of MLAGAC-10-KO-KR-M05-Memory_InstructorDeck.pdf,
and content marked with 🆕 represents instructor supplementary material reflecting the latest service updates as of May 2026.*

*Document version: 2.2 | Created: 2026-05-28 | Last modified: 2026-06-26 | Update basis: Reflects June 2026 AWS Summit New York + self-managed memory options added*
