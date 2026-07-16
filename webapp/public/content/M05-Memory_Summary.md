# 모듈 5: 에이전틱 메모리 구현

## Building Agentic AI with Amazon Bedrock AgentCore

---

## 목차

1. [에이전틱 메모리 개요](#1-에이전틱-메모리-개요)
2. [단기 메모리와 장기 메모리](#2-단기-메모리와-장기-메모리)
3. [메모리 전략 (Memory Strategies)](#3-메모리-전략)
4. [대화 저장 및 검색](#4-대화-저장-및-검색)
5. [네임스페이스와 메모리 구성](#5-네임스페이스와-메모리-구성)
6. [Strands Agents와 메모리 통합](#6-strands-agents와-메모리-통합)
7. [메모리 보안](#7-메모리-보안)
8. [지식 확인 및 핵심 정리](#8-지식-확인-및-핵심-정리)
9. [추가 Key Points - 강사 보충 자료](#9-추가-key-points---강사-보충-자료)

> 🆕 표시: 교재(v1.0.4, 2026년 4월 빌드) 이후 추가/변경된 내용

---

## 1. 에이전틱 메모리 개요

### 왜 메모리가 필요한가?

에이전트가 진정한 개인화와 연속성을 제공하려면, 대화 간 컨텍스트를 유지하고
사용자에 대해 학습한 정보를 기억해야 합니다.

### 메모리 구현 방식: 관리형(AgentCore Memory) vs 비관리형(Self-Managed)

에이전트 메모리를 구현하는 방식은 크게 두 가지로 나뉩니다:
- **관리형**: AgentCore Memory를 사용하여 저장, 추출, 검색을 모두 위임
- **비관리형**: 다른 AWS 서비스를 조합하여 직접 메모리 인프라를 구축

> AWS 공식 블로그에 따르면, 비관리형(DIY) 방식은 원시 대화 저장소, 벡터 데이터베이스, 세션 캐싱 시스템, 커스텀 검색 로직 등 여러 컴포넌트를 개발자가 직접 오케스트레이션해야 합니다.
> AgentCore Memory는 이를 단일 관리형 서비스로 제공합니다.
>
> — 출처: [Amazon Bedrock AgentCore Memory: Building context-aware agents](https://aws.amazon.com/blogs/machine-learning/amazon-bedrock-agentcore-memory-building-context-aware-agents/)

#### AgentCore Memory vs 비관리형 비교

| 비교 항목 | AgentCore Memory (관리형) | 비관리형 (Self-Managed) |
|-----------|--------------------------|------------------------|
| **인프라 관리** | 불필요 (완전 관리형) | 직접 프로비저닝·운영 필요 |
| **메모리 추출** | 빌트인 전략이 자동 추출 (시맨틱, 요약, 사용자 기본 설정, 에피소드) | 개발자가 직접 추출 로직 구현 |
| **메모리 통합(Consolidation)** | 자동 (ADD/UPDATE/SKIP 판단) | 직접 중복 탐지·병합 로직 구현 |
| **벡터 임베딩·인덱싱** | 내장 | 별도 임베딩 모델 호출 + 벡터 DB 관리 |
| **단기 + 장기 메모리 통합** | 단일 API로 양쪽 관리 | 각각 별도 시스템 구성 (예: DynamoDB + OpenSearch) |
| **시맨틱 검색** | 내장 (RetrieveMemoryRecords) | 벡터 DB에서 직접 구현 |
| **프레임워크 통합** | Strands, LangGraph 공식 커넥터 제공 | 프레임워크별 직접 구현 또는 커뮤니티 라이브러리 |
| **세분화 접근 제어** | 네임스페이스 + IAM 조건 키 | 서비스별 IAM/보안 정책 개별 설정 |
| **검색 지연** | 서비스 내부 최적화 (수십~수백 ms) | 서비스 선택에 따라 조절 가능 (서브ms ~ 초 단위) |
| **비용 모델** | AgentCore Memory API 호출 기반 | 사용하는 각 서비스별 개별 과금 |
| **커스터마이징** | 빌트인 전략 오버라이드 또는 Self-Managed Strategy | 완전한 제어 (자체 모델, 로직, 스키마) |
| **적합한 경우** | 빠른 구축, 추출 로직 위임, 표준적인 메모리 패턴 | 기존 인프라 활용, 특수 성능 SLA, 도메인 특화 로직 |

#### 비관리형(Self-Managed) 메모리에 사용할 수 있는 AWS 서비스

AgentCore Memory를 사용하지 않고 다른 AWS 서비스를 활용하여 에이전트 메모리를 직접 구축할 수 있습니다.

##### 옵션 1: Amazon DynamoDB — 대화 히스토리 및 에이전트 상태 저장

DynamoDB를 사용하면 대화 이력, 세션 상태, 에이전트 체크포인트를 서버리스 환경에서 저장하고 검색할 수 있습니다.

**구현 방식**:
- `session_id`를 파티션 키, `timestamp`를 정렬 키로 사용하는 단일 테이블 설계
- LangGraph `DynamoDBSaver`를 통한 체크포인트 저장 (대용량 페이로드는 S3 오프로딩)
- Strands SDK의 세션 매니저로 대화 컨텍스트를 DynamoDB에 외부화

**사용 사례**:
- 멀티턴 대화의 세션 상태 유지 (고객 서비스 챗봇, 주문 관리 에이전트)
- LangGraph 에이전트의 워크플로 체크포인트 (멀티 스텝 작업의 중간 상태 저장 및 재개)
- 사용자 프로필과 기본 설정의 키-값 저장 (빠른 조회가 필요한 경우)

**예시: DynamoDB에 세션 대화를 저장하고, 다음 세션에서 불러와 이어가기 (LangChain)**

아래 코드는 LangChain의 `DynamoDBChatMessageHistory`를 사용하여 한 세션의 대화를 DynamoDB에 저장한 뒤, 이후 새 세션에서 이전 대화를 불러와 컨텍스트를 유지하며 대화를 이어가는 시나리오입니다.

> 참고: [LangChain DynamoDB 통합 문서](https://python.langchain.com/v0.2/docs/integrations/memory/aws_dynamodb/)

```python
# 사전 준비:
# pip install langchain-community langchain-aws boto3
#
# DynamoDB 테이블 생성 (AWS CLI):
# aws dynamodb create-table \
#   --table-name AgentChatHistory \
#   --attribute-definitions AttributeName=SessionId,AttributeType=S \
#   --key-schema AttributeName=SessionId,KeyType=HASH \
#   --billing-mode PAY_PER_REQUEST

import boto3
from langchain_community.chat_message_histories import DynamoDBChatMessageHistory
from langchain_aws import ChatBedrock
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.runnables.history import RunnableWithMessageHistory

# ─── 1단계: DynamoDB 세션 히스토리 팩토리 ───
def get_session_history(session_id: str) -> DynamoDBChatMessageHistory:
    """session_id로 DynamoDB에서 대화 히스토리를 가져오는 팩토리 함수"""
    return DynamoDBChatMessageHistory(
        table_name="AgentChatHistory",
        session_id=session_id
    )

# ─── 2단계: LLM + 프롬프트 체인 구성 ───
llm = ChatBedrock(
    model_id="anthropic.claude-sonnet-4-20250514",
    region_name="us-west-2"
)

prompt = ChatPromptTemplate.from_messages([
    ("system", "당신은 여행 계획을 도와주는 AI 어시스턴트입니다. "
               "이전 대화 내용을 기억하고 일관된 응답을 제공하세요."),
    MessagesPlaceholder(variable_name="history"),
    ("human", "{input}")
])

chain = prompt | llm

# ─── 3단계: 메시지 히스토리를 자동으로 관리하는 체인 생성 ───
chain_with_history = RunnableWithMessageHistory(
    chain,
    get_session_history,
    input_messages_key="input",
    history_messages_key="history"
)

# ─── 4단계: 첫 번째 세션 (대화 시작) ───
session_config = {"configurable": {"session_id": "user-123-travel"}}

# 첫 번째 턴
response1 = chain_with_history.invoke(
    {"input": "다음 주에 도쿄 여행을 계획하고 있어요. 3박 4일이에요."},
    config=session_config
)
print(f"AI: {response1.content}")

# 두 번째 턴 (같은 세션 내)
response2 = chain_with_history.invoke(
    {"input": "예산은 200만원 정도이고, 맛집 위주로 돌아다니고 싶어요."},
    config=session_config
)
print(f"AI: {response2.content}")

# ─── 여기서 애플리케이션 종료 (대화가 DynamoDB에 자동 저장됨) ───

# ─── 5단계: 다음 세션 (이전 대화 자동 복원) ───
# 시간이 지난 후 같은 session_id로 접속하면 이전 대화를 자동으로 불러옴

response3 = chain_with_history.invoke(
    {"input": "아까 말한 도쿄 여행에서 시부야 근처 맛집 추천해줄 수 있어요?"},
    config=session_config  # 같은 session_id → 이전 대화 컨텍스트 자동 로드
)
print(f"AI: {response3.content}")
# AI는 "3박 4일", "200만원 예산", "맛집 위주" 등의 이전 컨텍스트를 기억하고 응답

# ─── (선택) 저장된 히스토리 확인 ───
history = get_session_history("user-123-travel")
print(f"\n저장된 메시지 수: {len(history.messages)}")
for msg in history.messages:
    print(f"  [{msg.type}]: {msg.content[:50]}...")
```

**동작 원리**:
1. `DynamoDBChatMessageHistory`는 `SessionId` 파티션 키로 DynamoDB 테이블에 대화 메시지를 JSON으로 저장
2. 같은 `session_id`로 재접속하면, 테이블에서 기존 메시지를 불러와 LLM 프롬프트에 자동 주입
3. 애플리케이션이 재시작되어도 DynamoDB에 영구 저장되므로 대화 연속성 유지

**참고**: [Build durable AI agents with LangGraph and Amazon DynamoDB](https://aws.amazon.com/blogs/database/build-durable-ai-agents-with-langgraph-and-amazon-dynamodb/) | [Using DynamoDB as a checkpoint store for LangGraph agents](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/ddb-langgraph-checkpoint.html)

##### 옵션 2: Amazon ElastiCache for Valkey — 초저지연 벡터 검색 기반 메모리

ElastiCache for Valkey(Redis OSS 호환)의 벡터 검색 기능을 사용하여 에이전트에 시맨틱 메모리를 구현합니다.

**구현 방식**:
- 대화 내용을 임베딩으로 변환 후 Valkey의 벡터 인덱스에 저장
- 벡터 유사도 검색으로 관련 과거 대화/지식을 밀리초 단위로 검색
- Mem0 오픈소스와 통합하여 메모리 추출·검색 자동화

**사용 사례**:
- 실시간 개인화가 필요한 에이전트 (추천 엔진, 실시간 지원)
- 시맨틱 캐싱 — 유사한 이전 질문의 응답을 재활용하여 LLM 호출 비용 절감
- 반복 연구 작업 방지 (에이전트가 이전에 조사한 내용을 기억)

**참고**: [Setting up ElastiCache for Valkey as a vector store for agentic memory](https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/agentic-memory-setup.html) | [Build persistent memory for agentic AI applications with Mem0, ElastiCache for Valkey, and Neptune Analytics](https://aws.amazon.com/blogs/database/build-persistent-memory-for-agentic-ai-applications-with-mem0-open-source-amazon-elasticache-for-valkey-and-amazon-neptune-analytics/)

##### 옵션 3: Amazon Aurora PostgreSQL (pgvector) — 구조화된 메모리와 벡터 검색의 결합

Aurora PostgreSQL에 pgvector 확장을 사용하면 구조화된 데이터(관계형)와 벡터 임베딩을 같은 데이터베이스에서 관리할 수 있습니다.

**구현 방식**:
- 대화 로그는 관계형 테이블에, 시맨틱 임베딩은 pgvector 컬럼에 저장
- SQL 필터링 + 벡터 유사도 검색을 단일 쿼리로 결합
- Amazon Bedrock의 임베딩 모델과 연동하여 자동 벡터 생성

**사용 사례**:
- 멀티테넌트 에이전트 메모리 (테넌트별 행 수준 보안과 벡터 검색 결합)
- 메타데이터 필터링이 복잡한 장기 메모리 (부서, 날짜, 우선순위 등으로 필터링)
- 기존 PostgreSQL 기반 애플리케이션에 에이전트 메모리를 추가하는 경우

**참고**: [How Letta builds production-ready AI agents with Amazon Aurora PostgreSQL](https://aws.amazon.com/blogs/database/how-letta-builds-production-ready-ai-agents-with-amazon-aurora-postgresql/) | [Self-managed multi-tenant vector search with Amazon Aurora PostgreSQL](https://aws.amazon.com/blogs/database/self-managed-multi-tenant-vector-search-with-amazon-aurora-postgresql/)

##### 옵션 4: Amazon OpenSearch Service (Serverless) — 대규모 벡터 인덱스와 하이브리드 검색

OpenSearch Serverless는 벡터 검색, 렉시컬(키워드) 검색, 하이브리드 검색을 결합하여 에이전트의 장기 메모리 검색에 활용합니다.

**구현 방식**:
- 대화에서 추출한 정보를 벡터 임베딩 + 키워드 인덱스로 동시 저장
- k-NN 벡터 검색과 BM25 텍스트 검색을 결합한 하이브리드 검색
- 서버리스 자동 확장으로 인프라 관리 최소화

**사용 사례**:
- 대규모 지식 베이스 기반 에이전트 (수백만 건의 과거 대화/문서에서 검색)
- RAG 파이프라인의 벡터 스토어로 활용 (에이전트가 조직 문서를 참조)
- 하이브리드 검색이 필요한 경우 (정확한 키워드 + 의미적 유사성 동시 검색)

**참고**: [Amazon OpenSearch Serverless vector database](https://aws.amazon.com/opensearch-service/serverless-vector-database/) | [The next generation of OpenSearch Serverless: Built from the ground up for agents](https://aws.amazon.com/blogs/big-data/the-next-generation-of-amazon-opensearch-serverless-built-from-the-ground-up-for-agents/)

##### 옵션 5: Amazon S3 Vectors — 대규모 저비용 벡터 메모리

S3 Vectors는 네이티브 벡터 저장 및 쿼리를 지원하는 클라우드 오브젝트 스토리지로, 대규모 에이전트 메모리를 최대 90% 저렴하게 운용할 수 있습니다.

**구현 방식**:
- 에이전트 상호작용에서 추출한 메모리를 벡터 벡켓(vector bucket)에 저장
- 서브초(subsecond) 쿼리 성능으로 시맨틱 검색 수행
- OpenSearch Service와 계층화 전략으로 핫/웜 메모리 분리 가능

**사용 사례**:
- 멀티 에이전트 시스템의 공유 메모리 (에이전트 간 발견 사항, 완료 작업, 결정 이력 공유)
- 대규모 벡터 데이터셋을 저비용으로 장기 보관하는 경우 (수억 건 이상)
- 빈번하지 않은 검색이 주를 이루는 아카이브성 에이전트 메모리

**참고**: [Building persistent memory for multi-agent AI systems with Amazon S3 Vectors](https://aws.amazon.com/blogs/storage/building-persistent-memory-for-multi-agent-ai-systems-with-amazon-s3-vectors/) | [Amazon S3 Vectors](https://aws.amazon.com/s3/features/vectors/)

##### 옵션 6: Amazon MemoryDB — 내구성 있는 인메모리 벡터 검색

MemoryDB는 Multi-AZ 내구성을 갖춘 인메모리 데이터베이스로, 벡터 검색을 지원하여 메모리 유실 없이 초저지연 시맨틱 검색을 제공합니다.

**구현 방식**:
- Valkey/Redis 호환 API로 벡터 저장 및 유사도 검색
- 데이터를 디스크에 영구 저장하므로 노드 장애 시에도 메모리 유실 없음
- 시맨틱 캐싱 계층으로 활용하여 동일/유사 질문에 대한 응답 재사용

**사용 사례**:
- 메모리 유실이 허용되지 않는 프로덕션 에이전트 (금융, 의료 등 규제 환경)
- 초저지연이 필요한 실시간 에이전트 (한 자릿수 밀리초 검색)
- 시맨틱 캐싱으로 LLM 추론 비용을 절감하면서 응답 속도를 개선

**참고**: [Vector search for Amazon MemoryDB is now generally available](https://aws.amazon.com/blogs/aws/vector-search-for-amazon-memorydb-is-now-generally-available/) | [Improve speed and reduce cost for generative AI workloads with a persistent semantic cache in Amazon MemoryDB](https://aws.amazon.com/blogs/database/improve-speed-and-reduce-cost-for-generative-ai-workloads-with-a-persistent-semantic-cache-in-amazon-memorydb/)

##### 비관리형 옵션 요약표

| 서비스 | 메모리 유형 | 검색 지연 | 확장성 | 대표 사용 사례 |
|--------|-----------|----------|--------|--------------|
| **DynamoDB** | 세션/상태 (키-값) | 한 자릿수 ms | 무제한 수평 확장 | 대화 히스토리, 체크포인트 |
| **ElastiCache (Valkey)** | 벡터 + 캐시 | 서브ms | 클러스터 확장 | 실시간 시맨틱 검색, 캐싱 |
| **Aurora PostgreSQL** | 관계형 + 벡터 | 수~수십 ms | 읽기 복제본 확장 | 멀티테넌트, 복합 필터링 |
| **OpenSearch Serverless** | 벡터 + 렉시컬 | 수십 ms | 서버리스 자동 확장 | 대규모 하이브리드 검색 |
| **S3 Vectors** | 벡터 (대규모) | 서브초 | 사실상 무제한 | 대규모 저비용 장기 메모리 |
| **MemoryDB** | 벡터 + 영구 저장 | 서브ms | 클러스터 확장 | 내구성 + 초저지연 조합 |

##### 비관리형의 고려사항

| 고려사항 | 설명 |
|----------|------|
| **추출 로직 직접 구현** | 대화에서 무엇을 기억할지 결정하는 로직(프롬프트/모델 호출)을 직접 작성해야 함 |
| **통합(Consolidation) 로직** | 기존 메모리와 새 메모리의 중복 탐지·병합을 직접 처리해야 함 |
| **임베딩 파이프라인 관리** | 텍스트→벡터 변환을 위한 모델 호출·배치 처리를 직접 구축 |
| **여러 서비스 오케스트레이션** | 단기(DynamoDB) + 장기(OpenSearch/S3 Vectors) 등 다수 서비스를 조합·연결해야 함 |
| **보안·접근 제어 개별 설정** | 각 서비스별로 IAM 정책, 암호화, VPC 설정을 따로 관리 |
| **운영 부담** | 모니터링, 스케일링, 장애 대응을 서비스별로 관리 |
| **프레임워크 통합** | Strands/LangGraph 등과의 연동 코드를 직접 작성하거나 커뮤니티 라이브러리 활용 |

### AgentCore Memory 아키텍처

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         AgentCore Memory                                 │
│                                                                         │
│  ┌─────────────────────────┐       ┌─────────────────────────────────┐  │
│  │      단기 메모리         │       │          장기 메모리             │  │
│  │                         │       │                                 │  │
│  │  ┌───────────────────┐  │       │  ┌─────────────────────────┐   │  │
│  │  │   채팅 메시지      │  │       │  │    시맨틱 메모리         │   │  │
│  │  └───────────────────┘  │       │  ├─────────────────────────┤   │  │
│  │  ┌───────────────────┐  │       │  │    사용자 기본 설정      │   │  │
│  │  │     이벤트         │  │       │  ├─────────────────────────┤   │  │
│  │  └───────────────────┘  │       │  │        요약              │   │  │
│  │                         │       │  ├─────────────────────────┤   │  │
│  │     (동기식)            │       │  │    🆕 에피소드           │   │  │
│  └────────────┬────────────┘       │  └─────────────────────────┘   │  │
│               │                    └─────────────────────────────────┘  │
│               │                                 ▲                       │
│               ▼                                 │                       │
│       ╭───────────────────╮                     │                       │
│       │   메모리 전략      │─────────────────────┘                       │
│       │ (비동기식 추출)    │                                             │
│       ╰───────────────────╯                                             │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      에이전트 구현                                │   │
│  │                                                                   │   │
│  │  ┌─────────────────┐ ┌──────────────────┐ ┌────────────────────┐ │   │
│  │  │ 메시지 저장      │ │ 이벤트 검색      │ │ 메모리 레코드 검색  │ │   │
│  │  │   (동기식)       │ │   (동기식)       │ │    (비동기식)       │ │   │
│  │  └─────────────────┘ └──────────────────┘ └────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. 단기 메모리와 장기 메모리

### 비교표

| 구분 | 단기 메모리 | 장기 메모리 |
|------|-----------|-----------|
| **저장 내용** | 원시 이벤트 (채팅 메시지, 도구 호출) | 처리되고 구조화된 정보 |
| **접근 방식** | 동기식 | 비동기식 |
| **범위** | 세션 내 | 세션 간 (영구) |
| **API** | CreateEvent, GetEvent, ListEvents | RetrieveMemoryRecords |

### 언제 단기 메모리를 사용하고, 언제 장기 메모리를 사용하는가?

**단기 메모리를 사용하는 경우**:

| 시나리오 | 설명 |
|----------|------|
| 현재 세션 내 멀티턴 대화 유지 | 사용자가 "아까 말한 그 주문" 등으로 이전 턴을 참조할 때, 해당 세션의 원시 메시지를 그대로 유지하여 컨텍스트를 제공 |
| 도구 호출 결과 추적 | 에이전트가 API를 호출하고 그 결과를 바탕으로 후속 추론을 할 때, 도구 호출과 응답을 원시 이벤트로 보존 |
| 단일 세션 완결형 작업 | 한 번의 대화로 끝나는 Q&A, 일회성 문제 해결 등 세션 간 기억이 불필요한 경우 |
| 디버깅 및 감사 추적 | 대화의 원시 기록을 그대로 보존하여 문제 발생 시 정확한 상호작용을 재구성 |

**장기 메모리를 사용하는 경우**:

| 시나리오 | 설명 |
|----------|------|
| 반복 방문 사용자의 선호도 기억 | 사용자가 "창가석 선호", "채식주의자" 등을 언급하면 장기 메모리에 저장하여 미래 세션에서 자동 반영 (출처: [AgentCore Memory 공식 문서](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/memory.html)) |
| 세션 간 지식 축적 | 고객이 며칠 후 재방문했을 때 이전 상담 내용을 기억하여 처음부터 다시 설명할 필요 없도록 함 |
| 대화 요약 보존 | 긴 대화의 핵심을 압축하여 저장하고, 이후 세션에서 전체 원시 히스토리 대신 요약으로 컨텍스트 제공 |
| 에이전트 학습 및 개선 | 과거 상호작용에서 패턴을 추출하여 에이전트가 시간이 지남에 따라 더 나은 응답을 생성 |
| 멀티 에이전트 협업 | 하나의 에이전트가 학습한 지식을 다른 에이전트가 검색하여 활용 |


### 단기 메모리에서 장기 메모리로의 이동

```
┌─────────────────────┐
│     단기 메모리       │
│                     │
│  ┌───────────────┐  │
│  │  원시 이벤트   │  │
│  └───────────────┘  │
│  ┌───────────────┐  │
│  │ .add_turns()  │  │
│  │ create_event  │  │
│  └───────┬───────┘  │
└──────────┼──────────┘
           │
           ▼
┌──────────────────────────────────────────┐
│        메모리 추출 (비동기식)              │
│  K개 메시지마다 / X초 동안 활동 없을 때    │
└──────────────────────┬───────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────┐
│            장기 메모리                     │
│                                          │
│  ┌────────────────┐  ┌────────────────┐  │
│  │ 벡터 스토리지   │  │ 임베딩 및 인덱싱│  │
│  └────────────────┘  └────────────────┘  │
└──────────────────────┬───────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────┐
│   통합 (ADD/UPDATE/SKIP)                  │
│   비슷한 메모리 검색                       │
└──────────────────────────────────────────┘
```

**핵심 포인트**:
- `create_event` 작업은 이벤트를 단기 메모리에 저장
- 매 K턴마다 장기 메모리의 비동기식 추출을 트리거
- 추출된 메모리는 벡터 스토리지에 임베딩 및 인덱싱

#### 이동 프로세스 상세

공식 문서에 따르면, 장기 메모리 생성은 **비동기 백그라운드 프로세스**로 수행됩니다. `CreateEvent`로 원시 대화를 단기 메모리에 저장하면, 활성화된 메모리 전략이 자동으로 추출을 트리거합니다.

**Step 1: 트리거 — 원시 대화 저장**

`create_event` 작업으로 대화를 단기 메모리에 저장할 때마다, 활성화된 전략(ACTIVE 상태)이 새 원시 데이터를 처리 대상으로 인식합니다. 전략이 ACTIVE 상태가 되기 **이전**에 저장된 대화는 추출 대상에 포함되지 않습니다.

**Step 2: 추출 (Extraction)**

LLM 기반 추출 에이전트가 메모리 전략에 의해서 원시 대화에서 유의미한 정보를 식별합니다. **시맨틱**, **사용자 기본 설정**, **요약**, **에피소드** 중에서 선택합니다.

**Step 3: 통합 (Consolidation)**

추출된 새 정보를 기존 장기 메모리와 비교하여, **ADD**, **UPDATE**, **SKIP** 결정으로 장기 메모리를 업데이트합니다.

이 통합 프로세스를 통해 장기 메모리가 불필요하게 팽창하지 않고, 최신 상태를 유지합니다.

**Step 4: 임베딩 및 인덱싱**

최종 레코드(ADD 또는 UPDATE)는 벡터 임베딩으로 변환되어 인덱싱됩니다. 이후 `RetrieveMemoryRecords` 작업으로 시맨틱 검색이 가능합니다.

#### 전체 흐름 요약

```
┌───────────────┐     ┌──────────────┐     ┌──────────────────────────┐
│  사용자 대화   │────▶│create_event()│────▶│ 단기 메모리               │
└───────────────┘     └──────────────┘     │ (원시 이벤트 저장)        │
                                           └─────────────┬────────────┘
                                                         │ 비동기 트리거
                                                         ▼
                                           ┌──────────────────────────┐
                                           │ 추출 (Extraction)         │
                                           │ LLM이 원시 대화에서       │
                                           │ 인사이트 식별·추출        │
                                           └─────────────┬────────────┘
                                                         │
                                                         ▼
                                           ┌──────────────────────────┐
                                           │ 통합 (Consolidation)      │
                                           │ 기존 메모리와 비교·판단   │
                                           │ ADD/UPDATE/SKIP           │
                                           └─────────────┬────────────┘
                                                         │
                                                         ▼
                                           ┌──────────────────────────┐
                                           │ 벡터 임베딩 + 인덱싱      │
                                           │ (장기 메모리 레코드 저장) │
                                           └─────────────┬────────────┘
                                                         │
                                                         ▼
                                           ┌──────────────────────────┐
                                           │ RetrieveMemoryRecords()  │
                                           │ 로 시맨틱 검색 가능       │
                                           └──────────────────────────┘
```
---

## 3. 메모리 전략 (Memory Strategies)

### 전략 유형

| 전략 | 설명 | 사용 사례 |
|------|------|-----------|
| **시맨틱 (Semantic)** | 의미 기반 검색 및 저장 | 일반적인 대화 기억, 지식 축적 |
| **사용자 기본 설정 (User Preference)** | 개인화된 선호도 학습 | 식단, 언어, 스타일 선호 |
| **요약 (Summary)** | 대화 내용의 압축 및 핵심 추출 | 긴 대화 요약, 회의록 |
| 🆕 **에피소드 (Episodic)** | 특정 에피소드/이벤트 단위 기억 | 특정 상호작용 기록, 문제 해결 이력 |

### 메모리 리소스 생성 코드

```python
from bedrock_agentcore.memory import MemoryClient

client = MemoryClient(region_name="us-west-2")

memory = client.create_memory_and_wait(
    name="MyAgentMemory",
    strategies=[{
        "userPreferenceMemoryStrategy": {
            "name": "UserPreference",
            "namespaces": ["/users/{actorId}"]
        }
    }]
)
```

**시맨틱 전략 예시**:
```python
memory = client.create_memory_and_wait(
    name="MyAgentMemory",
    strategies=[{
        StrategyType.SEMANTIC.value: {
            "name": "CustomerSupport",
            "namespaces": ["/users/{actorId}"]
        }
    }]
)
```

---

## 4. 대화 저장 및 검색

### 이벤트 저장 (단기 메모리)

```python
memory = client.create_memory_and_wait(
    name="CustomerSupportMemory",
    strategies=[
        {
            "semanticMemoryStrategy": {
                "name": "FactsAndKnowledge",
                "namespaces": ["/users/{actorId}/facts"]
            }
        },
        {
            "userPreferenceMemoryStrategy": {
                "name": "PreferenceLearner",
                "namespaces": ["/users/{actorId}/preferences"]
            }
        }
    ]
)
memory_id = memory.get("id")
print(f"Memory 생성 완료: {memory_id}")
```

**핵심**: `create_event`는 이벤트를 단기 메모리에 저장하고, 매 K턴마다 장기 메모리의 비동기식 추출을 트리거합니다.
 장기 메모리 추출은 비동기로 수행되므로, 즉시 조회하면 결과가 없을 수 있습니다.
 프로덕션에서는 Record Streaming(Kinesis)으로 추출 완료를 감지하거나, 폴링으로 확인합니다.

### 메모리 검색 (장기 메모리)

```python
memories = client.retrieve_memories(
    memory_id=memory_id,
# 다음 세션에서 "sarah-kim"이 접속하면, 이전에 추출된 선호도를 검색
    namespace="/users/sarah-kim/preferences",
    query="배송 관련 선호 사항"
)
print(f"\n검색된 메모리:")
for mem in memories:
    print(f"  - {mem.get('content')}")
# 결과 예시: "사용자는 익일 배송을 선호함"
```

**핵심**: `retrieve_memories`는 저장된 메모리에 대한 **시맨틱 검색**을 수행합니다.

---

## 5. 네임스페이스와 메모리 구성

### 네임스페이스란?

장기 메모리를 논리적으로 그룹화하고 정리하는 계층적 구조입니다.

**특성**:
- 슬래시(/)가 있는 계층 형식 사용
- `{actorId}`, `{strategyId}`, `{sessionId}` 등의 변수 포함 가능
- 메모리를 효율적으로 정리하고 검색하는 데 유용
- 메모리 전략을 정의할 때 필요

**예시**:
```
/users/{actorId}                    → 사용자별 메모리
/summaries/{actorId}/{sessionId}    → 사용자+세션별 요약
/teams/{teamId}/knowledge           → 팀 공유 지식
```

---

## 6. Strands Agents와 메모리 통합

### 방식 1: 도구(Tool) 기반 통합

```python
from strands import tool, Agent
from strands_tools.agent_core_memory import AgentCoreMemoryToolProvider

# 메모리 도구 제공자 생성
strands_provider = AgentCoreMemoryToolProvider(
    memory_id=memory.get("id"),
    actor_id="CaliforniaPerson",
    session_id="sess1",
    namespace="/users/CaliforniaPerson",
    region="us-west-2"
)
```

### 방식 2: 후크(Hook) 기반 통합

```python
from strands.hooks import (
    AfterInvocationEvent, HookRegistry, 
    MessageAddedEvent, HookProvider
)

class MyMemoryHooks(HookProvider):
    def retrieve(self, event: MessageAddedEvent):
        """메시지 추가 시 관련 메모리 검색"""
        memories = client.retrieve_memories(...)
    
    def save(self, event: AfterInvocationEvent):
        """호출 완료 후 대화 내용 저장"""
        self.client.create_event(...)
    
    def register_hooks(self, registry: HookRegistry) -> None:
        registry.add_callback(MessageAddedEvent, self.retrieve)
        registry.add_callback(AfterInvocationEvent, self.save)

# 메모리가 있는 에이전트 생성
memory_hooks = MyMemoryHooks(client, memory)
agent = Agent(hooks=[memory_hooks])
```

**특징**: 이벤트 기반으로 자동 저장/검색 (LLM 추론 불필요, 결정적 동작)

### 두 방식 비교

| 기준 | 도구 기반 | 후크 기반 |
|------|----------|----------|
| **저장/검색 시점** | LLM이 자율 결정 | 이벤트 기반 자동 |
| **토큰 비용** | 도구 호출마다 토큰 소비 | 추가 토큰 없음 |
| **유연성** | 높음 (LLM 판단) | 중간 (규칙 기반) |
| **예측 가능성** | 낮음 (비결정적) | 높음 (결정적) |
| **적합한 경우** | 복잡한 메모리 로직 | 일관된 저장/검색 패턴 |

---

## 7. 메모리 보안

### 기본 IAM 정책

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

### 세분화된 액세스 제어

AgentCore Memory는 다중 사용자 및 다중 세션 메모리를 안전하게 관리하기 위한 세분화된 액세스 제어를 제공합니다.

**단기 메모리 컨텍스트 키**:

| 작업 | 사용 가능한 컨텍스트 키 |
|------|----------------------|
| CreateEvent, DeleteEvent, GetEvent, ListEvents | `bedrock-agentcore:actorId`, `bedrock-agentcore:sessionId` |

**장기 메모리 컨텍스트 키**:

| 작업 | 사용 가능한 컨텍스트 키 |
|------|----------------------|
| RetrieveMemoryRecords, ListMemoryRecords, GetMemoryRecord, DeleteMemoryRecord | `bedrock-agentcore:namespace`, `bedrock-agentcore:strategyId` |

### 네임스페이스 기반 액세스 제어 예시

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

## 8. 지식 확인 및 핵심 정리

### 지식 확인 문제

**문제 1**: 여러 대화에서 고객 기본 설정을 기억해야 하는 고객 지원 에이전트 - 어떤 메모리 패턴?
- ✅ **정답: C** - 행위자 기반 네임스페이스를 통한 사용자 기본 설정 메모리 전략
- 핵심: "며칠 후 다시 방문" = 세션 간 지속 = 장기 메모리 + 사용자 기본 설정 전략

**문제 2**: 단기 메모리와 장기 메모리의 관계를 올바르게 설명한 것은?
- ✅ **정답: C** - 단기 메모리는 원시 이벤트를 저장하는 반면 장기 메모리는 처리되고 구조화된 정보를 포함
- 핵심: 단기 = 원시 데이터, 장기 = 처리/구조화된 정보 (자동 추출)

### 모듈 학습 목표 달성 확인

이 모듈을 완료하면 다음을 수행할 수 있습니다:
- ✅ 다양한 사용 사례에 맞는 에이전틱 메모리 패턴을 구현
- ✅ 컨텍스트 인식 개발을 위한 AgentCore Memory 작업을 구성
- ✅ 프로덕션 워크로드의 메모리 성능을 최적화


---

## 9. 추가 Key Points - 강사 보충 자료

### 9.1 🆕 Structured Metadata Filtering (2026년 4월)

장기 메모리 레코드에 구조화된 속성을 첨부하고, 특정 값과 일치하는 결과만 검색:

**사용 방법**:
1. 메모리 생성 시 인덱싱할 키 선언 (생성 후 제거 불가)
2. 전략에 메타데이터 스키마 구성 → LLM이 대화에서 자동 추출
3. 검색/목록 조회 시 메타데이터 필터 적용

**필터링 가능한 속성 예시**:
- 우선순위 (priority: high/medium/low)
- 부서 (department: finance/engineering)
- 태그 (tags: urgent, follow-up)
- 시간 범위 (created_after, created_before)

**활용 사례**:
```python
# 특정 부서의 고우선순위 메모리만 검색
memories = client.retrieve_memories(
    memory_id=memory_id,
    namespace="/support/tickets",
    query="환불 관련 이슈",
    metadata_filter={
        "department": "finance",
        "priority": "high"
    }
)
```

### 9.2 🆕 Record Streaming (2026년 3월)

메모리 레코드 변경 시 푸시 기반 알림 (폴링 제거):

| 이벤트 | 설명 |
|--------|------|
| **Created** | 새 메모리 레코드 생성 시 |
| **Updated** | 기존 레코드 갱신 시 |
| **Deleted** | 레코드 삭제 시 |

**활용 사례**:
- 다운스트림 워크플로 트리거 (메모리 변경 → 알림 발송)
- 에이전트 간 상태 변경 추적
- 이벤트 기반 아키텍처 구현

### 9.3 🆕 Resource-Based Policies (2026년 3월)

메모리 리소스에 직접 정책을 연결하여 세분화된 액세스 제어:

**기존 방식**: 새 주체(principal)마다 호출자 IAM 역할 업데이트 필요
**새 방식**: 메모리 리소스에 정책 직접 연결 → 호출자 역할 수정 불필요

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

### 9.4 메모리 전략 선택 가이드

| 시나리오 | 추천 전략 | 네임스페이스 예시 |
|----------|-----------|-----------------|
| 고객 선호도 기억 | 사용자 기본 설정 | `/users/{actorId}` |
| 대화 요약 | 요약 | `/summaries/{actorId}/{sessionId}` |
| 지식 축적 | 시맨틱 | `/knowledge/{topic}` |
| 🆕 문제 해결 이력 | 에피소드 | `/episodes/{actorId}` |
| 팀 공유 지식 | 시맨틱 | `/teams/{teamId}/shared` |

### 9.5 메모리 성능 최적화

| 최적화 영역 | 방법 |
|------------|------|
| **검색 정확도** | 적절한 네임스페이스 설계, 메타데이터 필터링 활용 |
| **저장 효율** | 적절한 TTL 설정, 중복 메모리 통합 (UPDATE/SKIP) |
| **비용 최적화** | 필요한 전략만 활성화, 검색 범위 제한 |
| **지연 시간** | 네임스페이스로 검색 범위 축소, 🆕 메타데이터 필터로 사전 필터링 |

### 9.6 도구 기반 vs 후크 기반 - 실전 선택 기준

```
도구 기반을 선택하는 경우:
├── 에이전트가 "언제 기억할지"를 스스로 판단해야 할 때
├── 복잡한 메모리 로직 (조건부 저장, 선택적 검색)
└── 프로토타입 단계 (빠른 실험)

후크 기반을 선택하는 경우:
├── 모든 대화를 일관되게 저장해야 할 때
├── 토큰 비용을 최소화해야 할 때
├── 예측 가능한 동작이 중요할 때 (프로덕션)
└── 메모리 저장/검색이 항상 필요한 경우
```

### 9.7 멀티 에이전트 메모리 공유 패턴

```
┌────────────────────┐         ┌──────────────────────────────┐
│    에이전트 A       │         │       AgentCore Memory        │
│   (고객 지원)       │────────▶│                              │
└────────────────────┘         │  /users/{userId}             │
                               │  /shared/knowledge           │
┌────────────────────┐         │                              │
│    에이전트 B       │────────▶│                              │
│   (기술 지원)       │         └──────────────────────────────┘
└────────────────────┘
```

- 같은 메모리 리소스를 여러 에이전트가 공유
- 네임스페이스로 접근 범위 분리
- 🆕 Resource-Based Policies로 교차 계정 공유 가능
- 🆕 Record Streaming으로 변경 사항 실시간 동기화

### 9.8 강의 토론 포인트

1. **"에이전트가 무엇을 기억해야 하고, 무엇을 잊어야 하는가?"**
   - 개인정보 보호 vs 개인화 트레이드오프
   - GDPR/개인정보 삭제 요청 대응 (DeleteMemoryRecord)

2. **"단기 메모리만으로 충분한 경우 vs 장기 메모리가 필요한 경우?"**
   - 단일 세션 Q&A → 단기 메모리만
   - 반복 방문 고객 → 장기 메모리 필수

3. **"메모리 전략을 어떻게 조합할 것인가?"**
   - 하나의 메모리 리소스에 여러 전략 동시 적용 가능
   - 예: 사용자 기본 설정 + 시맨틱 + 요약

### 🆕 9.9 Memory vs Knowledge Base (2026년 6월 NY Summit)

2026년 6월 AWS Summit New York에서 **Bedrock Managed Knowledge Base가 AgentCore에 GA**로
추가되면서, 학생들이 자주 혼동하는 "메모리 vs 지식 베이스"를 명확히 구분할 필요가 생겼습니다.

| 구분 | AgentCore Memory | Bedrock Managed Knowledge Base |
|------|------------------|--------------------------------|
| **저장 대상** | 에이전트가 대화에서 학습·기억하는 정보 | 조직의 기존 비정형 문서(SharePoint, Drive, Confluence, S3 등) |
| **생성 방식** | 대화 이벤트에서 자동 추출 | 데이터 소스 연결 → 관리형 수집·인덱싱 |
| **검색 방식** | 네임스페이스 기반 시맨틱 검색 | Agentic Retriever (다단계 쿼리 계획·연결·리랭킹) |
| **수명** | 사용자/세션 컨텍스트 | 조직 지식 (상대적으로 정적) |
| **대표 질문** | "이 사용자가 채식주의자라고 했던가?" | "회사 환불 정책 문서는 무엇이라고 적혀 있는가?" |

> **핵심**: 두 가지는 경쟁 관계가 아니라 **상호 보완적**입니다. 메모리는 "에이전트가 사용자에 대해
> 아는 것", Knowledge Base는 "조직이 보유한 지식"입니다. 프로덕션 에이전트는 보통 둘 다 사용합니다.
> (Knowledge Base 상세는 M04 모듈 10.8 참조)

---

## 교재 대비 변경 요약

| 교재 내용 (v1.0.4) | 현재 상태 (2026년 5월) |
|---------------------|----------------------|
| 메모리 전략 3가지 | **4가지** (+ 🆕 에피소드) |
| 기본 검색만 | **🆕 Structured Metadata Filtering** |
| 폴링 기반 변경 감지 | **🆕 Record Streaming** (푸시 기반) |
| IAM 역할 기반 접근만 | **🆕 Resource-Based Policies** (리소스 직접 정책) |
| 기본 관찰성 | **🆕 One-Click Observability** (Memory 원클릭 활성화) |
| 기본 VPC 지원 | VPC 지원 (2025년 9월부터) |
| 조직 지식 연결 별도 | 🆕 **NY Summit 2026**: Bedrock Managed Knowledge Base가 AgentCore에 추가 (메모리와 보완) |
| 비관리형 옵션 미언급 | 🆕 DynamoDB, ElastiCache, Aurora pgvector, OpenSearch, S3 Vectors, MemoryDB 활용 패턴 추가 |

---

## 참고 자료

- [AgentCore Memory 공식 문서](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/memory.html)
- [장기 메모리 메타데이터 필터링](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/long-term-memory-metadata.html)
- [메모리 레코드 스트리밍](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/memory-record-streaming.html)
- [Resource-Based Policies](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/resource-based-policies.html)
- [에피소드 메모리 전략](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/episodic-memory-strategy.html)
- [Strands Agents SDK - Memory](https://github.com/strands-agents/sdk-python)

### 비관리형 메모리 구현 관련

- [Build durable AI agents with LangGraph and Amazon DynamoDB](https://aws.amazon.com/blogs/database/build-durable-ai-agents-with-langgraph-and-amazon-dynamodb/)
- [Using DynamoDB as a checkpoint store for LangGraph agents](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/ddb-langgraph-checkpoint.html)
- [Setting up ElastiCache for Valkey as a vector store for agentic memory](https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/agentic-memory-setup.html)
- [Build persistent memory with Mem0, ElastiCache for Valkey, and Neptune Analytics](https://aws.amazon.com/blogs/database/build-persistent-memory-for-agentic-ai-applications-with-mem0-open-source-amazon-elasticache-for-valkey-and-amazon-neptune-analytics/)
- [How Letta builds production-ready AI agents with Amazon Aurora PostgreSQL](https://aws.amazon.com/blogs/database/how-letta-builds-production-ready-ai-agents-with-amazon-aurora-postgresql/)
- [Building persistent memory for multi-agent AI systems with Amazon S3 Vectors](https://aws.amazon.com/blogs/storage/building-persistent-memory-for-multi-agent-ai-systems-with-amazon-s3-vectors/)
- [Vector search for Amazon MemoryDB](https://aws.amazon.com/blogs/aws/vector-search-for-amazon-memorydb-is-now-generally-available/)
- [The next generation of OpenSearch Serverless: Built for agents](https://aws.amazon.com/blogs/big-data/the-next-generation-of-amazon-opensearch-serverless-built-from-the-ground-up-for-agents/)

---

*본 문서는 MLAGAC-10-KO-KR-M05-Memory_InstructorDeck.pdf의 내용을 기반으로 작성되었으며,
🆕 표시된 내용은 2026년 5월 기준 최신 서비스 업데이트를 반영한 강사 보충 자료입니다.*

*문서 버전: 2.2 | 작성일: 2026-05-28 | 최종 수정: 2026-06-26 | 업데이트 기준: 2026년 6월 AWS Summit New York 반영 + 비관리형 메모리 옵션 추가*
