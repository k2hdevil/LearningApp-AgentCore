# 모듈 4: AgentCore와의 도구 통합

## Building Agentic AI with Amazon Bedrock AgentCore

---

## 목차

1. [도구 통합 패턴 개요](#1-도구-통합-패턴-개요)
2. [AgentCore 기본 제공 도구](#2-agentcore-기본-제공-도구)
3. [MCP (Model Context Protocol)](#3-mcp-model-context-protocol)
4. [MCP 서버 구현 및 호스팅](#4-mcp-서버-구현-및-호스팅)
5. [AgentCore Gateway 개요](#5-agentcore-gateway-개요)
6. [Gateway 대상 유형 및 통합 패턴](#6-gateway-대상-유형-및-통합-패턴)
7. [Gateway 인증 및 권한 부여](#7-gateway-인증-및-권한-부여)
8. [AgentCore Policy](#8-agentcore-policy)
9. [지식 확인 및 핵심 정리](#9-지식-확인-및-핵심-정리)
10. [추가 Key Points - 강사 보충 자료](#10-추가-key-points---강사-보충-자료)

> 🆕 표시: 교재(v1.0.4, 2026년 4월 빌드) 이후 추가/변경된 내용

---

## 1. 도구 통합 패턴 개요

### 도구의 두 가지 범주

에이전트가 사용하는 도구는 크게 **로컬 도구**와 **원격 도구**로 나뉩니다:

| 범주 | 유형 | 특성 |
|------|------|------|
| **로컬 도구** | 프레임워크 제공 도구 | 사전 구축된 라이브러리, 커뮤니티 테스트 완료, 신속한 개발 |
| **로컬 도구** | Runtime 정의 도구 | 사용자 지정 극대화, 내부 시스템 직접 액세스, 특정 사용 사례 최적화 |
| **원격 도구** | AgentCore Gateway 경유 | 중앙 관리, 인증 통합, 시맨틱 검색 |
| **원격 도구** | 외부 MCP 서버 | 표준 프로토콜, 독립 스케일링, 도구 공유 |

### 도구 통합 의사결정 트리

```
도구가 필요한가?
│
├── AWS 관리형 도구로 충분한가?
│   ├── 웹 탐색 필요 ──────────▶ [AgentCore Browser]
│   └── 코드 실행 필요 ─────────▶ [AgentCore Code Interpreter]
│
├── 기존 API/서비스가 있는가?
│   ├── REST API ───────────────▶ [Gateway (OpenAPI 대상)]
│   ├── Lambda 함수 ────────────▶ [Gateway (Lambda 대상)]
│   └── MCP 서버 ──────────────▶ [Gateway (MCP 서버 대상)]
│
└── 커스텀 로직이 필요한가?
    ├── 지연 시간 중요 ─────────▶ [로컬 MCP 서버 (Runtime 내)]
    └── 공유/독립 스케일링 ─────▶ [원격 MCP 서버]
```

---

## 2. AgentCore 기본 제공 도구

### AgentCore Browser

**웹 탐색 및 워크플로 자동화를 위한 서버리스 브라우저 인프라**


**작동 흐름**:
```
┌──────────────────────────┐
│ 사용자 쿼리              │
│ ("Amazon에서 신발 구매") │
└────────────┬─────────────┘
             ▼
┌──────────────────────────┐    ┌──────────────────────────────────────────┐
│        에이전트             │───▶│ LLM (지침을 명령으로 변환)               │
└────────────┬─────────────┘    └──────────────────┬───────────────────────┘
             │                                     │
             │                                     ▼
             │                  ┌──────────────────────────────────────────┐
             │                  │ 컴퓨터 도구 호출:                        │
             │                  │ {type: "click", button: "left",          │
             │                  │  x:286, y:102}                           │
             │                  └──────────────────────────────────────────┘
             ▼
┌──────────────────────────┐
│ 실행 환경                │
│ (헤드리스 브라우저)      │
└────────────┬─────────────┘
             ▼
┌──────────────────────────┐
│ 명령 실행 → 스크린샷    │
│ 캡처 → 결과 반환        │
└──────────────────────────┘
```

**AgentCore Browser 아키텍처 (관리형 인프라 + 사용자 선택 라이브러리)**:

```
┌──────────────────────────────────────────────────────────────────────────┐
│ 사용자 에이전트 코드                                                     │
│                                                                          │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────────┐       │
│  │ Playwright │ │browser-use │ │  Nova Act  │ │Puppeteer/CDP   │       │
│  │(구조적      │ │(자율         │ │(Computer   │ │직접             │       │
│  │ 제어)       │ │ 에이전트)    │ │ Use)       │ │                │       │
│  └─────┬──────┘ └─────┬──────┘ └─────┬──────┘ └───────┬────────┘       │
│        └───────────────┴───────────────┴───────────────┘                │
│                              │                                           │
│                    CDP WebSocket 연결                                     │
│                              │                                           │
└──────────────────────────────┼───────────────────────────────────────────┘
                               ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ AWS 관리형 — AgentCore Browser                                           │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │ 격리된 MicroVM (Firecracker)                                      │  │
│  │                                                                    │  │
│  │  헤드리스 Chrome 브라우저:                                         │  │
│  │  • Chrome DevTools Protocol (CDP) 엔드포인트 노출                  │  │
│  │  • Chrome Enterprise Policies (100+ 정책)                          │  │
│  │  • 브라우저 확장, 프로필, 프록시 구성                              │  │
│  │  • Custom Root CA (내부 서비스 SSL)                                │  │
│  │  • OS-Level Interaction (마우스, 키보드, 시스템 알림)              │  │
│  │                                                                    │  │
│  │  • 세션 관리 (생성/일시정지/종료)                                  │  │
│  │  • DCV 라이브 뷰 스트리밍                                          │  │
│  │  • Web Bot Auth (CAPTCHA 감소)                                     │  │
│  │  • VPC 연결 (내부 웹 앱 접근)                                      │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  관리 항목: 프로비저닝, 스케일링, 격리, 보안 패치, 관찰성               │
└──────────────────────────────────────────────────────────────────────────┘
```

**핵심 특성**:
- 엔터프라이즈급 보안 (격리된 환경)
- 서버리스 인프라 (관리 불필요)
- 기업 관찰성 통합
- Browser-use, Playwright, Nova Act 등 CDP 호환 라이브러리 연결 지원

**지원 라이브러리 비교**:

| 구분 | Playwright | Browser Use | Nova Act |
|------|-----------|-------------|----------|
| **제공사** | Microsoft (오픈소스) | Browser Use Inc. (오픈소스) | Amazon (AWS) |
| **설계 철학** | 결정론적 — 코드로 정확한 액션 지정 | 자율적 — 자연어 목표를 주면 에이전트가 단계 결정 | Computer Use — 스크린샷 기반 시각적 제어 |
| **동작 방식** | 접근성 트리/DOM 셀렉터 기반 명령 실행 | LLM 추론 루프: 페이지 관찰 → 다음 액션 결정 → 실행 → 재평가 | 화면 캡처 → 좌표 기반 클릭/입력 |
| **언어** | TypeScript, Python | Python | Python |
| **적합한 경우** | 반복 가능한 자동화, 테스트, 스크래핑 | 복잡한 다단계 목표, 동적 UI 탐색 | 시각적 인터페이스 조작, API 없는 레거시 앱 |
| **신뢰성** | 높음 (결정론적 실행) | 중간 (LLM 추론 의존) | 중간 (시각 인식 정확도 의존) |
| **토큰 효율** | 높음 (구조화된 스냅샷) | 낮음 (DOM + 스크린샷 병용) | 낮음 (스크린샷 이미지 토큰) |
| **MCP 지원** | 네이티브 MCP 서버 제공 | 커스텀 래핑 필요 | SDK 직접 호출 |

### AgentCore Code Interpreter

**격리된 환경에서 안전하게 코드 작성 및 실행**

**작동 흐름**:
```
┌──────────────┐    ┌──────────┐    ┌──────────────────────────────────┐
│ 사용자 쿼리     │───▶│ 에이전트   │───▶│ LLM (도구 선택)                    │
└──────────────┘    └────┬─────┘    └──────────────────────────────────┘
                         │
                         ▼
              ┌─────────────────────────────────┐
              │ Code Interpreter 세션 생성       │
              │  ┌────────────────────────────┐ │
              │  │ 쉘 (코드 실행)             │ │
              │  │ 파일 시스템 (데이터 저장)  │ │
              │  │ Observability (원격 측정)  │ │
              │  └────────────────────────────┘ │
              └──────────────┬──────────────────┘
                             ▼
              ┌─────────────────────────────────┐
              │ 도구 결과 반환 → 에이전트       │
              └─────────────────────────────────┘
```

**핵심 특성**:
- **보안 코드 실행**: 분리된 샌드박스, VPC 통해 내부 데이터 소스 접근
- **대규모 데이터 처리**: S3 통합, 기가바이트급 데이터셋 처리
- **사용 편의성**: Python, 🆕 JavaScript/TypeScript 사전 구축 런타임

🆕 **최신 업데이트**:
- **Node.js 런타임**: JavaScript/TypeScript 실행 지원
- **Custom Root CA**: 내부 서비스 연결용 조직 인증서
- **LangChain Deep Agents 통합**: LangChain 공식 AWS 네이티브 샌드박스

**AgentCore Code Interpreter vs 비관리형 코드 실행 샌드박스 비교**:

| 구분 | AgentCore Code Interpreter | E2B (Self-host) | Daytona | Lambda MicroVMs |
|------|---------------------------|-----------------|---------|-----------------|
| **제공 형태** | AWS 완전관리형 서비스 | 오픈소스, 자체 호스팅 | 오픈소스, 자체 호스팅 | AWS 서비스 (직접 구성) |
| **격리 기술** | MicroVM (Firecracker) | MicroVM (Firecracker) | gVisor (유저스페이스 커널) | MicroVM (Firecracker) |
| **접근 방식** | AWS 전용 API (CreateSession → ExecuteCode) | REST API + SDK (Python/JS) | REST API + SDK (Python/TS/Go/Java/Ruby) | HTTPS URL (HTTP/2, gRPC, WebSocket) |
| **지원 언어** | Python, JavaScript/TypeScript | 모든 언어 (커스텀 템플릿) | 모든 언어 (Docker 이미지) | 모든 언어 (Dockerfile 기반) |
| **세션 지속** | API 호출 간 상태 유지 | 샌드박스 수명 동안 유지 | 샌드박스 수명 동안 유지 | 최대 8시간, 일시정지/재개 가능 |
| **S3 통합** | 네이티브 (기가바이트급 데이터셋) | 사용자 구현 필요 | 사용자 구현 필요 | 사용자 구현 필요 |
| **VPC 연결** | 네이티브 지원 | EC2 배포 시 VPC 내 | EKS 배포 시 VPC 내 | 네이티브 지원 |
| **관찰성** | CloudWatch/X-Ray 자동 통합 | 직접 구축 | 직접 구축 | CloudWatch 통합 |
| **인프라 관리** | 불필요 (서버리스) | EC2 베어메탈 + Nomad/Consul 운영 | EKS 클러스터 운영 | 최소 (Dockerfile만 제공) |
| **커스터마이징** | 제한적 (사전 빌드 런타임) | 높음 (커스텀 Dockerfile) | 높음 (커스텀 Docker 이미지) | 높음 (Dockerfile 자유 구성) |
| **GPU 지원** | 미지원 | 미지원 (CPU만) | 지원 | 미지원 |
| **비용 모델** | 실행 시간 기반 종량제 | EC2 인스턴스 비용 | EKS/EC2 인스턴스 비용 | 실행 시간 기반 종량제 |
| **AWS 배포 위치** | — (관리형) | EC2 베어메탈 (KVM 필요) | EKS 또는 EC2 | Lambda |

**선택 가이드**:

```
코드 실행 샌드박스가 필요한가?
├── 빠른 시작, 운영 부담 최소화 → AgentCore Code Interpreter
├── 커스텀 런타임/패키지 필요 (Go, Rust, GPU 등)
│   ├── Kubernetes 운영 가능 → Daytona (EKS)
│   ├── VM 레벨 격리 필수 → E2B self-host (EC2 베어메탈)
│   └── 서버리스 + 상태 유지 → Lambda MicroVMs
└── 기존 AgentCore Runtime 내에서 실행 → Runtime 정의 도구 (로컬)
```

---

## 3. MCP (Model Context Protocol)

### MCP란?

LLM이 도구 및 데이터에 액세스할 수 있는 **개방형 표준 프로토콜**입니다.

**핵심 가치**:
- 시스템 전체의 유연한 플러그 앤 플레이 통합
- AWS는 MCP를 지원하여 에이전트 상호 운용성 개선
- 프레임워크 독립적 도구 통합

### MCP 아키텍처

```
┌──────────────────────────────────────────────────────────────────────────┐
│ 애플리케이션 호스트 프로세스                                              │
│                                                                          │
│  ┌─────────────────────────────────────┐                                 │
│  │ 호스트 (앱, LLM, IDE 등)              │                                 │
│  │                                     │                                 │
│  │  ┌───────────────┐ ┌─────────────┐ │                                 │
│  │  │MCP 클라이언트1   │ │MCP 클라이언트  │ │                                 │
│  │  └───────┬───────┘ │     2       │ │                                 │
│  │          │          └──────┬──────┘ │                                 │
│  └──────────┼─────────────────┼────────┘                                 │
│             │                 │                                           │
└─────────────┼─────────────────┼──────────────────────────────────────────┘
              │                 │
              ▼                 ▼
┌─────────────────────┐  ┌─────────────────────┐
│    MCP 서버 1       │  │    MCP 서버 2       │
│  • 리소스           │  │  • 리소스           │
│  • 도구             │  │  • 도구             │
│  • 프롬프트         │  │  • 프롬프트         │
└──────────┬──────────┘  └──────────┬──────────┘
           │                        │
           ▼                        ▼
┌──────────────────┐     ┌──────────────────┐
│ 원격 리소스 A       │     │ 원격 리소스 B    │
└──────────────────┘     └──────────────────┘
```

### MCP 서버의 3가지 구성 요소

| 구성 요소 | 역할 |
|-----------|------|
| **리소스 (Resources)** | 에이전트가 읽을 수 있는 데이터 (파일, DB 레코드 등) |
| **도구 (Tools)** | 에이전트가 호출할 수 있는 함수/액션 |
| **프롬프트 (Prompts)** | 재사용 가능한 프롬프트 템플릿 |

---

## 4. MCP 서버 구현 및 호스팅

### MCP 서버 생성 (Python)

```python
from mcp.server.fastmcp import FastMCP

# MCP 서버 인스턴스 생성 (Streamable HTTP, 상태 비저장)
mcp = FastMCP("OrderService", stateless_http=True, json_response=True)

# 조회할 데이터를 리소스로 선언
@mcp.resource("config://settings")
def get_settings() -> str:
    """애플리케이션 설정을 조회해서 JSON으로 반환"""
    return '{"currency": "KRW", "timezone": "Asia/Seoul", "max_results": 50}'


@mcp.resource("orders://{order_id}")
def get_order(order_id: str) -> str:
    """주문 ID로 주문 정보를 조회"""
    # 실제로는 DB 조회
    return f'{{"order_id": "{order_id}", "status": "shipped", "amount": 45000}}'


# 에이전트가 처리할 수 있는 도구 선언
@mcp.tool()
def calculate_shipping(weight_kg: float, destination: str) -> dict:
    """배송비를 계산합니다"""
    rates = {"domestic": 3000, "international": 15000}
    base = rates.get(destination, rates["international"])
    return {"cost": base + (weight_kg * 500), "currency": "KRW", "destination": destination}


@mcp.tool()
def cancel_order(order_id: str, reason: str) -> str:
    """주문을 취소합니다"""
    # 실제로는 DB 업데이트 + 알림 발송
    return f"주문 {order_id} 취소 완료. 사유: {reason}"


# 재사용 가능한 프롬프트 템플릿 선언
@mcp.prompt()
def customer_support(issue: str, tone: str = "professional") -> str:
    """고객 지원 응답을 생성하는 프롬프트 템플릿"""
    tones = {
        "professional": "정중하고 전문적인 어조로",
        "friendly": "친근하고 따뜻한 어조로",
        "concise": "간결하고 핵심만 전달하는 어조로",
    }
    style = tones.get(tone, tones["professional"])
    return f"{style} 다음 고객 문의에 응답하세요: {issue}"


@mcp.prompt()
def order_summary(order_id: str) -> str:
    """주문 요약 보고서를 생성하는 프롬프트 템플릿"""
    return f"주문 {order_id}의 상태, 배송 추적, 예상 도착일을 요약하세요."


# 서버 실행
if __name__ == "__main__":
    mcp.run(transport="streamable-http")
```

### MCP 클라이언트 생성 (Python)

```python
import asyncio
from mcp import ClientSession
from mcp.client.streamable_http import streamable_http_client


async def main():
    mcp_url = "http://localhost:8000/mcp"

    async with streamable_http_client(mcp_url) as (read_stream, write_stream, _):
        async with ClientSession(read_stream, write_stream) as session:
            # 연결 초기화
            await session.initialize()

            # ─── 리소스 조회 ───
            resources = await session.list_resources()
            print(f"사용 가능한 리소스: {[r.uri for r in resources.resources]}")

            # 특정 리소스 읽기
            order_data = await session.read_resource("orders://ORD-12345")
            print(f"주문 정보: {order_data.contents[0].text}")

            # ─── 도구 나열 및 호출 ───
            tools = await session.list_tools()
            print(f"사용 가능한 도구: {[t.name for t in tools.tools]}")

            # 배송비 계산 도구 호출
            result = await session.call_tool(
                "calculate_shipping",
                arguments={"weight_kg": 2.5, "destination": "domestic"}
            )
            print(f"배송비: {result.structuredContent}")

            # 주문 취소 도구 호출
            result = await session.call_tool(
                "cancel_order",
                arguments={"order_id": "ORD-12345", "reason": "고객 요청"}
            )
            print(f"취소 결과: {result.content[0].text}")

            # ─── 프롬프트 나열 및 조회 ───
            prompts = await session.list_prompts()
            print(f"사용 가능한 프롬프트: {[p.name for p in prompts.prompts]}")

            # 프롬프트 템플릿 가져오기
            prompt = await session.get_prompt(
                "customer_support",
                arguments={"issue": "배송이 3일 지연됨", "tone": "friendly"}
            )
            print(f"생성된 프롬프트: {prompt.messages[0].content.text}")

# 스크립트의 최상위 레벨에서 직접 실행하는데 사용
asyncio.run(main())
```
### MCP 서버 호스팅 전략

| 방식 | 장점 | 적합한 경우 |
|------|------|------------|
| **로컬 호스팅** (에이전트와 같은 Runtime) | • 도구 실행 지연 시간 최소화<br>• 관리 오버헤드 감소<br>• 보안 강화를 위한 프로세스 격리 | 빈번한 호출, 낮은 지연 필요 |
| **원격 호스팅** (별도 Runtime) | • 서버 리소스의 독립적 스케일링<br>• 여러 에이전트 간 도구 공유<br>• 스택 유연성 및 전문화 | 공유 도구, 독립 배포 |

```
┌──────────────────────────────────────────────────────────────────────┐
│ 로컬 호스팅                         │ 원격 호스팅                    │
│                                     │                                │
│  ┌────────────────────────────────┐ │ ┌──────────────┐ ┌──────────┐ │
│  │          Runtime               │ │ │   Runtime    │ │ Runtime  │ │
│  │  ┌──────────┐ ┌────────────┐   │ │ │ ┌──────────┐│ │┌────────┐│ │
│  │  │ 에이전트   │ │ MCP 서버     │  │ │ │ │ 에이전트    ││ ││MCP 서버││ │
│  │  └──────────┘ └────────────┘  │ │ │  └──────────┘│ │└────────┘│ │
│  └────────────────────────────────┘ │ └──────────────┘ └──────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

🆕 **Stateful MCP 지원 (2026년 3월)**: Runtime에서 호스팅되는 MCP 서버가 세션 컨텍스트를 유지하여 다음 고급 기능 사용 가능:
- **Elicitation**: 워크플로 중간에 사용자 입력 수집
- **Sampling**: 도구 실행 중 서버가 LLM 호출 요청
- **Progress Notifications**: 장시간 작업의 실시간 진행 상황 전달

---

## 5. AgentCore Gateway 개요

### AgentCore Gateway란?

에이전트가 다양한 도구 및 서비스와 상호 작용할 수 있는 **중앙 액세스 포인트**입니다.

### AgentCore Gateway의 4가지 핵심 기능

| 기능 | 설명 |
|------|------|
| **통합 도구 액세스** | 다양한 도구/서비스에 대한 중앙 액세스 포인트. 자연어 쿼리를 사용한 도구 검색 |
| **인증 처리** | Amazon Cognito OAuth, IAM 등을 통한 인바운드/아웃바운드 인증 관리 |
| **프로토콜 지원** | MCP(Model Context Protocol) 구현으로 에이전트-도구 표준 통신 |
| **여러 대상 유형** | Lambda 함수, REST API, MCP 서버 등 다양한 백엔드 통합 |

### Gateway의 비관리형(Self-Managed) 대안

AgentCore Gateway를 사용하지 않고 동일한 MCP 프록시 기능을 자체 구축할 수 있는 오픈소스 옵션:

| 옵션 | 제공 | 라이선스 | 핵심 특징 |
|------|------|---------|-----------|
| **Envoy AI Gateway** | Tetrate 주도 (CNCF Envoy Gateway 기반) | Apache-2.0 | Envoy Proxy 기반, MCP 네이티브 프록시, v1.0 GA (2026.06.23) |
| **AgentGateway** | Solo.io → Linux Foundation 기부 | Apache-2.0 | Rust 구현, MCP + A2A + LLM + REST/gRPC 통합, K8s Gateway API 호환 |
| **Kong AI/MCP Gateway** | Kong Inc. | Apache-2.0 (CE) | AI MCP Proxy 플러그인으로 REST API를 MCP 도구로 자동 변환, A2A Proxy 플러그인 |
| **Bifrost** | Maxim AI (maximhq) | Apache-2.0 | Go 단일 바이너리, 11μs 지연, MCP 게이트웨이 + LLM 라우팅 통합 |
| **DIY** | — | — | API Gateway + Cognito + Lambda + FastMCP 서버 조합 |

**AWS 배포 방법**:

| 옵션 | AWS 배포 대상 | 구성 |
|------|-------------|------|
| **Envoy AI Gateway** | EKS | Helm 차트 배포, Kubernetes Gateway API 리소스로 MCP 라우트 정의 |
| **AgentGateway** | EKS | Helm 차트 배포, CRD로 MCP 서버·LLM 프로바이더·A2A 에이전트 등록 |
| **Kong AI/MCP** | EKS / ECS / EC2 | Kong 컨테이너 배포 후 AI MCP Proxy 플러그인 활성화, OpenAPI 스키마 등록 |
| **Bifrost** | EC2 / ECS | 단일 바이너리 실행 또는 Docker 컨테이너, YAML 설정 파일로 MCP 서버 등록 |
| **DIY** | API Gateway + Lambda | API Gateway에서 MCP 엔드포인트 구성, Lambda Authorizer로 인증, 각 도구를 Lambda로 구현 |

**AgentCore Gateway vs 비관리형 비교**:

| 기능 | AgentCore Gateway | 비관리형 (Envoy/AgentGW/Kong/Bifrost) |
|------|-------------------|--------------------------------------|
| **MCP 프록시** | ✅ 관리형 | ✅ 자체 운영 |
| **REST→MCP 자동 변환** | ✅ (OpenAPI 대상) | Kong만 지원 (AI MCP Proxy 플러그인) |
| **Lambda 대상** | ✅ 네이티브 | ❌ (DIY로 API GW+Lambda 조합 필요) |
| **시맨틱 도구 검색** | ✅ 내장 | ❌ (OpenSearch + 임베딩 모델 자체 구축 필요) |
| **Cedar 정책 엔진** | ✅ 내장 | ❌ (OPA 등 별도 정책 엔진 연동 필요) |
| **인바운드 인증** | ✅ JWT/Cognito/IAM | ✅ (자체 구성) |
| **아웃바운드 인증** | ✅ (AgentCore Identity 연동) | 직접 구현 (OAuth 토큰 관리 로직) |
| **3LO (사용자별 토큰)** | ✅ GA | 직접 구현 |
| **A2A 프로토콜** | ✅ (Runtime + Gateway) | AgentGateway, Kong 지원 (Envoy AI GW는 미지원) |
| **인프라 관리** | 없음 (서버리스) | EKS/ECS/EC2 운영 필요 |
| **비용** | 요청 기반 종량제 | 인스턴스/클러스터 비용 |

> **선택 기준**: 시맨틱 검색·Cedar 정책·Lambda 대상·아웃바운드 인증 자동화가 필요하면
> AgentCore Gateway가 유리합니다. 이미 Kubernetes 기반 인프라가 있고 완전한 인프라 제어권이
> 필요하거나, 멀티클라우드/온프레미스 환경에서 운영해야 하면 비관리형 옵션이 적합합니다.




### AgentCore Gateway 아키텍처

```
┌──────────┐    ┌──────────────┐    ┌──────────────────────────────────┐
│ 에이전트 │───▶│ MCP 클라이언트│───▶│       AgentCore Gateway (/mcp)   │
└──────────┘    └──────────────┘    └───────┬────────┬────────┬────────┘
                                            │        │        │
                                            ▼        ▼        ▼
                                   ┌────────────┐┌────────┐┌──────────┐
                                   │API 엔드포인││Lambda  ││MCP 서버  │
                                   │트 대상     ││대상    ││대상      │
                                   │            ││        ││          │
                                   │OpenAPI     ││Lambda  ││MCP 서버  │
                                   │스키마      ││함수    ││도구1,2,3 │
                                   │RESTful     ││도구    ││          │
                                   │서비스      ││1,2,3   ││          │
                                   └────────────┘└────────┘└──────────┘

  기능: 도구 나열 | 도구 간접 호출 | 시맨틱 검색
```

### 도구 검색(Discovery) 방식

에이전트가 Gateway에서 적절한 도구를 찾는 방법은 3가지입니다.

| 방식 | 메서드/메커니즘 | 동작 | 적합한 경우 |
|------|---------------|------|------------|
| **1. 전체 나열** | `tools/list` (MCP 표준) | 등록된 모든 도구의 이름·설명·스키마를 반환 | 도구 수십 개 이하 |
| **2. 시맨틱 검색** | `x_amz_bedrock_agentcore_search` (Gateway 내장 도구) | 자연어 의도를 임베딩 → 도구 설명과 유사도 비교 → 상위 N개 반환 | 도구 수백~수천 개 |
| **3. LLM 자체 선택** | 프레임워크 레벨 (Strands, LangChain 등) | 나열/검색 결과를 LLM 프롬프트에 포함 → LLM이 최종 도구 선택 | 항상 (최종 단계) |

**프로덕션 조합 패턴**:

```
┌──────────────────────────────────────────────────────────────────────┐
│ 도구 수가 적을 때 (≤30개)                                            │
│                                                                      │
│   tools/list (전체 나열) ───▶ LLM이 전체 목록에서 선택               │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│ 도구 수가 많을 때 (300개+)                                           │
│                                                                      │
│   시맨틱 검색 ───▶ 관련 도구 10개만 ───▶ LLM이 10개 중 선택         │
│   (자연어 의도)     필터링                                           │
└──────────────────────────────────────────────────────────────────────┘
```

### 시맨틱 검색 상세

Gateway는 수백 개의 도구 중에서 관련 도구를 자동으로 찾아줍니다:

```
전체 나열만 사용: 300개 이상의 도구를 모두 반환 → LLM 컨텍스트 초과 위험
시맨틱 검색 사용: "소셜 미디어 게시물 생성" → 상위 10개 관련 도구만 반환
```

**시맨틱 검색의 핵심 가치**:
- 에이전트가 사전에 도구 목록을 몰라도 됨 — 새 도구 등록 시 설명만으로 자동 검색 대상
- N×M 문제 해결 — 수백 개 도구를 매번 LLM에 주입하지 않고 관련 도구만 선별
- 토큰 효율 — 불필요한 도구 정의를 LLM 컨텍스트에서 제외

---

## 6. Gateway 대상 유형 및 통합 패턴

### 대상 유형별 비교

| 대상 유형 | 설명 | 적합한 경우 |
|-----------|------|------------|
| **REST API (OpenAPI)** | OpenAPI 스키마로 기존 REST 서비스 노출 | 기존 API가 있는 경우 |
| **Lambda 함수** | 사용자 지정 비즈니스 로직 실행 | 커스텀 도구 구현 |
| **MCP 서버** | 전용 MCP 서버 연결 | 이미 MCP 서버가 있는 경우 |
| 🆕 **Smithy 대상** | Smithy IDL(Interface Definition Language) 기반 | AWS 서비스 및 Smithy로 정의된 내부 서비스 |


### Lambda 대상 - 이벤트 객체 구조

Lambda 함수를 Gateway 도구로 사용할 때, Gateway는 에이전트의 MCP 도구 호출을 Lambda 이벤트 객체로 변환하여 전달합니다.

**Lambda 대상 호출 흐름**:

```
┌──────────┐    ┌─────────────────┐    ┌──────────────┐    ┌──────────────┐
│ /mcp     │───▶│AgentCore Gateway│───▶│   IAM 역할   │───▶│  AWS Lambda  │
└──────────┘    └─────────────────┘    └──────────────┘    └──────────────┘
                        │
                        ▼
                ┌─────────────────────────────────────────┐
                │ 도구 스키마                              │
                │ (이벤트 객체는 도구 스키마와 일치해야 함)│
                └─────────────────────────────────────────┘

  Lambda 이벤트 객체: 에이전트가 전달한 파라미터

  Lambda 컨텍스트 사용자 지정 객체 (Gateway 메타):
  • bedrockAgentCoreMessageVersion
  • bedrockAgentCoreAwsRequestId
  • bedrockAgentCoreMcpMessageId
  • bedrockAgentCoreGatewayId
  • bedrockAgentCoreTargetId
  • bedrockAgentCoreToolName
```

- **도구 스키마**: Gateway에 Lambda 대상을 등록할 때 정의하는 도구 입력 파라미터 명세
- **Lambda 이벤트 객체**: 에이전트가 전달한 파라미터 (스키마에 정의된 필드)
- **Lambda 컨텍스트 사용자 지정 객체**: Gateway가 자동으로 주입하는 메타데이터 (추적, 라우팅 정보)

**"도구 스키마와 일치해야 함"의 의미**:
- Gateway에 Lambda 대상을 등록할 때 **도구 스키마(Tool Schema)**를 함께 정의합니다
- 이 스키마가 "이 Lambda는 어떤 도구이고, 어떤 입력 파라미터를 받는가"를 선언합니다
- 에이전트가 도구를 호출하면, Gateway는 스키마에 정의된 파라미터를 이벤트 객체에 포함하여 Lambda를 invoke합니다
- Lambda 함수 코드는 이 스키마에 맞춰 이벤트를 파싱해야 합니다

```
1. 도구 스키마 등록 (Gateway 설정 시):
   {
     "name": "get_order_status",
     "description": "주문 상태를 조회합니다",
     "inputSchema": {
       "type": "object",
       "properties": {
         "orderId": {"type": "string", "description": "주문 ID"},
         "includeHistory": {"type": "boolean", "description": "이력 포함 여부"}
       },
       "required": ["orderId"]
     }
   }

2. 에이전트가 도구 호출:
   tools/call → "get_order_status" {"orderId": "ORD-123", "includeHistory": true}

3. Gateway가 Lambda에 전달하는 이벤트 객체:
   {
     "orderId": "ORD-123",                          ← 스키마에 정의된 파라미터
     "includeHistory": true,                         ← 스키마에 정의된 파라미터
     "bedrockAgentCoreToolName": "get_order_status", ← Gateway 메타데이터
     "bedrockAgentCoreMessageVersion": "1.0",
     "bedrockAgentCoreAwsRequestId": "abc-123",
     "bedrockAgentCoreMcpMessageId": "msg-456",
     "bedrockAgentCoreGatewayId": "gw-789",
     "bedrockAgentCoreTargetId": "target-012"
   }
```

> **핵심**: Lambda 함수는 "일반 Lambda"를 그대로 사용하는 것이 아니라,
> Gateway가 주입하는 메타데이터 필드(`bedrockAgentCore*`)를 이해하고
> 도구 스키마에 맞는 파라미터를 이벤트에서 추출하도록 작성해야 합니다.

### OpenAPI / MCP 서버 대상 통합 흐름

OpenAPI REST API 또는 외부 MCP 서버를 AgentCore Gateway와 통합할 때의 전체 인증 흐름:

```
┌──────────────┐                    ┌─────────────────────────────────────┐
│   에이전트     │                    │         인바운드 인증                │
│ ┌──────────┐ │     /mcp          │  ┌─────────┐  ┌───────────┐        │
│ │MCP       │─┼───────────────────▶  │ AWS IAM │  │OAuth 토큰  │        │
│ │클라이언트   │ │                   │  └─────────┘  └───────────┘        │
│ └──────────┘ │                    └──────────────────┬──────────────────┘
└──────────────┘                                       │
                                                       ▼
                                        ┌──────────────────────────┐
                                        │    AgentCore Gateway     │
                                        └──────────┬───────────────┘
                                                   │
                                                   ▼
                                ┌───────────────────────────────────────────┐
                                │            아웃바운드 인증                 │
                                │                                           │
                                │  ┌─────────────────────────────────────┐ │
                                │  │       AgentCore Identity             │ │
                                │  │  • 보안 토큰 저장소                  │ │
                                │  │  • 토큰 캐싱                         │ │
                                │  │  • 워크로드 자격 증명                │ │
                                │  │  • OAuth2 권한 부여자                │ │
                                │  │  • 리소스 자격 증명 공급자           │ │
                                │  └──────────┬──────────────────────────┘ │
                                │             │     자격 증명 공급자       │
                                └─────────────┼───────────┬────────────────┘
                                              │           │
                                              ▼           ▼
                                ┌──────────────────┐  ┌────────────────────┐
                                │ MCP 서버 대상    │  │ OpenAPI 대상       │
                                │ (도구1, 2, 3)    │  │ (REST API 서비스)  │
                                │ ← 토큰           │  │ ← API키/토큰      │
                                └──────────────────┘  └────────────────────┘
```

**흐름 설명**:

| 단계 | 동작 |
|------|------|
| ① 인바운드 인증 | 에이전트가 AWS IAM(SigV4) 또는 OAuth 토큰으로 Gateway에 접근 |
| ② Gateway 수신 | MCP 프로토콜로 도구 나열/호출/검색 요청 처리 |
| ③ 아웃바운드 인증 | AgentCore Identity가 대상 서비스 호출에 필요한 자격 증명 제공 |
| ④ 대상 호출 | MCP 서버는 토큰 포함하여 호출, OpenAPI 대상은 API 키/OAuth 토큰으로 호출 |
| ⑤ 결과 반환 | 대상 서비스의 응답을 MCP 형식으로 변환하여 에이전트에 전달 |


### Gateway 생성 및 사용 워크플로

```
1단계: Gateway 생성
       → 이름, 설명, 인바운드 인증 구성

2단계: Gateway 대상 생성
       → 이름, 설명, API 사양, 자격 증명 공급자 구성

3단계: 도구 나열 및 간접 호출
       → 에이전트 프레임워크, 인스펙터 또는 코딩 IDE 사용
```

**1단계: Gateway 생성 (Cognito 인바운드 인증)**:

```python
import boto3
import json

# boto3 클라이언트 초기화
client = boto3.client("bedrock-agentcore-control", region_name="us-east-1")

# Gateway 생성 — Cognito를 인바운드 인증으로 사용
gateway = client.create_gateway(
    name="MyAgentGateway",
    # MCP 프로토콜로 에이전트와 통신
    protocolType="MCP",
    # JWT 토큰 기반 인증 (Cognito에서 발급한 토큰 검증)
    authorizerType="CUSTOM_JWT",
    authorizerConfiguration={
        "customJWTAuthorizer": {
            # Cognito User Pool의 OIDC Discovery URL — Gateway가 토큰 서명 검증에 사용
            "discoveryUrl": "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_XXXXXXX/.well-known/openid-configuration",
            # 허용할 Cognito App Client ID — 이 클라이언트에서 발급된 토큰만 통과
            "allowedClients": ["your-cognito-app-client-id"],
            # 허용할 OAuth 스코프 — 토큰에 이 스코프가 포함되어야 접근 가능
            "allowedScopes": ["openai-tools/invoke"]
        }
    },
    # Gateway가 Lambda/API 등 대상을 호출할 때 사용하는 IAM 역할
    # 이 역할의 신뢰 정책에 bedrock-agentcore.amazonaws.com 이 포함되어야 함
    roleArn="arn:aws:iam::123456789012:role/AgentCoreGatewayRole",
    # 시맨틱 검색 활성화 — 수백 개 도구 중 자연어로 관련 도구 자동 탐색
    protocolConfiguration={
        "mcp": {
            "searchType": "SEMANTIC"
        }
    }
)

print(f"Gateway URL: {gateway['gatewayUrl']}")
print(f"Gateway ID: {gateway['gatewayId']}")
```

**2단계: Gateway 대상 생성 (OpenAPI — OpenAI Chat Completions API 예시)**:

```python
# OpenAI API를 MCP 도구로 노출하는 OpenAPI 스키마 정의
openai_spec = {
    "openapi": "3.0.0",
    "info": {"title": "OpenAI Chat API", "version": "1.0.0"},
    # 대상 서비스의 베이스 URL — Gateway가 이 URL로 HTTP 요청을 전달
    "servers": [{"url": "https://api.openai.com/v1"}],
    "paths": {
        "/chat/completions": {
            "post": {
                # operationId가 MCP 도구 이름으로 변환됨
                "operationId": "createChatCompletion",
                # description이 시맨틱 검색 시 매칭에 사용됨
                "summary": "OpenAI Chat Completions API를 호출하여 텍스트를 생성합니다",
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
                                        "description": "사용할 모델 ID (예: gpt-4o)"
                                    },
                                    "messages": {
                                        "type": "array",
                                        "description": "대화 메시지 배열",
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
                        "description": "생성된 응답",
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

# OpenAI API 대상 생성 — API 키를 Authorization 헤더로 자동 주입
target = client.create_gateway_target(
    # 위에서 생성한 Gateway에 대상 연결
    gatewayIdentifier=gateway["gatewayId"],
    name="OpenAI-ChatCompletions",
    description="OpenAI Chat Completions API를 MCP 도구로 노출",
    # 대상 구성: OpenAPI 스키마를 인라인으로 전달
    targetConfiguration={
        "mcp": {
            "openApiSchema": {
                # 스키마를 JSON 문자열로 변환하여 전달 (S3 URI도 사용 가능)
                "inlinePayload": json.dumps(openai_spec)
            }
        }
    },
    # 아웃바운드 인증 구성: Gateway가 OpenAI API 호출 시 자동으로 API 키 주입
    credentialProviderConfigurations=[
        {
            # API_KEY 유형 — 고정 키를 헤더/쿼리에 주입하는 방식
            "credentialProviderType": "API_KEY",
            "credentialProvider": {
                "apiKeyCredentialProvider": {
                    # AgentCore Identity에 사전 등록한 자격 증명 공급자의 ARN
                    "providerArn": "arn:aws:bedrock-agentcore:us-east-1:123456789012:credential-provider/openai-key",
                    # API 키를 HTTP 헤더에 삽입 (QUERY_PARAMETER도 가능)
                    "credentialLocation": "HEADER",
                    # 헤더 이름: Authorization
                    "credentialParameterName": "Authorization",
                    # 헤더 값 앞에 "Bearer " 접두사 추가 → "Bearer sk-xxxxx"
                    "credentialPrefix": "Bearer"
                }
            }
        }
    ]
)

print(f"Target ID: {target['targetId']}")
print(f"Target Name: {target['name']}")
```

> **참고**: 위 코드는 [AgentCore Starter Toolkit 공식 가이드](https://aws.github.io/bedrock-agentcore-starter-toolkit/user-guide/gateway/quickstart.md)와
> [Boto3 create_gateway API](https://docs.aws.amazon.com/boto3/latest/reference/services/bedrock-agentcore-control/client/create_gateway.html),
> [create_gateway_target API](https://docs.aws.amazon.com/boto3/latest/reference/services/bedrock-agentcore-control/client/create_gateway_target.html)를
> 기반으로 작성되었습니다.

### Gateway 도구 호출 코드 예시

**도구 나열**:
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

**시맨틱 검색**:
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

**도구 호출**:
```python
result = call_tool(
    gateway_url, 
    access_token, 
    "openapi-target-1___get_orders_byId",  # <TargetId>___<ToolName>
    {"orderId": "ORD-12345-67890", "customerId": "CUST-98765"}
)
```

---

## 7. Gateway 인증 및 권한 부여

### 인바운드 인증

| 방식 | 설명 |
|------|------|
| **JWT 기반 (OAuth 2.0)** | 사용자 지정 가능한 권한 부여자, JWT 클레임 검증 |
| **Amazon Cognito 클라이언트 자격 증명** | 머신 간 인증, `/oauth2/token` 엔드포인트 |
| **AWS IAM** | SigV4 서명 기반 |

### 아웃바운드 인증

| 방식 | 대상 |
|------|------|
| **AWS IAM** | Lambda 함수 호출 |
| **API 키** | 외부 REST API |
| **OAuth 토큰** | 서드파티 서비스 (AgentCore Identity 연동) |

### 인증 흐름 상세 (MCP 서버 대상)

```
1. 에이전트 → Gateway: invokeTool(getOrder())
2. Gateway → AgentCore Identity: getToken (아웃바운드 인증)
3. AgentCore Identity → Gateway: OAuth 토큰 반환
4. Gateway → MCP 서버: 초기화 + 도구 호출 (토큰 포함)
5. MCP 서버 → Gateway: 결과 반환
6. Gateway → 에이전트: 도구 결과 반환
```

🆕 **최신 인증 업데이트**:
- **3LO GA**: 사용자별 토큰으로 외부 서비스의 사용자 고유 데이터 접근
- **VPC Egress**: 고객 VPC 내 프라이빗 MCP 서버(EKS 호스팅 등) 접근
- **Custom Header Passthrough**: 임의 커스텀 헤더를 에이전트로 전달 (인증 토큰, 웹훅 서명 등)

---

## 8. AgentCore Policy

### 에이전트에 경계가 필요한 이유

| 위험 | 설명 |
|------|------|
| **예측할 수 없는 런타임 동작** | 에이전트가 설계 당시 예측하지 못한 결과를 생성 |
| **권한 남용** | 의도한 범위를 벗어난 조치 (예: 고액 거래 실행) |
| **비즈니스 규칙 미준수** | 규정 준수 제약 조건을 위반하는 조치 |
| **데이터 노출** | 개인 정보 유출 또는 승인 범위 외 민감 데이터 접근 |

### AgentCore Policy 아키텍처

```
┌────────────────────────┐    ┌──────────────────────────────────────────┐
│ 에이전트/MCP 클라이언트     │───▶│          AgentCore Policy                │
└────────────────────────┘    │                                          │
                              │  • 정책 수명 주기                        │
  ┌────────────────────┐     │  • NL2Cedar 변환                         │
  │ 정책 관리자           │────▶│  • 동적 정책 평가                        │
  │ (정책 작성/관리)      │     │  • 허용/거부 결정                        │
  └────────────────────┘     └──────────┬────────────────┬──────────────┘
                                        │                │
                                        ▼                ▼
                              ┌──────────────────┐  ┌────────────────────┐
                              │ 허용 → Gateway    │  │ 거부 →             │
                              │ → 도구/API/시스템│  │  │ Observability      │
                              └──────────────────┘  │ (감사 로그)        │
                                                    └────────────────────┘
```

### Cedar 정책 언어

자연어를 Cedar 정책으로 변환 (NL2Cedar):

**자연어**: "재무 부서 사용자에 한해 1,000달러 미만 환급을 허용하십시오."

**Cedar 정책**:
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

| 요소 | 설명 |
|------|------|
| **효과 (Effect)** | `permit` 또는 `forbid` |
| **범위 (Scope)** | principal, action, resource |
| **조건 (Condition)** | `when` 절로 세부 조건 지정 |


### Policy 엔진 구성 코드

**정책 추가**:
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

**Policy 엔진으로 Gateway 생성**:
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
        'mode': 'ENFORCE',  # ENFORCE 또는 MONITOR
        'arn': 'arn:aws:policy-registry:us-west-2:123456789012:policy-engine/...'
    }
)
```

🆕 **Policy GA (2026년 3월)**: 13개 리전에서 프로덕션 사용 가능. CDK 서브모듈은 아직 alpha.

---

## 9. 지식 확인 및 핵심 정리

### 지식 확인 문제

**문제 1**: S3 대규모 데이터셋 + 민감한 재무 정보 보호 + 운영 오버헤드 최소화
- ✅ **정답: A** - VPC를 지원하는 AgentCore Code Interpreter 구현
- 핵심: Code Interpreter = 격리된 샌드박스 + S3 통합 + VPC로 민감 데이터 보호

**문제 2**: 로컬 도구(빈번한 수학 계산) + 원격 서비스(공유 기업 데이터) 모두 필요
- ✅ **정답: C** - 계산 도구용 로컬 호스팅 + 공유 데이터 서비스용 원격 호스팅 (하이브리드)
- 핵심: 지연 시간 요구 → 로컬, 공유/독립 스케일링 → 원격

### 모듈 학습 목표 달성 확인

이 모듈을 완료하면 다음을 수행할 수 있습니다:
- ✅ 기본 제공 도구와 프로토콜 기반 도구를 비롯한 다양한 도구 통합 패턴을 구현
- ✅ MCP 기반 서버와 클라이언트를 설계하고 배포
- ✅ 에이전트 도구 사용을 위한 일반적인 인증 패턴을 설명
- ✅ AgentCore Gateway 구성 요소를 구성
- ✅ AgentCore Policy를 사용하여 에이전트 도구 호출을 보호하는 정책을 생성

---

## 10. 추가 Key Points - 강사 보충 자료

### 10.1 🆕 Gateway MCP Sessions (2026년 5월)

Gateway가 상태 유지 세션을 지원하여 고급 MCP 기능을 활성화:

| 기능 | 설명 |
|------|------|
| **MCP Sessions** | 사용자별 스코핑, 고유 Mcp-Session-Id, 최대 8시간 타임아웃 |
| **Response Streaming (SSE)** | Server-Sent Events로 실시간 응답 (이전: 전체 버퍼링) |
| **Elicitation Pass-Through** | 도구 실행 중 사용자 입력 요청 (Human-in-the-loop) |
| **Sampling Messages** | MCP 서버가 도구 실행 중 LLM 호출 요청 |
| **Progress Notifications** | 장시간 작업의 실시간 진행 상황 스트리밍 |
| **Logging Notifications** | 구조화된 로그 메시지 실시간 전달 |

**Elicitation 모드**:
- **Form 모드**: 구조화된 폼 ("이 환불을 진행하시겠습니까?") → 사용자 응답 → 서버 계속
- **URL 모드**: OAuth 동의 페이지 등으로 리다이렉트 → 완료 후 처리 계속

### 10.2 🆕 AWS Agent Registry (Preview)

도구와 에이전트를 중앙에서 관리하는 카탈로그:

```
┌───────────────────────────────────────────────────────────────────┐
│                      AWS Agent Registry                           │
│                                                                   │
│  등록 가능 항목:                                                  │
│  ┌──────────┐┌──────┐┌──────┐┌──────────┐┌──────────────────┐   │
│  │ 에이전트   ││ 도구   ││ 스킬  ││MCP 서버   ││커스텀 리소스        │   │
│  └──────────┘└──────┘└──────┘└──────────┘└──────────────────┘   │
│                                                                   │
│  접근 방식:                                                       │
│  • Console UI                                                     │
│  • API                                                            │
│  • MCP 서버 (IDE에서 직접 쿼리)                                   │
│                                                                   │
│  보안: IAM + OAuth (Custom JWT)                                   │
└───────────────────────────────────────────────────────────────────┘
```

### 10.3 도구 통합 패턴 선택 가이드

| 시나리오 | 추천 패턴 |
|----------|-----------|
| 웹 스크래핑, 폼 작성 | AgentCore Browser |
| 데이터 분석, 시각화 | AgentCore Code Interpreter |
| 기존 REST API 노출 | Gateway + OpenAPI 대상 |
| 커스텀 비즈니스 로직 | Gateway + Lambda 대상 |
| 기존 MCP 서버 연결 | Gateway + MCP 서버 대상 |
| 빈번한 호출, 낮은 지연 | 로컬 MCP 서버 (Runtime 내) |
| 여러 에이전트 공유 도구 | 원격 MCP 서버 (별도 Runtime) |
| 🆕 사용자 확인 필요 | Gateway Elicitation |
| 🆕 도구 중 LLM 추론 필요 | Gateway Sampling |

### 10.4 🆕 AgentCore MCP Server (awslabs/mcp)

코딩 에이전트(Kiro, Claude Code, Cursor 등)에서 AgentCore를 직접 사용:

```bash
# 설치 없이 MCP 클라이언트에서 바로 사용
# Runtime, Memory, Browser, Code Interpreter 지원
# AWS 기본 자격 증명 체인으로 인증
```

기능:
- AgentCore 에이전트 생성/호출
- 클라우드 브라우저 실행
- Code Interpreter 샌드박스에서 코드 실행
- Memory 리소스 관리

### 10.5 Policy 설계 모범 사례

| 원칙 | 설명 |
|------|------|
| **기본 거부** | 명시적으로 허용하지 않은 모든 것은 거부 |
| **최소 권한** | 필요한 도구만 허용, 조건으로 범위 제한 |
| **MONITOR 먼저** | 프로덕션 적용 전 MONITOR 모드로 영향 분석 |
| **조건 활용** | 금액, 부서, 시간대 등으로 세분화 |
| **감사 통합** | Observability와 연동하여 거부된 호출 추적 |

### 10.6 강의 토론 포인트

1. **"구축 중인 에이전트에 어떤 통합 패턴이 적합한가?"**
   - 기존 인프라, 지연 시간 요구, 보안 요구 사항 고려

2. **"로컬 vs 원격 MCP 서버 - 어떤 기준으로 선택하는가?"**
   - 호출 빈도, 지연 시간, 공유 필요성, 독립 배포 필요성

3. **"에이전트에 어떤 정책 경계를 설정해야 하는가?"**
   - 금액 제한, 데이터 접근 범위, 시간대 제한, 승인 필요 작업

### 🆕 10.7 Web Search on AgentCore (2026년 6월 NY Summit, GA)

에이전트가 조직 내부 지식의 공백(규제 변화, 시장 동향, 경쟁사 신제품 등)을 메우기 위해 실시간
웹 정보에 접근할 수 있는 **완전관리형 웹 검색 도구**입니다.

| 항목 | 내용 |
|------|------|
| **통합 방식** | AgentCore Gateway의 **기본 제공 커넥터 대상(built-in connector target)**으로 제공, MCP 사용 |
| **작동** | 에이전트가 자연어 쿼리 전송 → 관련 발췌문, 출처 URL, 제목, 게시일 반환 → 모델이 추론하여 근거 있는(grounded) 응답 생성 |
| **데이터 보안** | 쿼리가 고객의 AWS 보안·규정 준수 경계 내에 유지 (**zero data egress**), 추가 벤더 온보딩 불필요 |
| **검색 인프라** | Alexa+, Amazon Quick Suite, Kiro를 구동하는 Amazon 검색 인프라 기반, 에이전틱 검색에 최적화 |
| **멀티소스 그라운딩** | 공개 웹 정보 + Amazon 독자 지식 그래프(구조화된 엔터티 데이터, 검증된 사실, 주가·스포츠 점수 등 실시간 정보) 결합 |

**활용 사례**: 공개 소스를 교차 확인하는 리서치 에이전트, 규제·정책 업데이트를 모니터링하는
컴플라이언스 에이전트, 모델 응답을 최신 정보로 그라운딩.

### 🆕 10.8 Bedrock Managed Knowledge Base on AgentCore (2026년 6월 NY Summit, GA)

SharePoint, Google Drive, Confluence, S3, 내부 위키 등에 흩어진 조직 지식을 에이전트에 연결하는
**관리형 RAG** 기능입니다. 기존에는 커스텀 수집 파이프라인 구축, 검색 튜닝, 데이터 신선도 유지에
수개월의 엔지니어링이 필요했습니다.

| 항목 | 내용 |
|------|------|
| **관리 범위** | 벡터 스토어, 검색 시 사용하는 임베딩·리랭킹 모델, 속도 제한 등 확장성 우려를 AWS가 관리 |
| **Agentic Retriever** | 단순히 쿼리를 가장 가까운 청크에 매칭하는 전통 RAG를 넘어, 지식 베이스 전반에 걸쳐 쿼리를 계획하고, 문서 간 관련 개념을 연결하며, 중간 결과를 평가하고, 답변 전 리랭킹 |
| **Gateway 통합** | AgentCore Gateway와 통합되어 도구처럼 호출 |
| **효과** | 여러 주제를 아우르는 복잡한 다단계 쿼리에서 기본 검색보다 더 넓고 완전한 커버리지 |

> **메모리(M05)와의 구분**: Knowledge Base는 "조직의 정적·비정형 지식"에 대한 검색이고,
> AgentCore Memory는 "에이전트가 대화에서 학습·기억하는 정보"입니다. 두 가지는 상호 보완적입니다.

### 🆕 10.9 Guardrails 통합 및 에이전트 경제 (2026년 6월 NY Summit)

**Bedrock Guardrails + Policy 통합 (GA)**:
- AgentCore Policy에 Bedrock Guardrails가 통합되어 모든 에이전트 액션을 프롬프트 인젝션, 유해
  콘텐츠, 민감 데이터 노출에 대해 평가
- 검사는 에이전트 코드 외부의 **Gateway 계층**에서 실행 → 에이전트가 우회 불가
- 모든 도구·컨텍스트 소스가 Gateway를 경유하므로 새 기능도 자동으로 동일 보안 계층 적용
- 🔜 향후 Check Point, Zscaler, Rubrik, Netskope, SentinelOne 등 서드파티 탐지 신호 연동 예정
- (상세: M03 보안 모듈 10.8 참조)

**AWS WAF AI traffic monetization (GA) - 에이전트 경제의 공급자 측**:
- AgentCore Payments(Preview)가 **소비자 측**(에이전트가 유료 서비스를 발견·접근·결제)을 담당한다면,
  WAF AI traffic monetization은 **공급자 측**(콘텐츠 소유자가 AI 봇·에이전트의 접근을 차단/허용/과금)을 담당
- 새 Bot Control 기능으로 접근에 가격을 설정하고, 서드파티 결제 공급자를 통해 결제를 수락하며,
  엣지에서 직접 범위가 지정된(scoped) 접근을 부여
- 두 기능이 같은 플랫폼에서 동작하므로, WAF를 사용하는 공급자는 AgentCore에서 검증된 에이전트를
  자동으로 인식 → 검증된 에이전트에 대한 낮은 마찰 + 공급자에 대한 보상

---

## 교재 대비 변경 요약

| 교재 내용 (v1.0.4) | 현재 상태 (2026년 5월) |
|---------------------|----------------------|
| Gateway: 기본 MCP 지원 | **🆕 MCP Sessions, SSE 스트리밍, Elicitation, Sampling, Progress** |
| Browser: 기본 웹 탐색 | **🆕 OS-Level, 프록시, 프로필, 확장, Chrome 정책, Web Bot Auth** |
| Code Interpreter: Python만 | **🆕 + Node.js (JavaScript/TypeScript)** |
| Policy: 기본 설명 | **🆕 GA** (13개 리전, ENFORCE/MONITOR 모드) |
| Registry 없음 | **🆕 AWS Agent Registry Preview** |
| 기본 인증 | **🆕 3LO GA, VPC Egress, Custom Header Passthrough** |
| Stateless MCP만 | **🆕 Stateful MCP** (Elicitation, Sampling, Progress) |
| Gateway AZ 제한 | **🆕 전체 AZ 커버리지** |
| 웹 검색 도구 없음 | 🆕 **NY Summit 2026**: Web Search on AgentCore (GA, Gateway 커넥터 대상) |
| 조직 지식 연결 수동 | 🆕 **NY Summit 2026**: Bedrock Managed Knowledge Base (GA, Agentic Retriever) |
| Policy 안전성 검사 없음 | 🆕 **NY Summit 2026**: Bedrock Guardrails 통합 (GA) |
| 결제 공급자 측 없음 | 🆕 **NY Summit 2026**: AWS WAF AI traffic monetization (GA) |

---

## 참고 자료

- [AgentCore Gateway 공식 문서](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway.html)
- [AgentCore Policy 문서](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/policy.html)
- [AgentCore Browser 문서](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/browser-tool.html)
- [AgentCore Code Interpreter 문서](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/code-interpreter.html)
- [MCP Sessions 문서](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway-sessions.html)
- [Elicitation 문서](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway-mcp-elicitation.html)
- [AWS Agent Registry 문서](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/registry.html)
- [Model Context Protocol 사양](https://modelcontextprotocol.io/)
- [Announcing Web Search on Amazon Bedrock AgentCore (NY Summit 2026)](https://aws.amazon.com/blogs/aws/announcing-web-search-on-amazon-bedrock-agentcore-ground-your-ai-agents-in-current-accurate-web-knowledge/)
- [Introducing Amazon Bedrock Managed Knowledge Base (NY Summit 2026)](https://aws.amazon.com/blogs/aws/introducing-amazon-bedrock-managed-knowledge-base-for-faster-more-accurate-enterprise-ai-applications/)
- [AWS WAF AI traffic monetization (NY Summit 2026)](https://aws.amazon.com/blogs/aws/aws-waf-adds-ai-traffic-monetization-capability-to-help-content-owners-charge-ai-bots-for-content-access/)

---

*본 문서는 MLAGAC-10-KO-KR-M04-ToolsAndGateway_InstructorDeck.pdf의 내용을 기반으로 작성되었으며,
🆕 표시된 내용은 2026년 5월 기준 최신 서비스 업데이트를 반영한 강사 보충 자료입니다.*

*문서 버전: 2.1 | 작성일: 2026-05-28 | 최종 수정: 2026-06-23 | 업데이트 기준: 2026년 6월 AWS Summit New York 반영*
