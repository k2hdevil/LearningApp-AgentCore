# 모듈 3: 보안 및 자격 증명 관리

## Building Agentic AI with Amazon Bedrock AgentCore

---

## 목차

1. [에이전틱 시스템의 보안 과제](#1-에이전틱-시스템의-보안-과제)
2. [인바운드 인증 패턴](#2-인바운드-인증-패턴)
3. [아웃바운드 인증 패턴](#3-아웃바운드-인증-패턴)
4. [권한 부여 패턴 (SigV4, 2LO, 3LO)](#4-권한-부여-패턴)
5. [비관리형(Self-Managed) 인증/권한 구성](#5-비관리형self-managed-인증권한-구성)
6. [AgentCore Identity 소개](#6-agentcore-identity-소개)
7. [워크로드 자격 증명](#7-워크로드-자격-증명)
8. [자격 증명 공급자 구성](#8-자격-증명-공급자-구성)
9. [Runtime과 Identity 통합](#9-runtime과-identity-통합)
10. [지식 확인 및 핵심 정리](#10-지식-확인-및-핵심-정리)
11. [추가 Key Points - 강사 보충 자료](#11-추가-key-points---강사-보충-자료)

> 🆕 표시: 교재(v1.0.4, 2026년 4월 빌드) 이후 추가/변경된 내용

---

## 1. 에이전틱 시스템의 보안 과제

### 패러다임 전환

에이전틱 AI는 보안 관점에서 근본적인 패러다임 전환을 요구합니다:

> **정적 사용자 권한** → **동적인 컨텍스트 인식 권한 부여**

### 에이전트가 제시하는 5가지 자격 증명 문제

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
*에이전트가 직면하는 5가지 보안 과제와 호출자-에이전트-대상 서비스 관계*


### 기업 보안 아키텍처 고려 사항

| 영역 | 요구 사항 |
|------|-----------|
| **감사 추적** | 에이전트에 대한 상세한 감사 추적, 사용자 컨텍스트와 함께 모든 작업 기록 |
| **네트워크 제어** | 에이전트 네트워크 액세스 및 엔드포인트 제어 |
| **데이터 거버넌스** | 테넌트 경계 유지, 데이터 분류 준수 |
| **인시던트 대응** | 에이전트별 인시던트 대응 절차 구현 |
| **권한 철회** | 신속한 에이전트 권한 철회 기능 지원 |

---

## 2. 인바운드 인증 패턴

### 인바운드 인증이란?

사용자/애플리케이션이 에이전트에 접근할 때의 인증:

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
*인바운드 인증: 사용자가 에이전트에 접근할 때의 인증 흐름*

### 인바운드 인증 방식

| 방식 | 설명 | 사용 사례 |
|------|------|-----------|
| **Amazon Cognito** | 사용자 인증 자격 증명 공급자 | 웹/모바일 앱 사용자 인증 |
| **API 키** | 시스템-시스템 통신 | 서비스 간 호출, 배치 작업 |
| **페더레이션 인증** | 엔터프라이즈 SSO | 기업 내부 사용자 |
| **IAM SigV4** | AWS 서명 기반 인증 | AWS 서비스 간 통신 |
| **JWT Bearer 토큰** | OAuth 2.0 토큰 기반 | 범용 인증 |

### Runtime 인바운드 인증 구성

AgentCore Runtime은 두 가지 인바운드 인증을 지원합니다:

1. **IAM SigV4 인증**: AWS 자격 증명 기반, 서비스 간 통신에 적합
2. **JWT Bearer 토큰 인증**: OAuth 2.0 기반, 사용자 대면 애플리케이션에 적합

#### IAM SigV4 동작 방식

AWS Signature Version 4(SigV4)는 모든 AWS API 호출에 사용되는 표준 인증 프로토콜입니다. 요청에 암호화 서명을 포함하여 호출자의 신원과 요청의 무결성을 동시에 검증합니다.

**SigV4 인증 흐름 (일반 AWS 서비스)**:

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
*AWS SigV4 인증 프로토콜의 동작 흐름: 서명 생성 → 전송 → 서명 검증 → 정책 평가*

> **💡 Access Key ID vs Secret Access Key의 역할**
>
> | 요소 | 네트워크 전송 | 역할 |
> |------|:------------:|------|
> | **Access Key ID** | ✅ 전송됨 | 공개 식별자. "나는 누구다"를 AWS에 알려줌 |
> | **Secret Access Key** | ❌ 절대 전송 안 됨 | 서명 생성에만 사용. AWS가 동일한 키로 서명을 재계산하여 검증 |
>
> 비유: Access Key ID = 은행 계좌번호 (공개 가능), Secret Access Key = 인감 도장 (본인만 보유)

**SigV4의 보안 특성**:

| 특성 | 설명 |
|------|------|
| **신원 검증** | Access Key ID로 호출자를 식별하고, 서명 일치로 신원 증명 |
| **무결성 보장** | 요청 본문(페이로드)의 SHA-256 해시가 서명에 포함 → 전송 중 변조 감지 |
| **재전송 방지** | 타임스탬프 포함, 서명 유효 기간 5분 이내 → 탈취한 요청 재사용 불가 |
| **비밀 키 비노출** | Secret Access Key 자체는 네트워크에 전송되지 않음 (서명 파생에만 사용) |
| **범위 제한** | 서명이 특정 날짜/리전/서비스에 바인딩 → 다른 서비스로 재사용 불가 |


> **핵심 원리**: SigV4는 "공유 비밀(Secret Key)로 메시지에 서명하고, 수신자가 같은 비밀로 서명을 재계산하여 검증"하는 HMAC 기반 챌린지-응답 패턴입니다. 비밀 키가 네트워크를 타지 않으므로, HTTPS와 결합하면 강력한 인증과 무결성을 동시에 제공합니다.

### 💡 5가지 인증 방식과 Runtime 2가지 구성의 관계

위의 5가지 인증 방식은 **에이전틱 시스템 아키텍처 설계 시 고려할 수 있는 전체 인증 패턴**이며, Runtime의 2가지 구성은 **AgentCore Runtime 엔드포인트가 실제로 검증하는 프로토콜**입니다. 여러 인증 방식이 결국 Runtime 레벨에서는 두 가지로 수렴됩니다:

```
[Concept Level - 5 Auth Methods]            [Runtime Implementation - 2 Configs]
----------------------------------          ----------------------------------
Amazon Cognito      -----+
Federation(SSO)     -----+--->    JWT Bearer Token Auth
JWT Bearer Token    -----+        (Custom JWT Authorizer)
IAM SigV4           ----------->   IAM SigV4 Auth
API Key             ----------->   (Handled outside Runtime - API Gateway, etc.)
```
*5가지 인증 방식이 Runtime 레벨에서 2가지로 수렴되는 관계*

**수렴 원리**:
- **Cognito, 페더레이션(Okta/Entra ID)**: 최종적으로 JWT/OIDC 토큰을 발급하므로 Runtime에서는 `customJWTAuthorizer`로 검증
- **IAM SigV4**: AWS 네이티브 서명 방식으로 Runtime이 직접 검증
- **API 키**: AgentCore Runtime의 네이티브 인증 메커니즘이 아니며, 앞단의 API Gateway나 애플리케이션 레이어에서 처리

---

## 3. 아웃바운드 인증 패턴

### 아웃바운드 인증이란?

에이전트가 외부 리소스(도구, API, 서비스)에 접근할 때의 인증:

```
Agent ---> [Outbound Auth] ---> Tools, Resources, Gateway
           "Who is this agent?"
           "Can it access on behalf of user?"
           "Is it who it claims to be?"
```
*에이전트가 외부 리소스에 접근할 때의 아웃바운드 인증 질문*

### 아웃바운드 인증의 3가지 기본 패턴

| 패턴 | 방식 | 사용 사례 |
|------|------|-----------|
| **AWS 자격 증명** | IAM 역할 | AWS 서비스 접근 (S3, DynamoDB 등) |
| **OAuth 클라이언트 자격 증명 (2LO)** | 머신 간 인증 | 시스템 운영, 백엔드 서비스 |
| **OAuth 인증 코드 흐름 (3LO)** | 사용자 위임 액세스 | 사용자 동의 필요 시 (GitHub, Google 등) |

---

## 4. 권한 부여 패턴

### SigV4 (AWS Signature Version 4)

```
에이전트 --[IAM 역할]---> AWS 서비스 (S3, DynamoDB, Bedrock 등)
```
- AWS 서비스 접근을 위한 표준 인증
- IAM 정책으로 세분화된 권한 제어
- 임시 자격 증명 자동 순환

### OAuth 2-Legged (2LO) - 클라이언트 자격 증명

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
*OAuth 2LO(클라이언트 자격 증명) 흐름: 에이전트가 자체 권한으로 외부 서비스에 접근*

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

- 사용자 개입 없는 머신 간 인증
- 에이전트 자체의 권한으로 동작
- 백그라운드 작업, 시스템 통합에 적합

### OAuth 3-Legged (3LO) - 인증 코드 흐름

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
*OAuth 3LO(인증 코드) 흐름: 사용자 동의 기반 위임 액세스*

| 단계 | 설명 |
|------|------|
| ① | 에이전트가 인증 URL을 생성하여 사용자에게 전달 |
| ② | 사용자가 브라우저에서 IdP에 로그인하고 접근 권한에 동의 |
| ③ | IdP가 인증 코드(Authorization Code)를 콜백 URL로 반환 |
| ④ | 에이전트(또는 AgentCore Identity)가 인증 코드를 토큰으로 교환 |
| ⑤ | IdP가 Access Token + Refresh Token 발급 |
| ⑥ | AgentCore Identity 토큰 볼트에 사용자별로 암호화 저장 |
| ⑦ | 에이전트가 Access Token으로 사용자 대신 외부 서비스 호출 |
| ⑧ | 토큰 만료 시 Refresh Token으로 자동 갱신 (사용자 재동의 불필요) |

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

- 사용자의 명시적 동의 필요
- 에이전트가 사용자를 대신하여 행동
- GitHub, Google, Salesforce 등 서드파티 접근

🆕 **3LO GA (2026년 4월)**: AgentCore Gateway에서 MCP 대상에 대한 3-Legged OAuth가 정식 출시. 사용자별 토큰으로 외부 서비스의 사용자 고유 데이터에 접근 가능.

---

## 5. 비관리형(Self-Managed) 인증/권한 구성

AgentCore Identity를 사용하지 않고 기존 AWS 서비스를 조합하여 에이전트의 인증과 권한 부여를 직접 구현할 수 있습니다. M02에서 Runtime의 비관리형 대안을 다룬 것과 같은 관점으로, 보안/자격 증명 영역의 비관리형 구성을 정리합니다.

### 비관리형 인바운드 인증 구성

에이전트 엔드포인트에 대한 사용자 인증을 직접 구현하는 방식:

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
*비관리형 인바운드 인증 구성: Cognito/IdP + API Gateway 조합*

| 구성 요소 | AWS 서비스 | 역할 |
|-----------|-----------|------|
| **사용자 디렉터리 + IdP** | Amazon Cognito User Pool | 사용자 등록/인증, JWT 토큰 발급, MFA, 소셜/SAML 페더레이션 |
| **API 진입점 + 토큰 검증** | Amazon API Gateway | Cognito Authorizer 또는 Lambda Authorizer로 JWT 검증, 스코프 기반 접근 제어 |
| **M2M 인증** | Cognito Client Credentials Grant | 서비스 간 OAuth 2.0 M2M 토큰 발급 |
| **(선택) 세분화된 인가** | Amazon Verified Permissions | Cedar 정책 언어 기반 세밀한 권한 부여 (ABAC/RBAC) |

### 비관리형 아웃바운드 인증 구성

에이전트가 외부 서비스에 접근하기 위한 자격 증명을 직접 관리하는 방식:

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
*비관리형 아웃바운드 인증: OAuth 토큰 방식과 AWS 서비스 접근 방식*

| 구성 요소 | AWS 서비스 | 역할 |
|-----------|-----------|------|
| **시크릿 저장** | AWS Secrets Manager | OAuth 클라이언트 시크릿, API 키, 토큰 암호화 저장 (KMS) |
| **토큰 순환** | Lambda 순환 함수 | Secrets Manager 연동, OAuth 토큰 자동 갱신 스케줄 |
| **AWS 리소스 접근** | IAM Role + STS | AssumeRole로 임시 자격 증명 발급, 최소 권한 정책 |
| **3LO 동의 흐름** | 커스텀 구현 (Cognito + DynamoDB) | Authorization Code 흐름 직접 구현, 사용자별 토큰 DynamoDB 저장 |
| **토큰 캐싱** | Amazon ElastiCache 또는 DynamoDB | 토큰 TTL 기반 캐싱으로 토큰 엔드포인트 호출 최소화 |

### 비관리형에서 특히 어려운 구현 영역

| 영역 | 비관리형 구현 시 난이도 | 구체적 과제 |
|------|----------------------|-----------|
| **3LO 사용자별 토큰 관리** | 🔴 높음 | 사용자별 Refresh Token 저장, 만료 시 재동의 흐름, 멀티 에이전트 환경에서의 토큰 격리 |
| **토큰 자동 갱신** | 🟡 중간 | Refresh Token으로 Access Token 갱신 Lambda 구현, 실패 시 재시도/알림 로직 |
| **다중 서비스 통합** | 🔴 높음 | 서비스마다 다른 OAuth 스펙 (PKCE, 스코프 형식, 토큰 응답 구조), 각각 별도 순환 로직 필요 |
| **에이전트 신원(Identity) 관리** | 🟡 중간 | 에이전트별 고유 식별자 체계 설계, IAM Role 매핑, 감사 추적에서 "어떤 에이전트가 했는가" 식별 |
| **동의 피로 해소** | 🔴 높음 | OBO 패턴 없이 서비스마다 사용자 동의 필요, UX 저하 |

---

## 6. AgentCore Identity 소개

### AgentCore Identity란?

AI 에이전트를 위한 **통합 자격 증명 관리 서비스**로, 인바운드/아웃바운드 인증을 모두 처리합니다.

> **참고**: AgentCore Identity는 **standalone 서비스**로도 사용 가능합니다. 즉, AgentCore Runtime을 사용하지 않더라도 ECS, EKS, Lambda, 온프레미스에서 실행되는 에이전트가 AgentCore Identity의 토큰 볼트와 자격 증명 공급자를 활용할 수 있습니다. ([출처: Secure AI agents with Amazon Bedrock AgentCore Identity on Amazon ECS - AWS ML Blog](https://aws.amazon.com/blogs/machine-learning/secure-ai-agents-with-amazon-bedrock-agentcore-identity-on-amazon-ecs/))

### 3가지 핵심 가치

| 가치 | 설명 |
|------|------|
| **안전한 위임 액세스** | AWS 리소스와 서드파티 도구(GitHub, Google, Salesforce, Slack)에 안전하게 접근. 최소 권한, 자격 증명 인식 인증 |
| **간소화된 사용자 경험** | 안전한 토큰 저장소로 동의 피로(Consent fatigue) 최소화. 인증 흐름 간소화 |
| **개발 가속화** | 기존 자격 증명 시스템(Okta, Microsoft Entra ID, Amazon Cognito) 보존. 사용자 마이그레이션 불필요 |

### 인증 흐름 전체 아키텍처

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
*AgentCore Identity 전체 인증 흐름 아키텍처*

### AgentCore Identity vs 비관리형 비교 요약

| 비교 항목 | AgentCore Identity | 비관리형 (AWS 서비스 조합) |
|-----------|-------------------|--------------------------|
| **인바운드 인증** | Runtime 배포 시 `customJWTAuthorizer` 설정만으로 완료 | API Gateway + Cognito Authorizer 별도 구성 |
| **아웃바운드 토큰 관리** | 토큰 볼트(Token Vault)에서 자동 관리, KMS 암호화, 자동 갱신 | Secrets Manager + Lambda 순환 함수 직접 구현 |
| **워크로드 자격 증명** | 에이전트별 고유 신원 자동 생성 (Runtime 배포 시) | IAM Role 또는 서비스 계정으로 직접 매핑 |
| **OAuth 2LO** | 자격 증명 공급자 등록 → `GetWorkloadAccessToken` API 1회 호출 | Secrets Manager에 시크릿 저장 + 토큰 요청 로직 구현 |
| **OAuth 3LO** | 동의 흐름 내장, 토큰 볼트에 사용자별 토큰 자동 저장 | Authorization Code 흐름 전체 직접 구현 (콜백 URL, 토큰 교환, 사용자별 저장) |
| **OBO Token Exchange** | 내장 지원 (다중 서비스 위임 시 단일 사용자 인증) | 직접 구현 불가 또는 매우 복잡한 커스텀 구현 필요 |
| **사전 구성된 IdP** | GitHub, Google, Salesforce, Slack, Microsoft 등 벤더별 구성 내장 | 각 IdP별 OAuth 엔드포인트, 스코프, 토큰 형식을 직접 조사하여 구현 |
| **프라이빗 IdP 연결** | VPC Egress로 프라이빗 IdP 직접 연결 | NAT Gateway + VPC 엔드포인트로 직접 네트워크 구성 |
| **감사 추적** | CloudWatch 메트릭/로그 자동 생성 (Identity Observability) | CloudTrail + 커스텀 로깅 구현 |
| **IAM 접근 제어** | 워크로드 자격 증명 ARN 기반으로 자격 증명 공급자별 접근 범위 제한 | IAM 정책으로 Secrets Manager 리소스별 접근 제한 |
| **개발 부담** | 낮음 (API 몇 줄로 구성 완료) | 높음 (인프라 + 로직 + 순환 + 모니터링 전체 구현) |
| **운영 부담** | 최소 (완전 관리형) | 중~높음 (토큰 만료, 순환 실패, 시크릿 동기화 모니터링) |
| **비용** | AgentCore Identity API 호출 기반 | Secrets Manager ($0.40/시크릿/월) + Lambda + ElastiCache + API Gateway |
| **적합한 경우** | 에이전트 전용 보안 인프라를 빠르게 구축, 다수의 외부 서비스 통합 | 기존 보안 인프라가 이미 구축되어 있는 경우, 에이전트 외 워크로드와 통합 필요 시 |

> **팁**: "AgentCore Identity는 '에이전트를 위한 Cognito + Secrets Manager + 토큰 자동 갱신'을 하나로 묶은 서비스다"라고 요약할 수 있습니다. 핵심 차이점은 **토큰 볼트의 사용자별 토큰 관리**와 **OBO Token Exchange**로, 이 두 기능은 비관리형에서 재현하기 가장 어려운 부분입니다.

---

## 7. 워크로드 자격 증명

### 워크로드 자격 증명이란?

에이전트의 **고유 신원(Identity)**을 나타내는 자격 증명입니다.

### 생성 방식

| 방식 | 설명 |
|------|------|
| **자동 생성** | AgentCore Runtime에 에이전트 배포 시 자동으로 워크로드 자격 증명 생성 |
| **수동 생성** | 자체 호스팅 또는 하이브리드 배포 시 수동으로 생성 |

### 워크로드 자격 증명 관리

```bash
# AWS CLI로 워크로드 자격 증명 목록 조회
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

**핵심 포인트**:
- 워크로드 자격 증명 ARN은 IAM 정책 및 액세스 제어에 사용
- 배포 응답에서 ARN이 반환됨
- 자격 증명은 서비스에서 관리하며 배포 환경에 필요한 설정 포함

---

## 8. 자격 증명 공급자 구성

### 지원되는 인증 패턴

| 패턴 | 설명 |
|------|------|
| **OAuth 2.0 클라이언트 자격 증명 부여 (2LO)** | 머신 간 인증 |
| **OAuth 2.0 인증 코드 부여 (3LO)** | 사용자 위임 액세스 |
| **API 키** | 단순 키 기반 인증 |

### OAuth2 자격 증명 공급자 생성 (예: GitHub)

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

### API 키 자격 증명 공급자 생성

```python
from bedrock_agentcore.services.identity import IdentityClient

identity_client = IdentityClient("us-east-1")

apikey_provider = identity_client.create_api_key_credential_provider({
    "name": "your-service-name",
    "apiKey": "your-api-key"
})
```


---

## 9. Runtime과 Identity 통합

### Cognito 인증을 통한 안전한 배포

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

# 프로덕션에 배포
launch_result = agentcore_runtime.launch()
```

#### 배포 및 인증 구성 다이어그램

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
*Runtime과 Identity 통합: 배포 및 인증 구성 흐름*

### Runtime 실행 역할 (Execution Role)

AgentCore Runtime 실행 역할에 포함되는 권한:

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
*AgentCore Runtime 실행 역할의 기본 및 추가 권한 구성*

**핵심 원칙**: 최소 권한 원칙 적용 - 에이전트가 필요한 권한만 부여

---

## 10. 지식 확인 및 핵심 정리

### 지식 확인 문제

**문제 1**: 금융 서비스 회사의 AI 에이전트 - 적절한 인증 컨텍스트 유지 + 상세 감사 추적 요구
- ✅ **정답: D** - Amazon Cognito 인증으로 배포 + AgentCore Runtime 서비스 연결 역할 구성
- 핵심: Cognito = 사용자 인증 + 서비스 연결 역할 = 감사 추적 자동화

**문제 2**: 여러 서드파티 서비스(Salesforce, ServiceNow) + 보안 경계 유지 + 2LO/3LO 모두 지원
- ✅ **정답: A** - 여러 자격 증명 공급자를 통한 워크로드 자격 증명
- 핵심: 워크로드 자격 증명 하나에 여러 자격 증명 공급자를 연결하여 다양한 인증 패턴 지원

### 모듈 학습 목표 달성 확인

이 모듈을 완료하면 다음을 수행할 수 있습니다:
- ✅ 엔터프라이즈 보안 요구 사항에 맞게 AgentCore Identity를 구성
- ✅ 안전한 토큰 관리 및 권한 위임을 구현
- ✅ 데이터 거버넌스 및 감사 요구 사항을 준수

---

## 11. 추가 Key Points - 강사 보충 자료

### 11.1 🆕 OBO (On-Behalf-Of) Token Exchange

2026년 4월에 추가된 핵심 기능으로, 에이전트가 인증된 사용자를 대신하여 보호된 리소스에 접근할 수 있습니다.

**기존 방식의 문제**:
- 사용자가 여러 서비스에 대해 각각 동의 흐름을 거쳐야 함
- 동의 피로(Consent fatigue) 발생

**OBO 방식의 해결**:
```
User --[Initial Auth]---> Agent
Agent --[OBO Token Exchange]---> Service A (on behalf of user)
Agent --[OBO Token Exchange]---> Service B (on behalf of user)
Agent --[OBO Token Exchange]---> Service C (on behalf of user)
```
*OBO Token Exchange: 사용자 1회 인증으로 에이전트가 여러 서비스에 위임 접근*
- 다중 동의 흐름 불필요
- 사용자는 한 번만 인증하면 에이전트가 위임된 권한으로 여러 서비스 접근

### 11.2 🆕 VPC Egress 지원

Identity, Gateway, Runtime 모두 고객 VPC 내 리소스에 접근 가능:

| 서비스 | VPC Egress 사용 사례 |
|--------|---------------------|
| **Identity** | VPC 내 Identity Provider 연결 (프라이빗 Okta/Entra 인스턴스) |
| **Gateway** | VPC 내 MCP 서버 (EKS 호스팅) 접근 |
| **Runtime** | VPC 내 데이터베이스, 내부 API 접근 |

프라이빗 DNS 해석 지원으로 내부 도메인 이름 사용 가능.

### 11.3 🆕 추가 IAM 조건 키

보안 정책을 더 세밀하게 제어하기 위한 새로운 조건 키:

| 조건 키 | 용도 |
|---------|------|
| `bedrock-agentcore:RuntimeAuthorizerType` | 특정 인증 메커니즘 강제 (OAuth Runtime에서 필수) |
| `aws:VpceOrgID` | 조직 소유 VPC 엔드포인트로만 호출 제한 |
| `bedrock-agentcore:Subnets` | 승인된 서브넷으로만 배포 제한 |
| `bedrock-agentcore:SecurityGroups` | 승인된 보안 그룹으로만 배포 제한 |

### 11.4 인바운드 vs 아웃바운드 인증 정리표

| 구분 | 인바운드 | 아웃바운드 |
|------|----------|-----------|
| **방향** | 사용자/앱 → 에이전트 | 에이전트 → 외부 리소스 |
| **질문** | "이 사용자는 누구인가?" | "이 에이전트는 누구인가?" |
| **방식** | IAM SigV4, JWT Bearer | IAM Role, OAuth 2LO/3LO, API Key |
| **관리** | Runtime 인증 구성 | Identity 자격 증명 공급자 |
| **예시** | Cognito 토큰으로 에이전트 호출 | GitHub API에 에이전트가 접근 |

### 11.5 보안 아키텍처 모범 사례

#### 최소 권한 원칙 적용

```
❌ 나쁜 예: 모든 S3 버킷에 대한 전체 접근
{
  "Effect": "Allow",
  "Action": "s3:*",
  "Resource": "*"
}

✅ 좋은 예: 특정 버킷의 특정 경로만 읽기
{
  "Effect": "Allow",
  "Action": ["s3:GetObject"],
  "Resource": "arn:aws:s3:::my-agent-data/reports/*"
}
```

#### 자격 증명 순환 전략

| 자격 증명 유형 | 순환 방식 |
|---------------|-----------|
| IAM 역할 | 임시 자격 증명 자동 순환 (STS) |
| OAuth 토큰 | AgentCore Identity가 토큰 캐싱 및 갱신 관리 |
| API 키 | 정기적 수동 순환 또는 Secrets Manager 연동 |

### 11.6 🆕 ISO/CSA STAR 인증 및 GovCloud

- **ISO 인증**: AgentCore가 ISO 및 CSA STAR 컴플라이언스 달성 (2026년 2월)
- **GovCloud (US-West)**: 정부 및 규제 워크로드를 위한 AgentCore 지원 (2026년 5월)
- AWS 컴플라이언스 서비스 페이지에 공식 등재

### 11.7 🆕 PrivateLink 전체 지원

모든 AgentCore 서비스의 컨트롤/데이터 플레인에 PrivateLink 지원:

| 서비스 | 엔드포인트 |
|--------|-----------|
| 컨트롤 플레인 | `com.amazonaws.region.bedrock-agentcore-control` |
| Runtime 데이터 플레인 | `com.amazonaws.region.bedrock-agentcore-runtime` |
| Gateway 데이터 플레인 | `com.amazonaws.region.bedrock-agentcore-gateway` |

→ VPC 내에서 인터넷 경유 없이 AgentCore 리소스 생성/관리/호출 가능

### 🆕 11.8 Bedrock Guardrails 통합 (2026년 6월 NY Summit)

에이전트는 **확률적(probabilistic)**이라는 점에서 기존 소프트웨어에 없던 보안 과제를 제시합니다.
새로운 노출 지점은 네트워크가 아니라 **에이전트의 컨텍스트**입니다. 프롬프트 인젝션과 메모리
포이즈닝은 시스템에 침입하지 않고도 에이전트가 잘못된 판단을 내리도록 "설득"합니다.

이를 해결하는 원칙: **확률적인 것은 결정적인 것으로 보호한다** - 두뇌가 아니라 두뇌를 둘러싼
가드레일로서.

| 항목 | 내용 |
|------|------|
| **Bedrock Guardrails 통합** | AgentCore Policy에 통합 (GA). 모든 에이전트 액션을 프롬프트 인젝션 시도, 유해 콘텐츠, 민감 데이터 노출에 대해 평가 |
| **Gateway 계층 실행** | 검사는 에이전트 코드 외부, **Gateway 계층**에서 실행 → 에이전트가 컨텍스트에서 볼 수 없고, 우회 추론하거나 "적용되지 않는다"고 자기 설득 불가 |
| **결정적 집행** | 탐지는 확률적일 수 있으나 정책 집행은 항상 결정적 - 설정된 임곗값 기반 최종 허용/거부 결정 |

**🔜 서드파티 탐지 신호 (출시 예정)**: Guardrails는 정책 엔진이 활용할 수 있는 여러 탐지 신호 중
첫 번째입니다. 향후 Check Point, Zscaler, Rubrik, Netskope, SentinelOne 등 주요 보안 공급자의
탐지 신호를 동일한 정책에 입력할 수 있게 됩니다.

> **M04 Policy와의 연결**: Policy는 "에이전트가 도구/데이터로 무엇을 할 수 있는가"를 Gateway에서
> 결정적으로 제어합니다. Guardrails 통합은 이 정책 엔진에 "모든 액션의 안전성 검사"를 추가하는
> 확장입니다. 모든 도구와 컨텍스트 소스가 Gateway를 경유하므로, 새 기능도 자동으로 동일한 보안
> 계층의 거버넌스를 받습니다.

### 11.9 강의 토론 포인트

1. **"에이전트 보안은 기존 애플리케이션 보안과 어떻게 다른가?"**
   - 비결정적 행동 → 정적 규칙만으로 불충분
   - 동적 권한 부여 필요 (컨텍스트 인식)
   - 에이전트 자체가 "행위자"로서 신원 필요

2. **"에이전트에게 사용자의 권한을 위임할 때 위험은?"**
   - 과도한 권한 위임 → 최소 권한 + Policy로 제한
   - 토큰 유출 → 안전한 토큰 저장소 + 짧은 TTL
   - 감사 부재 → Observability 필수 활성화

3. **"2LO vs 3LO - 언제 어떤 것을 사용해야 하는가?"**
   - 2LO: 에이전트 자체 권한으로 충분한 경우 (시스템 작업)
   - 3LO: 사용자 고유 데이터에 접근해야 하는 경우 (개인 이메일, 캘린더)

4. **"AgentCore Identity vs 비관리형 - 어떤 경우에 비관리형을 선택하겠는가?"**
   - 기존 Cognito + API Gateway + Secrets Manager 인프라가 이미 운영 중인 경우
   - 에이전트 외 다른 워크로드(웹 앱, 마이크로서비스)와 동일한 인증 인프라를 공유해야 하는 경우
   - AgentCore Identity를 택하는 경우: 다수의 외부 서비스 통합, 사용자별 3LO 토큰 관리, OBO 패턴 필요 시

---

## 교재 대비 변경 요약

| 교재 내용 (v1.0.4) | 현재 상태 (2026년 5월) |
|---------------------|----------------------|
| 기본 OAuth 2LO/3LO | **3LO GA** (Gateway MCP 대상) |
| OBO 없음 | **🆕 OBO Token Exchange** (다중 동의 흐름 제거) |
| 기본 VPC 지원 | **🆕 VPC Egress** (Identity/Gateway/Runtime 모두) |
| 기본 IAM 조건 키 | **🆕 추가 조건 키** (RuntimeAuthorizerType, VpceOrgID, Subnets, SecurityGroups) |
| 컴플라이언스 미언급 | **🆕 ISO/CSA STAR 인증 + GovCloud** |
| 기본 PrivateLink | **🆕 전체 컨트롤/데이터 플레인 PrivateLink** |
| OAuth WebSocket 없음 | **🆕 OAuth WebSocket 인증** (브라우저 JS 직접 연결) |
| Guardrails 통합 없음 | 🆕 **NY Summit 2026**: Bedrock Guardrails + Policy 통합 (GA), 서드파티 탐지 신호 연동 예정 |

---

## 참고 자료

- [AgentCore Identity 공식 문서](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/identity.html)
- [Features of AgentCore Identity](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/key-features-and-benefits.html)
- [Understanding Workload Identities](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/understanding-agent-identities.html)
- [Manage credential providers with AgentCore Identity](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/identity-outbound-credential-provider.html)
- [Secure AI agents with Amazon Bedrock AgentCore Identity on Amazon ECS (AWS ML Blog)](https://aws.amazon.com/blogs/machine-learning/secure-ai-agents-with-amazon-bedrock-agentcore-identity-on-amazon-ecs/)
- [Securing AI agents with Amazon Bedrock AgentCore Identity (AWS Security Blog)](https://aws.amazon.com/blogs/security/securing-ai-agents-with-amazon-bedrock-agentcore-identity/)
- [Introducing Amazon Bedrock AgentCore Identity (AWS ML Blog)](https://aws.amazon.com/blogs/machine-learning/introducing-amazon-bedrock-agentcore-identity-securing-agentic-ai-at-scale/)
- [Empower AI agents with user context using Amazon Cognito (AWS Security Blog)](https://aws.amazon.com/blogs/security/empower-ai-agents-with-user-context-using-amazon-cognito/)
- [OBO Token Exchange 문서](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/on-behalf-of-token-exchange.html)
- [VPC Egress - Identity](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/identity-private-idp.html)
- [IAM 조건 키 문서](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/security_iam_service-with-iam.html)
- [VPC 인터페이스 엔드포인트](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/vpc-interface-endpoints.html)
- [New in Amazon Bedrock AgentCore - Guardrails 통합 (NY Summit 2026)](https://aws.amazon.com/blogs/machine-learning/new-in-amazon-bedrock-agentcore-build-agents-with-broader-knowledge-and-continuous-learning/)

---

*본 문서는 MLAGAC-10-KO-KR-M03-SecurityAndIdentity_InstructorDeck.pdf의 내용을 기반으로 작성되었으며,
🆕 표시된 내용은 2026년 5월 기준 최신 서비스 업데이트를 반영한 강사 보충 자료입니다.*

*문서 버전: 2.1 | 작성일: 2026-05-28 | 최종 수정: 2026-06-23 | 업데이트 기준: 2026년 6월 AWS Summit New York 반영*
