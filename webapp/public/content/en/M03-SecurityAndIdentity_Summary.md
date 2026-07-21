# Module 3: Security and Identity Management

## Building Agentic AI with Amazon Bedrock AgentCore

---

## Table of Contents

1. [Security Challenges of Agentic Systems](#1-security-challenges-of-agentic-systems)
2. [Inbound Authentication Patterns](#2-inbound-authentication-patterns)
3. [Outbound Authentication Patterns](#3-outbound-authentication-patterns)
4. [Authorization Patterns (SigV4, 2LO, 3LO)](#4-authorization-patterns)
5. [Self-Managed Authentication/Authorization Configuration](#5-self-managed-authenticationauthorization-configuration)
6. [Introduction to AgentCore Identity](#6-introduction-to-agentcore-identity)
7. [Workload Credentials](#7-workload-credentials)
8. [Credential Provider Configuration](#8-credential-provider-configuration)
9. [Runtime and Identity Integration](#9-runtime-and-identity-integration)
10. [Knowledge Check and Key Takeaways](#10-knowledge-check-and-key-takeaways)
11. [Additional Key Points - Instructor Supplementary Material](#11-additional-key-points---instructor-supplementary-material)

> 🆕 Indicator: Content added/changed after the textbook (v1.0.4, April 2026 build)

---

## 1. Security Challenges of Agentic Systems

### Paradigm Shift

Agentic AI requires a fundamental paradigm shift from a security perspective:

> **Static user permissions** → **Dynamic context-aware authorization**

### 5 Credential Challenges Posed by Agents

```
+-------------------------------------------------------------------+
|                   Agent Security Challenge Map                     |
|                                                                   |
|  Caller                 Agent              Target Service          |
|  +----------+         +----------+         +--------------+      |
|  | Customer |-------->| Agent 1  |-------->| Internal API |      |
|  | Employee |-------->|          |         +--------------+      |
|  | Batch Job|-------->|          |                                |
|  | External |-------->|          |         +--------------+      |
|  | Agent    |         +----------+    +--->| Google       |      |
|  +----------+         +----------+    |    +--------------+      |
|                        | Agent 2  |----+--->| ServiceNow   |      |
|                        +----------+    |    +--------------+      |
|                                        +--->| JIRA         |      |
|                                             +--------------+      |
|                                                                   |
|  Challenge Areas:                                                 |
|    ① Access Control & Enforcement                                 |
|    ② Authorization & Delegation                                   |
|    ③ Credential Lifecycle Mgmt & Scaling                          |
|    ④ SaaS & Third-party Integration                               |
|    ⑤ Governance & Compliance                                      |
+-------------------------------------------------------------------+
```
*Five security challenges faced by agents and the caller-agent-target service relationship*


### Enterprise Security Architecture Considerations

| Area | Requirements |
|------|-------------|
| **Audit Trail** | Detailed audit trails for agents, recording all actions along with user context |
| **Network Controls** | Agent network access and endpoint controls |
| **Data Governance** | Maintaining tenant boundaries, complying with data classification |
| **Incident Response** | Implementing per-agent incident response procedures |
| **Permission Revocation** | Supporting rapid agent permission revocation capabilities |

---

## 2. Inbound Authentication Patterns

### What is Inbound Authentication?

Authentication when users/applications access the agent:

```
+------+    +-----+    +----------------+    +----------+
| User |--->| App |--->|  Inbound Auth  |--->|  Agent   |
+------+    +-----+    |                |    +----------+
                       | "Who is this   |
                       |  user?"        |
                       | "Can they      |
                       |  invoke this   |
                       |  agent?"       |
                       +----------------+
```
*Inbound authentication: Authentication flow when a user accesses the agent*

### Inbound Authentication Methods

| Method | Description | Use Cases |
|--------|-------------|-----------|
| **Amazon Cognito** | User authentication credential provider | Web/mobile app user authentication |
| **API Key** | System-to-system communication | Inter-service calls, batch jobs |
| **Federated Authentication** | Enterprise SSO | Enterprise internal users |
| **IAM SigV4** | AWS signature-based authentication | AWS inter-service communication |
| **JWT Bearer Token** | OAuth 2.0 token-based | General-purpose authentication |

### Runtime Inbound Authentication Configuration

AgentCore Runtime supports two types of inbound authentication:

1. **IAM SigV4 Authentication**: Based on AWS credentials, suitable for inter-service communication
2. **JWT Bearer Token Authentication**: Based on OAuth 2.0, suitable for user-facing applications

#### How IAM SigV4 Works

AWS Signature Version 4 (SigV4) is the standard authentication protocol used for all AWS API calls. It includes a cryptographic signature in the request to simultaneously verify the caller's identity and the integrity of the request.

**SigV4 Authentication Flow (General AWS Services)**:

```
+----------------------------------+     +------------------------------+
| Caller                           |     | AWS Service Endpoint         |
| (IAM User or Role)              |     | (e.g. S3, DynamoDB, Bedrock) |
+--------------+-------------------+     +--------------^---------------+
               |                                        |
               | 1. Generate signature with             | 3. Look up Secret Key by
               |    Secret Access Key                   |    Access Key ID
               | 2. Include Access Key ID +             | 4. Recompute signature with
               |    signature in header                 |    same algorithm
               v                                        | 5. Signature match
+----------------------------------+                    |    -> Identity verified
| HTTP Request + Authorization     |--------------------+ 6. Evaluate IAM policy
| Header                           |
| AWS4-HMAC-SHA256                 |
| Credential + SignedHeaders +     |     +------------------------------+
| Signature                        |---->| Request Approved or Denied   |
+----------------------------------+     | (403 Forbidden)              |
                                         +------------------------------+
```
*AWS SigV4 authentication protocol flow: Signature generation → Transmission → Signature verification → Policy evaluation*

> **💡 Roles of Access Key ID vs Secret Access Key**
>
> | Element | Transmitted Over Network | Role |
> |---------|:------------------------:|------|
> | **Access Key ID** | ✅ Transmitted | Public identifier. Tells AWS "this is who I am" |
> | **Secret Access Key** | ❌ Never transmitted | Used only for signature generation. AWS recomputes the signature with the same key to verify |
>
> Analogy: Access Key ID = bank account number (can be shared), Secret Access Key = personal seal (only the owner possesses)

**Security Properties of SigV4**:

| Property | Description |
|----------|-------------|
| **Identity Verification** | Identifies the caller via Access Key ID, proves identity through signature match |
| **Integrity Assurance** | SHA-256 hash of the request body (payload) is included in the signature → detects tampering during transmission |
| **Replay Prevention** | Includes timestamp, signature validity limited to within 5 minutes → prevents reuse of intercepted requests |
| **Secret Key Non-exposure** | The Secret Access Key itself is never transmitted over the network (used only for signature derivation) |
| **Scope Limitation** | Signature is bound to a specific date/region/service → cannot be reused for other services |


> **Core Principle**: SigV4 is an HMAC-based challenge-response pattern that "signs the message with a shared secret (Secret Key), and the receiver recomputes the signature with the same secret to verify." Since the secret key never traverses the network, when combined with HTTPS it provides strong authentication and integrity simultaneously.

### 💡 Relationship Between the 5 Authentication Methods and Runtime's 2 Configurations

The 5 authentication methods above represent **all authentication patterns to consider when designing agentic system architecture**, while the Runtime's 2 configurations are the **protocols that the AgentCore Runtime endpoint actually validates**. Multiple authentication methods ultimately converge into two at the Runtime level:

```
[Concept Level - 5 Auth Methods]            [Runtime Implementation - 2 Configs]
----------------------------------          ----------------------------------
Amazon Cognito      -----+
Federation(SSO)     -----+--->    JWT Bearer Token Auth
JWT Bearer Token    -----+        (Custom JWT Authorizer)
IAM SigV4           ----------->   IAM SigV4 Auth
API Key             ----------->   (Handled outside Runtime - API Gateway, etc.)
```
*Relationship showing how 5 authentication methods converge to 2 at the Runtime level*

**Convergence Principle**:
- **Cognito, Federation (Okta/Entra ID)**: Ultimately issue JWT/OIDC tokens, so at the Runtime they are validated via `customJWTAuthorizer`
- **IAM SigV4**: AWS native signing method that Runtime validates directly
- **API Key**: Not a native authentication mechanism of AgentCore Runtime; handled at the front-end API Gateway or application layer

---

## 3. Outbound Authentication Patterns

### What is Outbound Authentication?

Authentication when the agent accesses external resources (tools, APIs, services):

```
Agent ---> [Outbound Auth] ---> Tools, Resources, Gateway
           "Who is this agent?"
           "Can it access on behalf of user?"
           "Is it who it claims to be?"
```
*Outbound authentication questions when the agent accesses external resources*

### 3 Basic Patterns of Outbound Authentication

| Pattern | Method | Use Cases |
|---------|--------|-----------|
| **AWS Credentials** | IAM Role | AWS service access (S3, DynamoDB, etc.) |
| **OAuth Client Credentials (2LO)** | Machine-to-machine authentication | System operations, backend services |
| **OAuth Authorization Code Flow (3LO)** | User-delegated access | When user consent is needed (GitHub, Google, etc.) |

---

## 4. Authorization Patterns

### SigV4 (AWS Signature Version 4)

```
Agent --[IAM Role]---> AWS Services (S3, DynamoDB, Bedrock, etc.)
```
- Standard authentication for AWS service access
- Fine-grained permission control via IAM policies
- Automatic rotation of temporary credentials

### OAuth 2-Legged (2LO) - Client Credentials

```
+----------+                    +------------------+                  +--------------+
|  Agent   |                    |   Auth Server    |                  |External Service|
+----+-----+                    | (Token Endpoint) |                  |    (API)     |
     |                          +--------+---------+                  +------^-------+
     | ① POST /token                     |                                   |
     |   (grant_type=client_credentials)  |                                   |
     |   + Client ID + Client Secret      |                                   |
     |   + scope (Request Scope)          |                                   |
     |----------------------------------->|                                   |
     |                                    |                                   |
     | ② 200 OK                           |                                   |
     |   { access_token, token_type,      |                                   |
     |     expires_in }                   |                                   |
     |<-----------------------------------|                                   |
     |                                                                        |
     | ③ API Call + Authorization: Bearer <access_token>                      |
     |   (Access resource with agent's own credentials)                       |
     |------------------------------------------------------------------------>|
     |                                                                        |
```
*OAuth 2LO (Client Credentials) flow: Agent accesses external services with its own permissions*

```python
# AgentCore Identity SDK - 2LO (Client Credentials) Example
from bedrock_agentcore.identity import requires_access_token
from bedrock_agentcore.runtime import BedrockAgentCoreApp

app = BedrockAgentCoreApp()

@requires_access_token(
    provider_name="my-service-provider",      # Pre-registered credential provider name
    scopes=["api.read", "api.write"],         # OAuth scopes to request
    auth_flow="CLIENT_CREDENTIALS"            # 2LO: No user intervention
)
async def call_external_api(*, access_token: str):
    """Call external service with agent's own credentials"""
    import httpx
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://api.example.com/system/status",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        return response.json()
```

- Machine-to-machine authentication without user intervention
- Operates with the agent's own permissions
- Suitable for background tasks and system integrations

### OAuth 3-Legged (3LO) - Authorization Code Flow

```
+----------+   +----------+   +--------------+    +--------------+
|   User   |   |  Agent   |   |  Auth Server |    |External Service|
+----+-----+   +----+-----+    |    (IdP)     |   +------^-------+
     |              |          +------+-------+          |
     |<-------------| ① Generate auth URL |              |
     |              |                 |                  |
     | ② Login + consent in browser        |              |
     |------------------------------->|                  |
     |                                |                  |
     | ③ Deliver auth code to callback URL  |              |
     |<--------------------------------|                  |
     |              |                  |                  |
     |------------->| ③ Pass auth code |                  |
     |              |                  |                  |
     |              | ④ Exchange auth   |                  |
     |              |   code for token  |                  |
     |              |----------------->|                  |
     |              |                  |                  |
     |              |<-----------------|                  |
     |              | ⑤ Access Token   |                  |
     |              |   + Refresh Token|                  |
     |              |                                     |
     |              | ⑥ Store in token vault (per user)   |
     |              |                                     |
     |              | ⑦ API call on behalf of user        |
     |              |------------------------------------>|
     |              |                                     |
     |              |<------------------------------------|
     |              | ⑧ Response                          |
```
*OAuth 3LO (Authorization Code) flow: User consent-based delegated access*

| Step | Description |
|------|-------------|
| ① | Agent generates an auth URL and delivers it to the user |
| ② | User logs in to IdP in the browser and consents to access permissions |
| ③ | IdP returns an Authorization Code to the callback URL |
| ④ | Agent (or AgentCore Identity) exchanges the auth code for tokens |
| ⑤ | IdP issues Access Token + Refresh Token |
| ⑥ | Encrypted storage per user in the AgentCore Identity token vault |
| ⑦ | Agent calls external service on behalf of user using Access Token |
| ⑧ | On token expiry, automatically refreshes using Refresh Token (no user re-consent needed) |

```python
# AgentCore Identity SDK - 3LO (Authorization Code Grant) Example
# Source: AgentCore Starter Toolkit Quickstart
# (https://aws.github.io/bedrock-agentcore-starter-toolkit/user-guide/identity/quickstart.html)
from bedrock_agentcore.identity import requires_access_token
from bedrock_agentcore.runtime import BedrockAgentCoreApp
import asyncio

app = BedrockAgentCoreApp()

async def handle_auth_url(url):
    """Deliver auth URL to user (via chat UI, email, etc.)"""
    # User opens this URL in browser to login + consent
    print(f"User authentication required - open in browser: {url}")

@requires_access_token(
    provider_name="google-drive-provider",    # Pre-registered credential provider
    scopes=["https://www.googleapis.com/auth/drive.readonly"],
    auth_flow="USER_FEDERATION",              # 3LO: User consent required
    on_auth_url=handle_auth_url,              # Auth URL callback (deliver to user)
    force_authentication=False                # True forces re-auth every time
)
async def list_user_drive_files(*, access_token: str):
    """List Google Drive files on behalf of user"""
    import httpx
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://www.googleapis.com/drive/v3/files",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        return response.json()

@app.entrypoint
async def agent_invocation(payload, context):
    """Agent entrypoint"""
    result = await list_user_drive_files()
    yield {"files": result}
```

- Requires explicit user consent
- Agent acts on behalf of the user
- Access to third-party services like GitHub, Google, Salesforce

🆕 **3LO GA (April 2026)**: 3-Legged OAuth for MCP targets is generally available in AgentCore Gateway. Enables access to user-specific data in external services using per-user tokens.

---

## 5. Self-Managed Authentication/Authorization Configuration

You can implement agent authentication and authorization directly by combining existing AWS services without using AgentCore Identity. Similar to how we covered self-managed alternatives for Runtime in M02, here we outline the self-managed configuration for the security/credential domain.

### Self-Managed Inbound Authentication Configuration

An approach to directly implementing user authentication for agent endpoints:

```
+----------+    +----------------------------------+    +--------------------------+
|   User   |--->| Amazon Cognito / Okta / Entra ID   |--->| Amazon API Gateway       |
+----------+    | (User auth + JWT issuance)         |    | (Cognito Authorizer or   |
                +----------------------------------+    |  Lambda Authorizer)      |
                                                        | (JWT validation, scope   |
                                                        |  verification)           |
                                                        +------------+-------------+
                                                                     |
                                                                     v
                                                        +--------------------------+
                                                        | Agent — ECS/EKS/Lambda   |
                                                        +--------------------------+
```
*Self-managed inbound authentication configuration: Cognito/IdP + API Gateway combination*

| Component | AWS Service | Role |
|-----------|-------------|------|
| **User Directory + IdP** | Amazon Cognito User Pool | User registration/authentication, JWT token issuance, MFA, social/SAML federation |
| **API Entry Point + Token Validation** | Amazon API Gateway | JWT validation via Cognito Authorizer or Lambda Authorizer, scope-based access control |
| **M2M Authentication** | Cognito Client Credentials Grant | OAuth 2.0 M2M token issuance between services |
| **(Optional) Fine-grained Authorization** | Amazon Verified Permissions | Fine-grained authorization based on Cedar policy language (ABAC/RBAC) |

### Self-Managed Outbound Authentication Configuration

An approach to directly managing credentials for agents to access external services:

```
+--------------------------------------------------------------------------+
| OAuth Token Method                                                       |
|                                                                          |
| +----------+    +--------------------+    +------------------+          |
| |  Agent   |--->| AWS Secrets Manager|    | Lambda Rotation   |          |
| +----+-----+    | (OAuth secrets,    |--->|   Function       |          |
|      |          |  API key storage)  |    +--------+---------+          |
|      |          +--------------------+             |                    |
|      |                                             v                    |
|      |                                    +------------------+          |
|      |                                    | Token Endpoint   |          |
|      |                                    |(OAuth token      |          |
|      |                                    | renewal)         |          |
|      |                                    +------------------+          |
|      |          +--------------+                                        |
|      +--------->|External      | (access token)                         |
|                 |Service       |                                         |
|                 +--------------+                                        |
+--------------------------------------------------------------------------+

+--------------------------------------------------------------------------+
| AWS Service Access Method                                                |
|                                                                          |
| +------------------+    +--------------------------+    +------------+  |
| |  Agent           |--->| IAM Role + STS AssumeRole|    |AWS Service |  |
| | (AWS access)     |    | (Temp credentials issue) |    +------^-----+  |
| +--------+---------+    +--------------------------+           |        |
|          |                                                     |        |
|          +-----------------------------------------------------+        |
|                          (temp credentials)                              |
+--------------------------------------------------------------------------+
```
*Self-managed outbound authentication: OAuth token method and AWS service access method*

| Component | AWS Service | Role |
|-----------|-------------|------|
| **Secret Storage** | AWS Secrets Manager | Encrypted storage of OAuth client secrets, API keys, tokens (KMS) |
| **Token Rotation** | Lambda Rotation Function | Secrets Manager integration, scheduled automatic OAuth token renewal |
| **AWS Resource Access** | IAM Role + STS | Temporary credential issuance via AssumeRole, least privilege policies |
| **3LO Consent Flow** | Custom Implementation (Cognito + DynamoDB) | Direct implementation of Authorization Code flow, per-user token storage in DynamoDB |
| **Token Caching** | Amazon ElastiCache or DynamoDB | TTL-based token caching to minimize token endpoint calls |

### Particularly Challenging Implementation Areas in Self-Managed Approach

| Area | Self-Managed Implementation Difficulty | Specific Challenges |
|------|---------------------------------------|---------------------|
| **Per-user 3LO Token Management** | 🔴 High | Per-user Refresh Token storage, re-consent flow on expiry, token isolation in multi-agent environments |
| **Automatic Token Renewal** | 🟡 Medium | Lambda implementation for Access Token renewal via Refresh Token, retry/notification logic on failure |
| **Multi-service Integration** | 🔴 High | Different OAuth specs per service (PKCE, scope formats, token response structures), separate rotation logic needed for each |
| **Agent Identity Management** | 🟡 Medium | Designing unique identifier systems per agent, IAM Role mapping, identifying "which agent did it" in audit trails |
| **Consent Fatigue Resolution** | 🔴 High | Without OBO pattern, user consent required for each service, degraded UX |

---

## 6. Introduction to AgentCore Identity

### What is AgentCore Identity?

A **unified credential management service** for AI agents that handles both inbound and outbound authentication.

> **Note**: AgentCore Identity is also available as a **standalone service**. This means agents running on ECS, EKS, Lambda, or on-premises can leverage AgentCore Identity's token vault and credential providers even without using AgentCore Runtime. ([Source: Secure AI agents with Amazon Bedrock AgentCore Identity on Amazon ECS - AWS ML Blog](https://aws.amazon.com/blogs/machine-learning/secure-ai-agents-with-amazon-bedrock-agentcore-identity-on-amazon-ecs/))

### 3 Core Values

| Value | Description |
|-------|-------------|
| **Secure Delegated Access** | Safe access to AWS resources and third-party tools (GitHub, Google, Salesforce, Slack). Least privilege, credential-aware authentication |
| **Simplified User Experience** | Minimize consent fatigue with a secure token vault. Streamlined authentication flows |
| **Development Acceleration** | Preserve existing credential systems (Okta, Microsoft Entra ID, Amazon Cognito). No user migration required |

### Full Authentication Flow Architecture

```
+----------+    +-----+    +---------------------------------+    +------------------+
|   User   |--->| App |--->| Inbound Auth                    |--->| AgentCore Runtime|
+----------+    +-----+    | (IAM or other credential        |    | or Self-hosted   |
                           |  provider)                       |    +--------+---------+
                           +---------------------------------+             |
                                                                           v
                                                             +-------------------------+
                                                             |   AgentCore Identity    |
                                                             |                         |
                                                             |  • Workload Credentials |
                                                             |  • Token Vault          |
                                                             |  • Token Caching        |
                                                             |  • Credential Providers |
                                                             +---+------+------+-------+
                                                                 |      |      |
                                                                 v      v      v
                                                        +--------+ +--------+ +----------+
                                                        |  AWS   | |Gateway | |External  |
                                                        |Resource| |        | |Resources |
                                                        |(IAM)   | |        | |(OAuth/   |
                                                        |        | |        | | API Key) |
                                                        +--------+ +--------+ +----------+
```
*AgentCore Identity full authentication flow architecture*

### AgentCore Identity vs Self-Managed Comparison Summary

| Comparison Item | AgentCore Identity | Self-Managed (AWS Service Combination) |
|-----------------|-------------------|----------------------------------------|
| **Inbound Authentication** | Completed with just `customJWTAuthorizer` configuration during Runtime deployment | Separate API Gateway + Cognito Authorizer configuration required |
| **Outbound Token Management** | Automatically managed in Token Vault, KMS encryption, auto-renewal | Must implement Secrets Manager + Lambda rotation function directly |
| **Workload Credentials** | Unique agent identity automatically created (during Runtime deployment) | Direct mapping via IAM Role or service account |
| **OAuth 2LO** | Register credential provider → single `GetWorkloadAccessToken` API call | Store secret in Secrets Manager + implement token request logic |
| **OAuth 3LO** | Built-in consent flow, automatic per-user token storage in token vault | Implement entire Authorization Code flow directly (callback URL, token exchange, per-user storage) |
| **OBO Token Exchange** | Built-in support (single user auth for multi-service delegation) | Cannot implement directly or requires very complex custom implementation |
| **Pre-configured IdPs** | Built-in vendor-specific configurations for GitHub, Google, Salesforce, Slack, Microsoft, etc. | Must research and implement each IdP's OAuth endpoints, scopes, token formats individually |
| **Private IdP Connection** | Direct connection to private IdPs via VPC Egress | Direct network configuration via NAT Gateway + VPC Endpoints |
| **Audit Trail** | Automatic CloudWatch metrics/logs generation (Identity Observability) | CloudTrail + custom logging implementation |
| **IAM Access Control** | Limit access scope per credential provider based on workload credential ARN | Restrict access per Secrets Manager resource via IAM policies |
| **Development Burden** | Low (configuration completed with a few API lines) | High (full implementation of infrastructure + logic + rotation + monitoring) |
| **Operational Burden** | Minimal (fully managed) | Medium to High (monitoring token expiry, rotation failures, secret synchronization) |
| **Cost** | Based on AgentCore Identity API calls | Secrets Manager ($0.40/secret/month) + Lambda + ElastiCache + API Gateway |
| **Best Suited For** | Rapidly building agent-specific security infrastructure, integrating numerous external services | When existing security infrastructure is already built, when integration with non-agent workloads is needed |

> **Tip**: AgentCore Identity can be summarized as "Cognito + Secrets Manager + automatic token renewal for agents, bundled into one service." The key differentiators are **per-user token management in the Token Vault** and **OBO Token Exchange**, which are the most difficult parts to replicate in a self-managed approach.

---

## 7. Workload Credentials

### What are Workload Credentials?

Credentials that represent an agent's **unique identity**.

### Creation Methods

| Method | Description |
|--------|-------------|
| **Automatic Creation** | Workload credentials are automatically created when deploying an agent to AgentCore Runtime |
| **Manual Creation** | Manually created for self-hosted or hybrid deployments |

### Workload Credential Management

```bash
# List workload credentials via AWS CLI
aws bedrock-agentcore-control list-workload-identities
```

```json
{
  "workloadIdentities": [
    {
      "workloadIdentityArn": "arn:aws:bedrock-agentcore:us-east-1:123456789012:workload-identity-directory/default/workload-identity/my-runtime-agent",
      "workloadIdentityName": "my-runtime-agent",
      "createdAt": "2024-01-15T10:30:00Z",
      "createdBy": "AgentCore Runtime"
    },
    {
      "workloadIdentityArn": "arn:aws:bedrock-agentcore:us-east-1:123456789012:workload-identity-directory/default/workload-identity/my-custom-agent",
      "workloadIdentityName": "my-custom-agent",
      "createdAt": "2024-01-16T14:20:00Z",
      "createdBy": "Manual"
    }
  ]
}
```

**Key Points**:
- Workload credential ARNs are used for IAM policies and access control
- ARN is returned in the deployment response
- Credentials are managed by the service and include settings needed for the deployment environment

---

## 8. Credential Provider Configuration

### Supported Authentication Patterns

| Pattern | Description |
|---------|-------------|
| **OAuth 2.0 Client Credentials Grant (2LO)** | Machine-to-machine authentication |
| **OAuth 2.0 Authorization Code Grant (3LO)** | User-delegated access |
| **API Key** | Simple key-based authentication |

### Creating an OAuth2 Credential Provider (Example: GitHub)

```python
from bedrock_agentcore.services.identity import IdentityClient

identity_client = IdentityClient("us-east-1")

github_provider = identity_client.create_oauth2_credential_provider({
    "name": "github-provider",
    "credentialProviderVendor": "GithubOauth2",
    "oauth2ProviderConfigInput": {
        "githubOauth2ProviderConfig": {
            "clientId": "your-github-client-id",
            "clientSecret": "your-github-client-secret"
        }
    }
})
```

### Creating an API Key Credential Provider

```python
from bedrock_agentcore.services.identity import IdentityClient

identity_client = IdentityClient("us-east-1")

apikey_provider = identity_client.create_api_key_credential_provider({
    "name": "your-service-name",
    "apiKey": "your-api-key"
})
```


---

## 9. Runtime and Identity Integration

### Secure Deployment with Cognito Authentication

```python
from bedrock_agentcore.runtime import Runtime

agentcore_runtime = Runtime()

response = agentcore_runtime.configure(
    entrypoint="agent.py",
    execution_role=execution_role_arn,
    auto_create_ecr=True,
    requirements_file="requirements.txt",
    region=region,
    agent_name="customer_support_agent",
    authorizer_configuration={
        "customJWTAuthorizer": {
            "allowedClients": [cognito_client_id],
            "discoveryUrl": cognito_discovery_url,
        }
    }
)

# Deploy to production
launch_result = agentcore_runtime.launch()
```

#### Deployment and Authentication Configuration Diagram

```
+--------------------------------------------------------------------------+
| Developer Local Environment                                              |
|                                                                          |
|  Runtime().configure(                                                    |
|    entrypoint="agent.py"                                                 |
|    execution_role=<IAM Role ARN>                                         |
|    auto_create_ecr=True                                                  |
|    requirements_file="requirements.txt"                                  |
|    agent_name="customer_support_agent"                                   |
|    authorizer_configuration={...}                                        |
|  )                                                                       |
+------------------------------+-------------------------------------------+
                               | .launch()
                               v
+--------------------------------------------------------------------------+
| AWS Cloud                                                                |
|                                                                          |
|  ① Amazon ECR                 ② AgentCore Runtime                       |
|  +----------------------+    +--------------------------------------+   |
|  | Container image      |--->| Agent: customer_support_agent         |   |
|  | creation             |    | Execution role: execution_role_arn    |   |
|  | (auto_create_ecr)    |    |                                       |   |
|  | <- agent.py +         |    | JWT Authorizer config:                |   |
|  |   requirements.txt   |    |   allowedClients: [cognito_client_id]|   |
|  +----------------------+    |   discoveryUrl: cognito_discovery_url |   |
|                              +----------------+---------------------+   |
|                                               | On token validation     |
|                                               v                         |
|  ③ Amazon Cognito (or external IdP)                                      |
|  +--------------------------------------------------+                   |
|  | JWKS Endpoint (provides public keys for          |                   |
|  | signature verification)                           |                   |
|  | <- Auto-discovered via discoveryUrl               |                   |
|  +--------------------------------------------------+                   |
+--------------------------------------------------------------------------+
```
*Runtime and Identity integration: Deployment and authentication configuration flow*

### Runtime Execution Role

Permissions included in the AgentCore Runtime execution role:

```
+--------------------------------------------------------------------------+
| AgentCore Runtime Execution Role (IAM Role)                              |
|                                                                          |
|  Default permissions:                                                    |
|  +--------------------------------------------------------------------+  |
|  | • AgentCore Identity: Get workload access token                   |  |
|  | • AWS X-Ray: Sampling rules, put traces                           |  |
|  | • CloudWatch: Create log group/stream/events                      |  |
|  | • Amazon ECR: Get image/layer, auth token                         |  |
|  | • All models: Invoke model with/without streaming                 |  |
|  +--------------------------------------------------------------------+  |
|                                                                          |
|  Additionally configurable:                                              |
|  +--------------------------------------------------------------------+  |
|  | • Other AWS service actions (S3, DynamoDB, etc.)                   |  |
|  | • Other AgentCore services (Memory, Gateway, etc.)                 |  |
|  +--------------------------------------------------------------------+  |
+--------------------------------------------------------------------------+
```
*AgentCore Runtime execution role: Default and additional permission configuration*

**Core Principle**: Apply the principle of least privilege - grant only the permissions the agent needs

---

## 10. Knowledge Check and Key Takeaways

### Knowledge Check Questions

**Question 1**: AI agent for a financial services company - maintaining proper authentication context + requiring detailed audit trails
- ✅ **Correct Answer: D** - Deploy with Amazon Cognito authentication + configure AgentCore Runtime service-linked role
- Key Point: Cognito = user authentication + service-linked role = automated audit trail

**Question 2**: Multiple third-party services (Salesforce, ServiceNow) + maintaining security boundaries + supporting both 2LO/3LO
- ✅ **Correct Answer: A** - Workload credentials with multiple credential providers
- Key Point: Connect multiple credential providers to a single workload credential to support various authentication patterns

### Module Learning Objectives Achievement Confirmation

Upon completing this module, you will be able to:
- ✅ Configure AgentCore Identity to meet enterprise security requirements
- ✅ Implement secure token management and permission delegation
- ✅ Comply with data governance and audit requirements

---

## 11. Additional Key Points - Instructor Supplementary Material

### 11.1 🆕 OBO (On-Behalf-Of) Token Exchange

A core feature added in April 2026 that allows agents to access protected resources on behalf of an authenticated user.

**Problem with Previous Approach**:
- Users had to go through separate consent flows for each service
- Consent fatigue occurs

**OBO Approach Resolution**:
```
User --[Initial Auth]---> Agent
Agent --[OBO Token Exchange]---> Service A (on behalf of user)
Agent --[OBO Token Exchange]---> Service B (on behalf of user)
Agent --[OBO Token Exchange]---> Service C (on behalf of user)
```
*OBO Token Exchange: Agent accesses multiple services with delegated authority from a single user authentication*
- No need for multiple consent flows
- User authenticates once and the agent accesses multiple services with delegated permissions

### 11.2 🆕 VPC Egress Support

Identity, Gateway, and Runtime can all access resources within customer VPCs:

| Service | VPC Egress Use Cases |
|---------|---------------------|
| **Identity** | Connect to Identity Providers within VPC (private Okta/Entra instances) |
| **Gateway** | Access MCP servers within VPC (EKS-hosted) |
| **Runtime** | Access databases and internal APIs within VPC |

Supports private DNS resolution for using internal domain names.

### 11.3 🆕 Additional IAM Condition Keys

New condition keys for more granular security policy control:

| Condition Key | Purpose |
|---------------|---------|
| `bedrock-agentcore:RuntimeAuthorizerType` | Enforce specific authentication mechanisms (required in OAuth Runtime) |
| `aws:VpceOrgID` | Restrict calls to organization-owned VPC endpoints only |
| `bedrock-agentcore:Subnets` | Restrict deployments to approved subnets only |
| `bedrock-agentcore:SecurityGroups` | Restrict deployments to approved security groups only |

### 11.4 Inbound vs Outbound Authentication Summary Table

| Category | Inbound | Outbound |
|----------|---------|----------|
| **Direction** | User/App → Agent | Agent → External Resources |
| **Question** | "Who is this user?" | "Who is this agent?" |
| **Methods** | IAM SigV4, JWT Bearer | IAM Role, OAuth 2LO/3LO, API Key |
| **Management** | Runtime authentication configuration | Identity credential providers |
| **Example** | Calling agent with Cognito token | Agent accessing GitHub API |

### 11.5 Security Architecture Best Practices

#### Applying the Principle of Least Privilege

```
❌ Bad Example: Full access to all S3 buckets
{
  "Effect": "Allow",
  "Action": "s3:*",
  "Resource": "*"
}

✅ Good Example: Read-only access to a specific path in a specific bucket
{
  "Effect": "Allow",
  "Action": ["s3:GetObject"],
  "Resource": "arn:aws:s3:::my-agent-data/reports/*"
}
```

#### Credential Rotation Strategy

| Credential Type | Rotation Method |
|----------------|-----------------|
| IAM Role | Automatic temporary credential rotation (STS) |
| OAuth Token | AgentCore Identity manages token caching and renewal |
| API Key | Regular manual rotation or Secrets Manager integration |

### 11.6 🆕 ISO/CSA STAR Certification and GovCloud

- **ISO Certification**: AgentCore achieved ISO and CSA STAR compliance (February 2026)
- **GovCloud (US-West)**: AgentCore support for government and regulated workloads (May 2026)
- Officially listed on the AWS Compliance Services page

### 11.7 🆕 Full PrivateLink Support

PrivateLink support for all AgentCore service control/data planes:

| Service | Endpoint |
|---------|----------|
| Control Plane | `com.amazonaws.region.bedrock-agentcore-control` |
| Runtime Data Plane | `com.amazonaws.region.bedrock-agentcore-runtime` |
| Gateway Data Plane | `com.amazonaws.region.bedrock-agentcore-gateway` |

→ Create/manage/invoke AgentCore resources from within VPC without traversing the internet

### 🆕 11.8 Bedrock Guardrails Integration (NY Summit 2026)

Agents present security challenges unprecedented in traditional software because they are **probabilistic**.
The new exposure point is not the network but the **agent's context**. Prompt injection and memory
poisoning "persuade" an agent to make incorrect decisions without actually infiltrating the system.

The principle that addresses this: **Protect the probabilistic with the deterministic** - as guardrails
surrounding the brain, not as the brain itself.

| Item | Content |
|------|---------|
| **Bedrock Guardrails Integration** | Integrated into AgentCore Policy (GA). Evaluates all agent actions for prompt injection attempts, harmful content, and sensitive data exposure |
| **Gateway Layer Execution** | Inspection runs outside agent code, at the **Gateway layer** → the agent cannot see it in context, cannot reason around bypassing it or "convince itself" it doesn't apply |
| **Deterministic Enforcement** | Detection may be probabilistic, but policy enforcement is always deterministic - final allow/deny decisions based on configured thresholds |

**🔜 Third-party Detection Signals (Coming Soon)**: Guardrails is the first of multiple detection signals
that the policy engine can leverage. In the future, detection signals from major security providers
including Check Point, Zscaler, Rubrik, Netskope, and SentinelOne can be fed into the same policy.

> **Connection to M04 Policy**: Policy deterministically controls "what the agent can do with tools/data"
> at the Gateway. Guardrails integration adds "safety inspection of all actions" to this policy engine.
> Since all tools and context sources transit through the Gateway, new capabilities also automatically
> receive governance from the same security layer.

### 11.9 Discussion Points for Class

1. **"How does agent security differ from traditional application security?"**
   - Non-deterministic behavior → static rules alone are insufficient
   - Dynamic authorization needed (context-aware)
   - Agent itself needs an identity as an "actor"

2. **"What are the risks when delegating user permissions to an agent?"**
   - Excessive permission delegation → restrict with least privilege + Policy
   - Token leakage → secure token vault + short TTL
   - Lack of auditing → mandatory Observability enablement

3. **"2LO vs 3LO - When should each be used?"**
   - 2LO: When the agent's own permissions are sufficient (system tasks)
   - 3LO: When access to user-specific data is needed (personal email, calendar)

4. **"AgentCore Identity vs Self-Managed - In what cases would you choose self-managed?"**
   - When existing Cognito + API Gateway + Secrets Manager infrastructure is already operational
   - When sharing the same authentication infrastructure with non-agent workloads (web apps, microservices)
   - Choose AgentCore Identity: when integrating numerous external services, managing per-user 3LO tokens, or needing OBO patterns

---

## Changes Summary Compared to Textbook

| Textbook Content (v1.0.4) | Current Status (May 2026) |
|---------------------------|--------------------------|
| Basic OAuth 2LO/3LO | **3LO GA** (Gateway MCP targets) |
| No OBO | **🆕 OBO Token Exchange** (eliminates multiple consent flows) |
| Basic VPC support | **🆕 VPC Egress** (Identity/Gateway/Runtime all supported) |
| Basic IAM condition keys | **🆕 Additional condition keys** (RuntimeAuthorizerType, VpceOrgID, Subnets, SecurityGroups) |
| Compliance not mentioned | **🆕 ISO/CSA STAR certification + GovCloud** |
| Basic PrivateLink | **🆕 Full control/data plane PrivateLink** |
| No OAuth WebSocket | **🆕 OAuth WebSocket authentication** (direct browser JS connection) |
| No Guardrails integration | 🆕 **NY Summit 2026**: Bedrock Guardrails + Policy integration (GA), third-party detection signal integration planned |

---

## References

- [AgentCore Identity Official Documentation](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/identity.html)
- [Features of AgentCore Identity](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/key-features-and-benefits.html)
- [Understanding Workload Identities](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/understanding-agent-identities.html)
- [Manage credential providers with AgentCore Identity](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/identity-outbound-credential-provider.html)
- [Secure AI agents with Amazon Bedrock AgentCore Identity on Amazon ECS (AWS ML Blog)](https://aws.amazon.com/blogs/machine-learning/secure-ai-agents-with-amazon-bedrock-agentcore-identity-on-amazon-ecs/)
- [Securing AI agents with Amazon Bedrock AgentCore Identity (AWS Security Blog)](https://aws.amazon.com/blogs/security/securing-ai-agents-with-amazon-bedrock-agentcore-identity/)
- [Introducing Amazon Bedrock AgentCore Identity (AWS ML Blog)](https://aws.amazon.com/blogs/machine-learning/introducing-amazon-bedrock-agentcore-identity-securing-agentic-ai-at-scale/)
- [Empower AI agents with user context using Amazon Cognito (AWS Security Blog)](https://aws.amazon.com/blogs/security/empower-ai-agents-with-user-context-using-amazon-cognito/)
- [OBO Token Exchange Documentation](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/on-behalf-of-token-exchange.html)
- [VPC Egress - Identity](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/identity-private-idp.html)
- [IAM Condition Keys Documentation](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/security_iam_service-with-iam.html)
- [VPC Interface Endpoints](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/vpc-interface-endpoints.html)
- [New in Amazon Bedrock AgentCore - Guardrails Integration (NY Summit 2026)](https://aws.amazon.com/blogs/machine-learning/new-in-amazon-bedrock-agentcore-build-agents-with-broader-knowledge-and-continuous-learning/)

---

*This document is based on the content of MLAGAC-10-KO-KR-M03-SecurityAndIdentity_InstructorDeck.pdf,
and content marked with 🆕 reflects the latest service updates as of May 2026 as instructor supplementary material.*

*Document Version: 2.1 | Created: 2026-05-28 | Last Modified: 2026-06-23 | Update Basis: Reflects AWS Summit New York June 2026*
