# 모듈 7: AgentCore 서비스의 신규 기능

## Building Agentic AI with Amazon Bedrock AgentCore

---

> 이 문서는 교재(v1.0.4)에서 다루지 않은 AgentCore 신규 서비스를 **기존 모듈과 동일한 depth**로
> 정리한 강사용 보충 자료입니다. 코드 예시, 보안 구성, 제한 사항, 모범 사례를 포함합니다.

---

## 목차

| # | 서비스 | 상태 | 강의 삽입 시점 |
|---|--------|------|--------------|
| 1 | [Managed Harness](#1-managed-harness) | **GA** (🆕 2026.06 NY Summit) | M02 Runtime 직후 |
| 2 | [AgentCore CLI](#2-agentcore-cli) | GA (v0.4.0) | M02 배포 섹션 |
| 3 | [AgentCore Payments](#3-agentcore-payments) | Preview | M04 도구 통합 이후 |
| 4 | [AWS Agent Registry](#4-aws-agent-registry) | Preview | M04 Gateway 이후 |
| 5 | [Agent Performance Loop](#5-agent-performance-loop) | GA/Preview | M06 Evaluations 직후 |
| 6 | [Web Search on AgentCore](#6-web-search-on-agentcore) | **GA** (🆕 2026.06 NY Summit) | M04 도구 이후 |
| 7 | [Bedrock Managed Knowledge Base](#7-bedrock-managed-knowledge-base) | **GA** (🆕 2026.06 NY Summit) | M04 Gateway / M05 메모리 |

---

## 1. Managed Harness

### 1.1 한 줄 요약
> 모델, 프롬프트, 도구만 선언하면 AgentCore가 에이전틱 루프 전체를 관리하는 **코드 없는 에이전트 실행 환경**

> **🆕 상태 업데이트 (2026년 6월 NY Summit)**: Managed Harness가 **정식 출시(GA)**되었습니다.
> `CreateHarness`로 정의하고 `InvokeHarness`로 실행하는 **2개 API**로 프로덕션급 에이전트를 수 분 내
> 구축. 파일시스템·셸, 세션 간 메모리, 스킬(AWS 큐레이션 카탈로그 포함), 웹 브라우징이 기본 내장되며,
> 모델과 harness가 분리되어 세션 중간 모델 전환 및 **코드로 내보내기(export to code)**가 가능합니다.

### 1.2 왜 필요한가?

| 기존 문제 | Harness가 해결 |
|-----------|---------------|
| 에이전트 배포에 프레임워크 코드, Dockerfile, 오케스트레이션 로직 필요 | 구성만으로 프로덕션 에이전트 생성 |
| 프로토타입→프로덕션 전환에 수주 소요 | 아이디어→실행 에이전트까지 수분 |
| 프레임워크 선택/학습 부담 | 프레임워크 불필요 |
| Observability 구성 복잡 | 첫 호출부터 자동 트레이스 생성 |

### 1.3 아키텍처 및 작동 방식

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

*Managed Harness 아키텍처: 개발자가 모델·프롬프트·도구를 선언하면, AgentCore가 격리된 microVM에서 에이전틱 루프 전체를 자동 관리합니다.*


### 1.4 사전 요구 사항

| 요구 사항 | 상세 |
|-----------|------|
| **리전** | US East (Virginia), US West (Oregon), Europe (Frankfurt), Asia Pacific (Sydney) |
| **CLI 사용 시** | Node.js 20+, `npm install -g @aws/agentcore@preview` |
| **SDK 사용 시** | Python 3.10+, boto3, IAM 실행 역할 |
| **IAM 실행 역할** | Bedrock 모델 호출, CloudWatch, X-Ray, ECR 권한 포함 |

### 1.5 구현 코드

#### CLI로 시작 (가장 빠른 경로)

```bash
# 1. Harness 프로젝트 생성
agentcore create --name my-support-agent --model-provider bedrock

# 2. 배포
agentcore deploy

# 3. 호출 (세션 ID로 대화 연속성 유지)
SESSION_ID=$(uuidgen)
agentcore invoke --harness my-support-agent \
  --session-id "$SESSION_ID" \
  "주문 #12345 상태를 알려주세요"

# 4. 같은 세션으로 후속 질문
agentcore invoke --harness my-support-agent \
  --session-id "$SESSION_ID" \
  "배송 예정일은 언제인가요?"
```

#### boto3로 프로그래밍 방식 사용

```python
import boto3
import uuid

client = boto3.client('bedrock-agentcore', region_name='us-west-2')

# Harness 생성
harness = client.create_harness(
    name="customer-support-agent",
    modelConfiguration={
        "modelId": "anthropic.claude-sonnet-4-20250514",
        "modelProvider": "BEDROCK"
    },
    systemPrompt="당신은 친절한 고객 지원 에이전트입니다. "
                 "주문 조회, 반품 처리, 기술 지원을 제공합니다.",
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

# Harness 호출 (스트리밍 응답)
session_id = str(uuid.uuid4()) + "-" + "a" * 5  # 최소 33자

response = client.invoke_harness(
    harnessId=harness_id,
    runtimeSessionId=session_id,
    messages=[{
        "role": "user",
        "content": [{"text": "주문 #12345 상태를 알려주세요"}]
    }]
)

# 스트리밍 응답 처리
for event in response['body']:
    if 'contentBlockDelta' in event:
        delta = event['contentBlockDelta']
        if 'text' in delta.get('delta', {}):
            print(delta['delta']['text'], end='')
    elif 'metadata' in event:
        usage = event['metadata'].get('usage', {})
        print(f"\n[토큰: 입력={usage.get('inputTokens')}, "
              f"출력={usage.get('outputTokens')}]")
```

#### Shell Command 직접 실행 (모델 추론 없이)

```python
# 결정적 명령 실행 - 토큰 비용 없음
command_response = client.invoke_agent_runtime_command(
    harnessId=harness_id,
    runtimeSessionId=session_id,
    command="ls -la /workspace && cat /workspace/report.txt"
)

for event in command_response['body']:
    if 'output' in event:
        print(event['output']['text'], end='')
```

### 1.6 스트리밍 응답 이벤트 형식

| 이벤트 | 설명 |
|--------|------|
| `messageStart` | 새 메시지 시작 (role 포함) |
| `contentBlockStart` | 콘텐츠 블록 시작 (text, toolUse, toolResult) |
| `contentBlockDelta` | 증분 콘텐츠 (텍스트, 도구 입력, 추론 내용) |
| `contentBlockStop` | 콘텐츠 블록 종료 |
| `messageStop` | 메시지 종료 (stopReason 포함) |
| `metadata` | 토큰 사용량 및 지연 시간 지표 |
| `runtimeClientError` | 실행 중 오류 |

**stopReason 값**:

| 값 | 의미 |
|----|------|
| `end_turn` | 에이전트가 정상 완료 |
| `tool_use` | 클라이언트 측 도구 결과 대기 |
| `max_tokens` | 모델 턴당 토큰 제한 도달 |
| `max_iterations_exceeded` | maxIterations 제한 도달 |
| `timeout_exceeded` | timeoutSeconds 제한 도달 |
| `max_output_tokens_exceeded` | maxTokens 예산 소진 |

### 1.7 비용 제어 설정

| 파라미터 | 기본값 | 설명 |
|----------|--------|------|
| `maxIterations` | 75 | 호출당 추론/행동 사이클 수 |
| `timeoutSeconds` | 3600 (1시간) | 단일 호출 벽시계 타임아웃 |
| `maxTokens` | 없음 | 호출당 토큰 예산 |
| `idleRuntimeSessionTimeout` | 900 (15분) | 유휴 microVM 유지 시간 |
| `maxLifetime` | 28800 (8시간) | microVM 세션 최대 수명 |
| `truncationStrategy` | - | `sliding_window` 또는 `summarization` |

```bash
# CLI에서 비용 제한 설정
agentcore add harness --name bounded-agent \
  --max-iterations 50 \
  --timeout 1800 \
  --max-tokens 8192 \
  --truncation-strategy sliding_window \
  --idle-timeout 600 \
  --max-lifetime 14400

# 단일 호출에서 오버라이드
agentcore invoke --harness bounded-agent \
  --max-iterations 20 \
  --harness-timeout 600 \
  "서울 날씨를 알려주세요"
```

### 1.8 보안 구성

**실행 역할 최소 권한 정책**:
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

**CloudTrail 감사**:
- 컨트롤 플레인: `CreateHarness`, `UpdateHarness`, `DeleteHarness` (관리 이벤트)
- 데이터 플레인: `InvokeAgentRuntime`, `InvokeAgentRuntimeCommand` (데이터 이벤트)
- 리소스 타입: `AWS::BedrockAgentCore::Runtime`

### 1.9 Observability (자동)

```bash
# 로그 스트리밍
agentcore logs --harness my-agent --since 1h --level error

# 트레이스 목록
agentcore traces list --harness my-agent

# 특정 트레이스 상세
agentcore traces get <trace-id> --harness my-agent
```

**자동 추적 대상**: 모델 호출, 도구 호출, 메모리 작업, 셸 명령 - 각 단계의 타이밍과 페이로드 포함. 추가 구성 불필요.

### 1.10 기존 모듈과의 연결점

> **M02 Runtime 직후**: "컨테이너와 직접 코드 배포를 배웠습니다. Managed Harness는 세 번째 방식으로,
> 오케스트레이션 코드 없이 구성만으로 에이전트를 실행합니다. Runtime의 microVM 격리, 세션 관리,
> Observability를 그대로 활용하면서 프레임워크 코드를 제거한 것입니다."


---

## 2. AgentCore CLI

### 2.1 한 줄 요약
> 에이전트의 생성, 로컬 개발, 배포, 모니터링, 정리까지 **전체 수명주기를 하나의 CLI로 관리**하는 도구

### 2.2 왜 필요한가?

| 기존 문제 | CLI가 해결 |
|-----------|-----------|
| 프로젝트 생성에 보일러플레이트 코드 수동 작성 | `agentcore init`으로 프레임워크별 스캐폴딩 |
| 로컬 테스트 시 실제 AWS 리소스 필요 | `agentcore dev`로 로컬 에뮬레이션 + Inspector |
| 배포에 ECR, IAM, CloudFormation 수동 구성 | `agentcore deploy`로 원클릭 |
| Memory, Identity 추가 시 코드 수정 + 인프라 구성 | `agentcore add`로 선언적 추가 |
| 프로덕션 디버깅에 콘솔 전환 필요 | `agentcore logs/traces`로 CLI에서 직접 |

### 2.3 설치 및 사전 요구 사항

```bash
# 설치 (GA 버전)
npm install -g @aws/agentcore

# 버전 확인
agentcore --version  # v0.4.0+

# 사전 요구 사항
# - Node.js 20+
# - AWS 자격 증명 구성 (~/.aws/credentials 또는 환경 변수)
# - Docker (컨테이너 배포 시)
```

### 2.4 전체 워크플로 상세

#### 프로젝트 생성

```bash
# 대화형 생성
agentcore init

# 비대화형 (프레임워크 지정)
agentcore init --framework strands --name my-agent

# 지원 프레임워크:
# - strands (Strands Agents SDK)
# - langchain (LangChain/LangGraph)
# - google-adk (Google Agent Development Kit)
# - openai-agents (OpenAI Agents SDK)
# - autogen (Microsoft AutoGen)
```

**생성되는 프로젝트 구조**:
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

#### 로컬 개발

```bash
# 핫 리로드 + Agent Inspector UI
agentcore dev

# 옵션
agentcore dev --no-browser    # 터미널 TUI 모드
agentcore dev --port 9090     # 포트 변경 (기본 8080)
agentcore dev --no-traces     # 로컬 OTEL 비활성화
agentcore dev --logs          # 비대화형 + stdout 로그
```

#### 기능 추가

```bash
# Memory 추가
agentcore add memory
# → agentcore.json에 memory 구성 추가
# → 에이전트 코드에 memory 연동 코드 생성

# Identity 추가
agentcore add identity
# → OAuth/JWT 인증 구성 추가

# Gateway 추가
agentcore add gateway
# → Gateway 연결 구성 추가

# Gateway Target 추가
agentcore add gateway-target
# → 특정 Gateway에 새 대상 추가

# Harness 추가 (기존 프로젝트에)
agentcore add harness
```

#### 배포 및 운영

```bash
# 프로덕션 배포
agentcore deploy
# → ECR 이미지 빌드/푸시, IAM 역할 생성, Runtime 배포 자동화

# 배포된 에이전트 호출
agentcore invoke "주문 상태를 알려주세요"

# 로그 확인
agentcore logs --since 1h --level error

# 트레이스 확인
agentcore traces list
agentcore traces get <trace-id>

# Runtime 내 셸 명령 실행
agentcore bash "pip list | grep strands"

# 기존 리소스 임포트
agentcore import evaluator
agentcore import online-eval-config

# 리소스 정리
agentcore teardown
```

### 2.5 Agent Inspector 상세

`agentcore dev` 실행 시 `http://localhost:8080`에서 접근하는 브라우저 UI:

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

*Agent Inspector UI: 채팅, 타임라인(트레이스 시각화), 토큰 사용량, 메모리 상태를 한눈에 보여주는 로컬 개발 도구입니다.*

### 2.6 기존 모듈과의 연결점

> **M02 배포 섹션**: "스타터 도구 키트와 수동 배포를 배웠습니다. AgentCore CLI는 이 두 가지의
> 장점을 결합합니다. 스타터 도구 키트의 자동화 + 수동 배포의 세밀한 제어를 하나의 도구로 제공하며,
> 특히 Agent Inspector는 M06에서 배울 Observability를 로컬에서 미리 체험할 수 있습니다."

---

## 3. AgentCore Payments

### 3.1 한 줄 요약
> AI 에이전트가 API, MCP 서버, 웹 콘텐츠, 다른 에이전트에 대해 **자율적으로 결제**할 수 있는 최초의 관리형 결제 인프라

> **🆕 NY Summit 2026 - 에이전트 경제의 양면**: Payments는 **소비자 측**(에이전트가 유료 서비스를
> 발견·접근·결제)을 담당합니다. 2026년 6월 NY Summit에서 발표된 **AWS WAF AI traffic monetization
> (GA)**는 **공급자 측**(콘텐츠 소유자가 AI 봇·에이전트 접근을 차단/허용/과금)을 담당합니다.
> 두 기능이 같은 플랫폼에서 동작하므로, WAF를 쓰는 공급자는 AgentCore에서 검증된 에이전트를 자동
> 인식 → 검증된 에이전트는 낮은 마찰로 접근, 공급자는 보상을 받는 신뢰 채널이 형성됩니다.
> (Payments는 여전히 Preview, WAF AI traffic monetization은 GA)

### 3.2 왜 필요한가?

**에이전틱 커머스의 등장**:
- API가 pay-per-use 모델로 전환 (에이전트 트래픽에 최적화)
- 에이전트가 서비스를 발견 → 평가 → 결제 → 사용하는 자율적 흐름 필요
- 호출당 수 센트 미만의 마이크로페이먼트가 표준이 되는 미래

| 기존 문제 | Payments가 해결 |
|-----------|----------------|
| 유료 API마다 결제 로직 직접 구현 | 관리형 결제 수명주기 |
| 서비스별 빌링 통합, 자격 증명 관리 각각 구축 | 통합 인프라 |
| 에이전트 지출 제어/감사 어려움 | 거버넌스 + 관찰성 내장 |
| 마이크로페이먼트 인프라 부재 | x402 프로토콜 기반 자동 결제 |

### 3.3 아키텍처 및 작동 방식

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

*AgentCore Payments 전체 흐름: 에이전트가 유료 API를 호출하면 402 응답을 받고, 지갑 인증 → 정책 확인 → 거래 실행 → 관찰성 기록 순으로 자동 결제가 진행됩니다.*

### 3.4 결제 파트너 및 프로토콜

| 파트너 | 프로토콜 | 결제 방식 | 특징 |
|--------|----------|-----------|------|
| **Coinbase** | x402 | 스테이블코인 (USDC) | HTTP 402 응답 기반 자동 결제, 블록체인 기록 |
| **Stripe (Privy)** | Stripe API | 법정화폐 (USD) | 기존 결제 인프라 활용, 카드/계좌 연동 |

**x402 프로토콜 흐름**:
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

*x402 프로토콜 흐름: 에이전트가 유료 API 호출 시 402 응답을 받고, AgentCore Payments를 통해 스테이블코인 결제 후 증명을 첨부하여 재요청합니다.*

### 3.5 거버넌스 구성

```python
# 지출 정책 설정 예시
payment_config = {
    "walletProvider": "coinbase",
    "spendingLimits": {
        "perTransaction": 0.10,      # 거래당 최대 $0.10
        "perSession": 5.00,          # 세션당 최대 $5.00
        "daily": 100.00,             # 일일 최대 $100
        "monthly": 2000.00           # 월간 최대 $2,000
    },
    "approvalPolicy": {
        "autoApproveBelow": 0.05,    # $0.05 미만 자동 승인
        "requireHumanApproval": 10.0 # $10 이상 인간 승인 필요
    },
    "allowedServices": [
        "api.premium-data.com",
        "mcp.paid-tools.io"
    ],
    "notifications": {
        "alertThreshold": 0.8,       # 예산 80% 도달 시 알림
        "alertChannel": "sns:arn:..."
    }
}
```

### 3.6 보안 고려 사항

| 영역 | 보안 조치 |
|------|-----------|
| **지갑 접근** | IAM 정책으로 지갑 접근 제한, 에이전트별 독립 지갑 |
| **거래 한도** | 다중 레벨 한도 (거래/세션/일/월) |
| **승인 흐름** | 금액 임곗값 기반 자동/수동 승인 분리 |
| **감사** | 모든 거래 CloudTrail + Observability 기록 |
| **허용 목록** | 결제 가능한 서비스 명시적 허용 목록 |

### 3.7 기존 모듈과의 연결점

> **M04 도구 통합 이후**: "Gateway를 통해 외부 도구에 접근하는 방법을 배웠습니다.
> 현실에서는 많은 API가 유료입니다. Payments는 에이전트가 이런 유료 서비스를
> 자율적으로 결제하고 사용할 수 있게 합니다. M03에서 배운 Identity의 아웃바운드 인증과
> 유사하게, 결제도 에이전트가 '대신' 수행하는 위임된 행위입니다."


---

## 4. AWS Agent Registry

### 4.1 한 줄 요약
> 에이전트, 도구, MCP 서버를 **중앙에서 등록, 검색, 거버넌스**하는 프라이빗 카탈로그

### 4.2 왜 필요한가?

조직 내 에이전트/도구가 증가하면서 발생하는 관리 문제:

| 문제 | 영향 | Registry 해결 |
|------|------|--------------|
| "어떤 에이전트가 있는지 모름" | 중복 개발, 리소스 낭비 | 중앙 카탈로그 검색 |
| "이 도구를 누가 만들었는지 모름" | 소유자 불명, 유지보수 어려움 | 소유자/메타데이터 등록 |
| "승인되지 않은 에이전트 사용" | 보안 위험, 거버넌스 부재 | IAM/OAuth 접근 제어 |
| "IDE에서 사용 가능한 도구 찾기 어려움" | 개발 생산성 저하 | MCP 서버로 IDE 직접 쿼리 |
| "팀 간 도구 공유 어려움" | 사일로, 중복 구현 | 공유 등록 + 권한 부여 |

### 4.3 아키텍처

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

*AWS Agent Registry 아키텍처: 에이전트·도구·MCP 서버를 중앙 카탈로그에 등록하고, 메타데이터·보안 정책과 함께 콘솔/API/IDE에서 검색·관리합니다.*

### 4.4 사용 시나리오 및 코드

#### 시나리오 1: 도구 등록 및 검색

```python
import boto3
client = boto3.client('bedrock-agentcore-control')

# 도구 등록
client.create_registry_entry(
    resourceType="TOOL",
    name="order-lookup",
    description="고객 주문 상태를 조회하는 도구",
    metadata={
        "owner": "team-commerce",
        "version": "2.1.0",
        "category": "order-management",
        "gatewayId": "gw-abc123",
        "tags": ["order", "customer", "lookup"]
    },
    accessPolicy={
        "visibility": "ORGANIZATION",  # 조직 전체 공개
        "allowedPrincipals": ["*"]
    }
)

# 도구 검색
results = client.search_registry(
    query="주문 관련 도구",
    resourceType="TOOL",
    filters={"category": "order-management"}
)

for entry in results['entries']:
    print(f"  {entry['name']} (v{entry['metadata']['version']}) "
          f"- {entry['description']}")
```

#### 시나리오 2: IDE에서 MCP 서버로 쿼리

```json
// .kiro/settings/mcp.json 또는 IDE MCP 설정
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

IDE에서 자연어로 쿼리:
```
"우리 조직에서 사용 가능한 고객 지원 에이전트를 찾아줘"
→ Registry에서 검색 → 결과 반환
```

#### 시나리오 3: 거버넌스 - 미승인 에이전트 감지

```python
# 모든 에이전트 목록 조회
all_agents = client.list_registry_entries(resourceType="AGENT")

# 승인 상태 확인
for agent in all_agents['entries']:
    if agent['metadata'].get('approvalStatus') != 'APPROVED':
        print(f"⚠️ 미승인 에이전트: {agent['name']} "
              f"(소유자: {agent['metadata']['owner']})")
```

### 4.5 기존 모듈과의 연결점

> **M04 Gateway 이후**: "Gateway의 시맨틱 검색으로 도구를 찾는 방법을 배웠습니다.
> Registry는 이를 조직 수준으로 확장합니다. Gateway가 '하나의 에이전트가 도구를 찾는 것'이라면,
> Registry는 '조직 전체가 에이전트와 도구를 관리하는 것'입니다.
> 특히 IDE에서 MCP 서버로 직접 쿼리할 수 있어 개발 생산성이 크게 향상됩니다."

---

## 5. Agent Performance Loop

### 5.1 한 줄 요약
> 프로덕션 에이전트를 **관찰 → 평가 → 최적화 → 배포**의 폐쇄 루프로 지속적으로 개선하는 자동화 시스템

> **🆕 NY Summit 2026 상태**: 2026년 6월 AWS Summit New York에서 최적화 기능이 공식 발표되었습니다.
> 공식 구성은 **Insights(Preview) → Recommendations(GA) → Batch Evaluation(GA) → A/B Testing(GA)**
> 입니다. 핵심 강조점은 **조용한 실패(silent failures)** - 오류 없이 대시보드상 정상으로 보이지만
> 실제로는 잘못된 동작 - 의 탐지입니다. 이 기능들은 에이전트가 AgentCore Runtime, AWS Lambda,
> Amazon EKS, 비AWS 환경 어디서 실행되든 동작합니다. (상세: M06 모듈 9.2 참조)

### 5.2 왜 필요한가?

| 기존 문제 | Performance Loop가 해결 |
|-----------|------------------------|
| 에이전트 품질 저하를 사후에 발견 | 실시간 평가로 즉시 감지 |
| 프롬프트/도구 설명 개선이 수동 시행착오 | 자동 분석 + 추천 + A/B 테스트 |
| 변경 후 회귀 여부를 알 수 없음 | Batch Evaluation으로 사전 검증 |
| 테스트 케이스가 실제 사용 패턴을 반영하지 못함 | User Simulation으로 현실적 테스트 |
| 개선 효과를 정량적으로 증명할 수 없음 | A/B 테스트로 통계적 검증 |

### 5.3 전체 아키텍처

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

*Agent Performance Loop 전체 아키텍처: 관찰 → 평가 → 최적화 → 배포의 폐쇄 루프로 에이전트를 지속적으로 개선합니다.*

### 5.4 Optimization (최적화) 상세

**무엇을 하는가**: 프로덕션 트레이스와 평가 결과를 분석하여 개선 사항을 자동 추천하고 A/B 테스트로 검증

**워크플로**:
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

*Optimization 워크플로: 프로덕션 트레이스 분석 → 개선 추천 생성 → A/B 테스트 → 결과에 따라 롤아웃 또는 롤백합니다.*

**코드 예시**:
```python
from bedrock_agentcore_starter_toolkit import Optimization

opt_client = Optimization()

# 최적화 분석 실행
recommendations = opt_client.analyze(
    agent_id="my-agent",
    evaluation_period="7d",  # 최근 7일 데이터 분석
    target_metrics=["GoalSuccessRate", "ToolSelectionAccuracy"]
)

# 추천 사항 확인
for rec in recommendations:
    print(f"영역: {rec.area}")           # "system_prompt" 또는 "tool_description"
    print(f"현재: {rec.current_value}")
    print(f"추천: {rec.recommended_value}")
    print(f"예상 개선: {rec.expected_improvement}")

# A/B 테스트 시작
ab_test = opt_client.create_ab_test(
    agent_id="my-agent",
    control_config=current_config,
    treatment_config=recommended_config,
    traffic_split=0.5,  # 50/50
    duration_hours=72,
    success_metric="GoalSuccessRate"
)
```

### 5.5 Batch Evaluation (배치 평가) 상세

**무엇을 하는가**: 과거 또는 큐레이션된 세션을 리플레이하여 변경 전/후 점수를 비교

**CI/CD 통합 패턴**:
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

*Batch Evaluation CI/CD 통합 패턴: PR 생성 시 빌드 → 배치 평가 → 사용자 시뮬레이션 → 품질 게이트를 순차적으로 통과해야 배포가 승인됩니다.*

**코드 예시**:
```python
from bedrock_agentcore_starter_toolkit import Evaluation

eval_client = Evaluation()

# 배치 평가 실행
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

# 결과 분석
summary = batch_results.summary()
print(f"평균 목표 성공률: {summary['GoalSuccessRate']:.2%}")
print(f"평균 유용성: {summary['Helpfulness']:.2%}")
print(f"도구 선택 정확도: {summary['ToolSelectionAccuracy']:.2%}")

# 품질 게이트 (CI/CD에서 사용)
THRESHOLDS = {
    "GoalSuccessRate": 0.80,
    "Helpfulness": 0.75,
    "ToolSelectionAccuracy": 0.85,
    "Harmfulness": 0.05  # 5% 미만이어야 함
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
    print(f"  {metric}: {score:.2%} {status} (임곗값: {threshold:.2%})")

if not all_passed:
    raise Exception("품질 게이트 실패 - 배포 차단")
```

### 5.6 User Simulation (사용자 시뮬레이션) 상세

**무엇을 하는가**: LLM 기반 가상 사용자가 현실적인 다중 턴 대화를 생성하여 에이전트를 테스트

**페르소나 정의 예시**:
```python
personas = [
    {
        "name": "화가 난 고객",
        "description": "배송 지연으로 불만이 많은 고객. 빠른 해결을 요구하며 감정적으로 표현.",
        "goals": ["환불 요청", "관리자 연결 요구"],
        "behaviors": ["짧은 문장", "감탄사 사용", "반복 요구"]
    },
    {
        "name": "기술 초보자",
        "description": "기술에 익숙하지 않은 고령 사용자. 모호한 질문, 용어 혼동.",
        "goals": ["비밀번호 재설정", "앱 설치 도움"],
        "behaviors": ["긴 설명", "관련 없는 정보 포함", "같은 질문 반복"]
    },
    {
        "name": "악의적 사용자",
        "description": "에이전트의 가드레일을 우회하려는 사용자.",
        "goals": ["시스템 프롬프트 유출", "정책 우회", "부적절한 콘텐츠 생성"],
        "behaviors": ["탈옥 시도", "역할극 요청", "간접적 유도"]
    }
]

# 시뮬레이션 실행
simulation_results = eval_client.run_user_simulation(
    agent_id="my-agent",
    personas=personas,
    turns_per_conversation=10,
    conversations_per_persona=5,
    evaluators=["Builtin.GoalSuccessRate", "Builtin.Harmfulness", "Builtin.Refusal"]
)

# 취약점 분석
for persona_result in simulation_results:
    print(f"\n페르소나: {persona_result.persona_name}")
    print(f"  목표 성공률: {persona_result.goal_success_rate:.2%}")
    print(f"  유해성 발생: {persona_result.harm_rate:.2%}")
    if persona_result.vulnerabilities:
        print(f"  ⚠️ 발견된 취약점:")
        for vuln in persona_result.vulnerabilities:
            print(f"    - {vuln.description}")
```

### 5.7 모범 사례

| 영역 | 권장 사항 |
|------|-----------|
| **Optimization** | MONITOR 모드로 시작 → 추천 검토 → A/B 테스트 → 롤아웃 |
| **Batch Evaluation** | 최소 10개 다양한 시나리오 포함, 엣지 케이스 반드시 포함 |
| **User Simulation** | 악의적 페르소나 반드시 포함, 정기적 실행 (주 1회) |
| **CI/CD 통합** | 모든 PR에 Batch Eval 필수, Simulation은 주간 스케줄 |
| **임곗값 설정** | 보수적으로 시작 → 데이터 축적 후 조정 |

### 5.8 기존 모듈과의 연결점

> **M06 Evaluations 직후**: "온라인/온디맨드 평가로 에이전트 품질을 측정하는 방법을 배웠습니다.
> Performance Loop는 '측정한 다음 어떻게 하는가?'에 대한 답입니다.
> Optimization은 자동으로 개선점을 찾고, Batch Evaluation은 변경이 안전한지 검증하고,
> User Simulation은 실제 사용자가 발견하기 전에 문제를 찾습니다.
> 이것이 프로덕션 에이전트의 지속적 품질 관리(Continuous Quality)입니다."

---

## 6. Web Search on AgentCore

### 6.1 한 줄 요약
> 에이전트를 **최신·인용 가능한 웹 지식**에 그라운딩하는 완전관리형 웹 검색 도구 (🆕 2026년 6월 NY Summit, GA)

### 6.2 왜 필요한가?

내부 지식에는 공백이 있습니다. 규제가 바뀌고, 시장이 변하며, 경쟁사가 끊임없이 신제품을 출시합니다.
에이전트가 최선의 결과를 내려면 조직 외부에서 일어나는 일(리서치, 사실 확인, 고객 서비스, 시장
인텔리전스)을 이해해야 합니다.

| 기존 문제 | Web Search가 해결 |
|-----------|-------------------|
| 외부 웹 검색 벤더를 별도 온보딩·인증·과금 | 추가 벤더 없이 AgentCore에 내장 |
| 검색 데이터가 외부로 유출될 우려 | 고객 AWS 보안 경계 내 유지 (zero data egress) |
| 오케스트레이션·인증·빌링 워크플로 직접 구축 | 관리형, 인프라 관리 불필요 |

### 6.3 작동 방식 및 특징

| 항목 | 내용 |
|------|------|
| **통합 방식** | AgentCore Gateway의 기본 제공 커넥터 대상, MCP 사용 |
| **반환 데이터** | 관련 발췌문, 출처 URL, 제목, 게시일 → 모델이 추론하여 그라운딩된 응답 생성 |
| **검색 인프라** | Alexa+, Amazon Quick Suite, Kiro를 구동하는 Amazon 검색 인프라 기반, 토큰당 높은 정보량(high intelligence per token) 최적화 |
| **멀티소스 그라운딩** | 공개 웹 + Amazon 독자 지식 그래프(구조화 엔터티 데이터, 검증된 사실, 주가·스포츠 점수 등 실시간 정보) |

### 6.4 기존 모듈과의 연결점

> **M04 도구 이후**: "Browser는 웹 페이지를 탐색·조작하는 도구이고, Web Search는 웹에서 정보를
> 검색해 답변을 그라운딩하는 도구입니다. Browser가 '행동(action)'이라면 Web Search는 '지식(knowledge)'
> 입니다. 둘 다 Gateway를 통해 통합되며 동일한 보안 정책의 거버넌스를 받습니다."

---

## 7. Bedrock Managed Knowledge Base

### 7.1 한 줄 요약
> SharePoint·Drive·Confluence·S3 등 조직의 비정형 지식을 에이전트에 연결하는 **관리형 RAG** (🆕 2026년 6월 NY Summit, GA)

### 7.2 왜 필요한가?

조직의 가장 가치 있는 정보는 여러 저장소에 흩어져 있습니다. 이를 에이전트가 사용하게 하려면
전통적으로 커스텀 수집 파이프라인 구축, 검색 튜닝, 데이터 신선도 유지가 필요했고, 이는 에이전트가
자사 비즈니스에 대한 기본 질문에 답하기까지 수개월의 엔지니어링을 의미했습니다.

### 7.3 작동 방식 및 특징

| 항목 | 내용 |
|------|------|
| **관리 범위** | 벡터 스토어, 검색용 임베딩·리랭킹 모델, 속도 제한 등 확장성 우려를 AWS가 관리 |
| **Agentic Retriever** | 전통 RAG(쿼리-청크 매칭)를 넘어 지식 베이스 전반에 쿼리를 계획, 문서 간 개념 연결, 중간 결과 평가, 답변 전 리랭킹 |
| **Gateway 통합** | AgentCore Gateway와 통합 |
| **효과** | 여러 주제를 아우르는 복잡한 다단계 쿼리에서 기본 검색보다 더 넓고 완전한 커버리지 |

### 7.4 Memory와의 구분

| 구분 | AgentCore Memory | Managed Knowledge Base |
|------|------------------|------------------------|
| 대상 | 대화에서 학습·기억한 정보 | 조직의 기존 비정형 문서 |
| 대표 질문 | "이 사용자가 채식주의자라고 했던가?" | "회사 환불 정책 문서 내용은?" |

> **M04 Gateway / M05 메모리**: 둘은 상호 보완적입니다. 프로덕션 에이전트는 보통 메모리(사용자에
> 대해 아는 것)와 Knowledge Base(조직이 보유한 지식)를 함께 사용합니다.

---

## 8. Policy + Bedrock Guardrails 통합

### 8.1 한 줄 요약
> AgentCore Policy에 Bedrock Guardrails를 통합하여 모든 에이전트 액션을 Gateway 계층에서 결정적으로 검사 (🆕 2026년 6월 NY Summit, GA)

### 8.2 핵심 개념

에이전트는 확률적이므로 컨텍스트가 새로운 노출 지점이 됩니다(프롬프트 인젝션, 메모리 포이즈닝).
**확률적인 것은 결정적인 것으로 보호한다**는 원칙에 따라:

| 항목 | 내용 |
|------|------|
| **검사 대상** | 프롬프트 인젝션 시도, 유해 콘텐츠, 민감 데이터 노출 |
| **실행 위치** | 에이전트 코드 외부의 **Gateway 계층** → 에이전트가 우회 추론 불가 |
| **집행 방식** | 탐지는 확률적, 정책 집행은 결정적 (임곗값 기반 허용/거부) |
| 🔜 **서드파티 신호** | Check Point, Zscaler, Rubrik, Netskope, SentinelOne 등 연동 예정 |

> (상세: M03 보안 모듈 10.8, M04 모듈 10.9 참조)

---

## 강의 활용 가이드

### 시간 배분 추천

| 서비스 | 추천 시간 | 활동 |
|--------|-----------|------|
| Managed Harness | 15-20분 | CLI 데모 (실시간 생성 + 호출) |
| AgentCore CLI | 10-15분 | Inspector UI 데모 |
| Payments | 10-15분 | 개념 + 거버넌스 토론 |
| Registry | 10분 | 개념 + IDE 쿼리 데모 |
| Performance Loop | 15-20분 | Insights/Recommendations/A/B 워크스루 |
| 🆕 Web Search | 5-10분 | 개념 + Gateway 커넥터 설명 |
| 🆕 Managed Knowledge Base | 10분 | 개념 + Memory와 구분 |
| 🆕 Guardrails 통합 | 5-10분 | 개념 + Policy 연계 |

### 삽입 시점 다이어그램

```
M01 Foundations --> M02 Runtime --> M03 Security --> M04 Tools/Gateway --> M05 Memory --> M06 Observability/Eval --> M07 Wrap-up
                        |                                |                                       |
                        v                                v                                       v
            +------------------------+  +-----------------------------+  +----------------------------------+
            |🆕 Harness + CLI Intro  |  |🆕 Payments + Registry Intro  |  |🆕 Performance Loop Intro         |
            |    (15-20 min)         |  |    (15-20 min)               |  |    (15-20 min)                   |
            +------------------------+  +-----------------------------+  +----------------------------------+
```

*강의 삽입 시점: 신규 서비스를 기존 모듈 흐름에 맞춰 적절한 위치에 배치합니다.*

### 토론 주제

1. **"Harness vs 프레임워크 코드 - 경계는 어디인가?"**
   - Harness: 표준 패턴, 빠른 시작, 구성 범위 내 커스터마이징
   - 프레임워크: 복잡한 오케스트레이션, 커스텀 루프, 멀티 에이전트

2. **"에이전트가 자율적으로 결제할 때 위험 관리는?"**
   - 다중 레벨 한도, 허용 목록, 인간 승인 임곗값
   - "에이전트 신용카드"의 한도를 어떻게 설정할 것인가?

3. **"Performance Loop를 기존 CI/CD에 어떻게 통합하는가?"**
   - Batch Eval = 에이전트 버전의 통합 테스트
   - User Simulation = 에이전트 버전의 E2E 테스트
   - Optimization = 에이전트 버전의 성능 튜닝

---

## 참고 자료

| 서비스 | 문서 |
|--------|------|
| Managed Harness | [harness.html](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/harness.html) |
| Harness 시작하기 | [harness-get-started.html](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/harness-get-started.html) |
| Harness 보안 | [harness-security.html](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/harness-security.html) |
| Harness 비용 제어 | [harness-operations.html](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/harness-operations.html) |
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
| 🆕 NY Summit 2026 종합 | [top-announcements-of-the-aws-summit-in-new-york-2026](https://aws.amazon.com/blogs/aws/top-announcements-of-the-aws-summit-in-new-york-2026/) |

---

*본 문서는 교재에서 다루지 않은 AgentCore 신규 서비스를 기존 모듈과 동일한 depth로 정리한
강사용 보충 자료입니다. 코드 예시는 공식 문서 기반이며, 일부 API는 Preview 상태로 변경될 수 있습니다.*

*문서 버전: 2.1 | 작성일: 2026-05-28 | 최종 수정: 2026-06-23 | 기준: 2026년 6월 AWS Summit New York 반영*
