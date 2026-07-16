# 모듈 2: AgentCore Runtime 및 프레임워크 통합

## Building Agentic AI with Amazon Bedrock AgentCore

---

## 목차

1. [에이전트 프레임워크 개요](#1-에이전트-프레임워크-개요)
2. [오픈소스 프레임워크 비교](#2-오픈소스-프레임워크-비교)
3. [AgentCore Runtime 개요](#3-agentcore-runtime-개요)
4. [Runtime 핵심 개념](#4-runtime-핵심-개념)
5. [세션 격리 및 수명 주기](#5-세션-격리-및-수명-주기)
6. [비동기 및 장기 실행 작업](#6-비동기-및-장기-실행-작업)
7. [인프라 및 배포](#7-인프라-및-배포)
8. [개발자 도구 및 경험](#8-개발자-도구-및-경험)
9. [지식 확인 및 핵심 정리](#9-지식-확인-및-핵심-정리)
10. [추가 Key Points - 강사 보충 자료](#10-추가-key-points---강사-보충-자료)

> 🆕 표시: 교재(v1.0.4, 2026년 4월 빌드) 이후 추가/변경된 내용

---

## 1. 에이전트 프레임워크 개요

### 프레임워크의 역할

에이전트 프레임워크는 에이전틱 루프의 오케스트레이션을 담당하는 소프트웨어 계층입니다.
AgentCore Runtime은 **프레임워크 독립적**으로 설계되어, 어떤 프레임워크든 호스팅할 수 있습니다.

### Strands Agents 예시

```python
from strands import Agent
from strands.models.bedrock import BedrockModel

bedrock_model = BedrockModel(model_id="<model id>")

recipe_agent = Agent(
    system_prompt=system_prompt,
    model=bedrock_model,
    tools=[websearch]
)

response = recipe_agent("닭고기와 브로콜리를 사용한 레시피를 추천해주세요.")
```

**핵심 포인트**: 에이전트 생성에 필요한 3가지 요소
- 시스템 프롬프트 (에이전트의 역할과 행동 지침)
- 모델 (추론 엔진)
- 도구 (외부 기능 확장)


### LangGraph 예시

```python
from typing import Annotated
from typing_extensions import TypedDict
from langgraph.graph import StateGraph
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode, tools_condition
from langchain_aws import ChatBedrock
from langchain_core.tools import tool

# 상태 정의
class State(TypedDict):
    messages: Annotated[list, add_messages]

# 도구 정의
@tool
def get_weather(city: str) -> str:
    """도시의 현재 날씨를 조회합니다."""
    return f"{city}: 맑음, 25°C"

# LLM + 도구 바인딩
tools = [get_weather]
llm_with_tools = ChatBedrock(
    model_id="anthropic.claude-sonnet-4-20250514",
    region_name="us-west-2"
).bind_tools(tools)

# 그래프 구성
def chatbot(state):
    return {"messages": [llm_with_tools.invoke(state["messages"])]}

graph_builder = StateGraph(State)
graph_builder.add_node("chatbot", chatbot)
graph_builder.add_node("tools", ToolNode(tools))
graph_builder.add_conditional_edges("chatbot", tools_condition)
graph_builder.add_edge("tools", "chatbot")
graph_builder.set_entry_point("chatbot")
graph = graph_builder.compile()

# 실행
result = graph.invoke({"messages": [("user", "서울 날씨 알려줘")]})
print(result["messages"][-1].content)
```

---

## 2. 오픈소스 프레임워크 비교

| 프레임워크 | 이점 | 고려 사항 |
|-----------|------|-----------|
| **Strands SDK** | • 최소한의 보일러플레이트, 모델 중심<br>• 기본 제공 다중 에이전트 패턴<br>• 프로덕션용 관찰성 및 AWS 최적화 | • 모델 중심 설계로 제어 어려울 수 있음<br>• 소규모 커뮤니티<br>• LLM 추론에 의존 |
| **CrewAI** | • 명확한 역할 기반 에이전트 설정<br>• 강력한 단기/장기 메모리<br>• 양질의 문서, 활발한 커뮤니티 | • 독자적이며 커스터마이즈 어려움<br>• 제한된 외부 에이전트 지원 |
| **LangGraph** | • 복잡한 상태 흐름 처리<br>• BYO 에이전트 (함수/체인형 노드)<br>• LangChain 커뮤니티 활용 | • 버전 간 불안정<br>• LangChain/Core 스택 의존<br>• 엣지 케이스 시 추상화 실패 가능 |
| **LlamaIndex** | • 고급 RAG 및 인덱싱<br>• 구성 가능한 쿼리 엔진<br>• 기본 제공 RAG 평가/추적 | • 외부 오케스트레이터 필요<br>• 인덱스/임베딩 튜닝에 민감<br>• API 변동 시 코드 업데이트 필요 |

### 프레임워크 선택 가이드

| 사용 사례 | 추천 프레임워크 |
|-----------|---------------|
| AWS 네이티브, 빠른 프로토타입 | Strands Agents |
| 복잡한 상태 머신, 조건부 분기 | LangGraph |
| 역할 기반 멀티 에이전트 팀 | CrewAI |
| RAG 중심 애플리케이션 | LlamaIndex |
| 🆕 코드 없이 빠른 시작 | AgentCore Managed Harness |

---

## 3. AgentCore Runtime 개요

### Runtime이란?

AgentCore Runtime은 에이전트를 위한 **완전관리형 서버리스 호스팅 인프라**입니다.
인프라 관리 없이 에이전트를 배포, 실행, 스케일링할 수 있습니다.

### 핵심 기능 4가지

| 기능 | 설명 |
|------|------|
| **프레임워크/모델/프로토콜 유연성** | 모든 오픈소스 프레임워크, 모든 모델(Bedrock/SageMaker/외부), MCP/A2A 프로토콜 지원 |
| **세션 격리** | 각 세션이 완전히 격리된 microVM에서 실행 (컴퓨팅 + 메모리 + 파일시스템) |
| **대형 페이로드 멀티모달** | 텍스트/이미지/오디오/비디오 양방향 스트리밍, 최대 100MB 페이로드 |
| **실시간 및 장기 실행** | 빠른 초기화(최대 200ms), 장기 실행 비동기 워크로드(최대 8시간) |


### 비관리형(Self-Managed) 대안: AWS 서비스로 에이전트 런타임 직접 구성

AgentCore Runtime을 사용하지 않고도 기존 AWS 컴퓨팅 서비스를 조합하여 에이전트 런타임을 직접 구성할 수 있습니다. 아래는 주요 대안과 장단점입니다.

#### 대안 1: AWS Lambda

에이전트 오케스트레이션 로직을 Lambda 함수로 구현하는 방식입니다.

| 장점 | 단점 |
|------|------|
| 완전 서버리스, 인프라 관리 불필요 | 최대 실행 시간 15분 제한 → 장기 실행 에이전트 부적합 |
| 호출당 과금으로 비용 효율적 (간헐적 트래픽) | 콜드 스타트 지연 (50~200ms+, 패키지 크기에 따라 증가) |
| 자동 스케일링 | 세션 격리 없음 (동일 함수 인스턴스 재사용) |
| AWS 서비스 통합 용이 (API Gateway, Step Functions) | 스테이트풀 대화 유지 어려움 (외부 저장소 필요) |
| | 파일시스템 제한적 (/tmp 512MB~10GB, 임시) |

#### 대안 2: Amazon ECS (Fargate)

에이전트를 컨테이너로 패키징하여 ECS Fargate에서 실행하는 방식입니다.

| 장점 | 단점 |
|------|------|
| 실행 시간 무제한, 장기 실행 워크로드 적합 | 세션 격리를 직접 구현해야 함 (컨테이너 수준) |
| 서버 관리 불필요 (Fargate) | 유휴 상태에서도 비용 발생 (태스크 실행 시간 과금) |
| EFS/S3 마운트 가능 | 스케일링 정책 직접 구성 필요 |
| 사이드카 패턴으로 MCP 서버 동시 호스팅 가능 | Observability 직접 구성 (OTEL, CloudWatch 에이전트) |
| 네트워크 구성 유연 (VPC, 서비스 디스커버리) | 버전 관리/카나리 배포 직접 구현 필요 |

#### 대안 3: Amazon EKS (Kubernetes)

Kubernetes 클러스터에서 에이전트를 Pod로 실행하는 방식입니다.

| 장점 | 단점 |
|------|------|
| 최대 유연성, 세밀한 리소스 제어 | 운영 복잡도 높음 (클러스터 관리, 노드 업그레이드) |
| 멀티클라우드/하이브리드 호환 | 팀에 Kubernetes 전문성 필요 |
| HPA/KEDA로 정교한 오토스케일링 | 초기 설정 비용 및 시간 소요 |
| Spot 인스턴스로 비용 최적화 가능 | 보안 패치, 네트워크 정책 직접 관리 |
| GPU 노드풀로 로컬 모델 추론 가능 | 소규모 워크로드에는 과도한 오버헤드 |

##### EKS 기반 에이전트 런타임 아키텍처

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      AWS Cloud (VPC)                                    │
│                                                                         │
│  👤 사용자 ──▶ ALB (HTTPS/WebSocket)                                      │
│                     │                                                   │
│         ┌───────────┴───────────┐                                       │
│         ▼                       ▼                                       │
│  ┌─────────────────────┐ ┌─────────────────────┐                       │
│  │   에이전트 Pod 1      │ │   에이전트 Pod 2.      │                       │
│  │ ┌─────────────────┐ │ │ ┌─────────────────┐ │                       │
│  │ │Agent Container  │ │ │ │Agent Container  │ │     ┌─────────────┐   │
│  │ │(Strands/LangGraph)│ │ │(Strands/LangGraph)│.    │ MCP Server  │   │
│  │ ├─────────────────┤ │ │ ├─────────────────┤ │     │ Pod         │   │
│  │ │Sidecar: OTEL    │ │ │ │Sidecar: OTEL    │ │     │ (공유 도구)   │   │
│  │ └─────────────────┘ │ │ └─────────────────┘ │     └─────────────┘   │
│  └──────────┬──────────┘ └──────────┬──────────┘           ▲           │
│             │                       │                       │          │
│             └───────────┬───────────┘                       │          │
│                         │                                   │          │
│         ┌───────────────┼───────────────────────────────────┘          │
│         │               │                                              │
│         ▼               ▼                                              │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐   │
│  │Amazon Bedrock│ │Amazon        │ │ Amazon EFS   │ │ CloudWatch   │   │
│  │(모델 추론)     │ │DynamoDB      │ │(공유 파일)     │ │(로그/메트릭).   │   │
│  └──────────────┘ │(세션 상태)     │ └──────────────┘ └──────────────┘   │
│                   └──────────────┘                                     │
│                                                                        │
│  ┌──────────────┐   ┌──────┐                                           │
│  │ Amazon ECR   │╌╌▶│ EKS  │ (이미지 Pull)                               │
│  │(컨테이너)      │   └──────┘                                           │
│  └──────────────┘                                                      │
│                    HPA: 오토스케일링                                       │
└─────────────────────────────────────────────────────────────────────────┘
```

**구성 요소 설명**:
- **ALB**: HTTPS 종료, 경로 기반 라우팅, 웹소켓 지원
- **에이전트 Pod**: 에이전트 컨테이너 + OTEL 사이드카로 구성
- **HPA**: CPU/메모리 또는 커스텀 메트릭 기반 오토스케일링
- **DynamoDB**: 멀티 턴 대화의 세션 상태 저장 (세션 격리 직접 구현)
- **EFS**: Pod 간 공유 파일시스템 (프롬프트 템플릿, 공유 데이터)
- **ECR**: 에이전트 컨테이너 이미지 저장소
- **Bedrock**: LLM 추론 호출 (IAM 역할 기반 인증 via Pod Identity)

##### Terraform 템플릿 예제

아래는 EKS 기반 에이전트 런타임 인프라를 프로비저닝하기 위한 Terraform 구성의 핵심 부분입니다.

```hcl
# =============================================================================
# providers.tf - 프로바이더 설정
# =============================================================================

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.25"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.12"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# =============================================================================
# variables.tf - 변수 정의
# =============================================================================

variable "aws_region" {
  description = "AWS 리전"
  type        = string
  default     = "us-west-2"
}

variable "cluster_name" {
  description = "EKS 클러스터 이름"
  type        = string
  default     = "agent-runtime-cluster"
}

variable "cluster_version" {
  description = "EKS Kubernetes 버전"
  type        = string
  default     = "1.30"
}

variable "agent_image" {
  description = "에이전트 컨테이너 이미지 URI"
  type        = string
}

variable "environment" {
  description = "배포 환경 (dev/staging/prod)"
  type        = string
  default     = "dev"
}

# =============================================================================
# vpc.tf - VPC 및 네트워킹
# =============================================================================

module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "${var.cluster_name}-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["${var.aws_region}a", "${var.aws_region}b", "${var.aws_region}c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]

  enable_nat_gateway   = true
  single_nat_gateway   = var.environment != "prod"
  enable_dns_hostnames = true

  # EKS 요구 태그
  private_subnet_tags = {
    "kubernetes.io/role/internal-elb" = 1
  }
  public_subnet_tags = {
    "kubernetes.io/role/elb" = 1
  }
}

# =============================================================================
# eks.tf - EKS 클러스터
# =============================================================================

module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.0"

  cluster_name    = var.cluster_name
  cluster_version = var.cluster_version

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  # Pod Identity로 Bedrock 접근
  enable_cluster_creator_admin_permissions = true

  cluster_addons = {
    coredns                = {}
    kube-proxy             = {}
    vpc-cni                = {}
    eks-pod-identity-agent = {}
  }

  eks_managed_node_groups = {
    # 에이전트 워크로드용 노드 그룹
    agent_nodes = {
      ami_type       = "AL2023_x86_64_STANDARD"
      instance_types = ["m6i.large", "m6i.xlarge"]

      min_size     = 2
      max_size     = 10
      desired_size = 2

      labels = {
        workload = "agent"
      }
    }

    # (선택) GPU 노드 - 로컬 모델 추론 시
    # gpu_nodes = {
    #   ami_type       = "AL2023_x86_64_NVIDIA"
    #   instance_types = ["g5.xlarge"]
    #   min_size       = 0
    #   max_size       = 3
    #   desired_size   = 0
    #   labels = { workload = "gpu-inference" }
    #   taints = [{ key = "nvidia.com/gpu", value = "true", effect = "NO_SCHEDULE" }]
    # }
  }
}

# =============================================================================
# iam.tf - Bedrock 접근을 위한 IAM (Pod Identity)
# =============================================================================

resource "aws_iam_role" "agent_pod_role" {
  name = "${var.cluster_name}-agent-pod-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "pods.eks.amazonaws.com"
      }
      Action = ["sts:AssumeRole", "sts:TagSession"]
    }]
  })
}

resource "aws_iam_role_policy" "bedrock_access" {
  name = "bedrock-invoke-model"
  role = aws_iam_role.agent_pod_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "bedrock:InvokeModel",
          "bedrock:InvokeModelWithResponseStream"
        ]
        Resource = "arn:aws:bedrock:${var.aws_region}::foundation-model/*"
      },
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query"
        ]
        Resource = aws_dynamodb_table.session_state.arn
      }
    ]
  })
}

resource "aws_eks_pod_identity_association" "agent" {
  cluster_name    = module.eks.cluster_name
  namespace       = "agent-runtime"
  service_account = "agent-sa"
  role_arn        = aws_iam_role.agent_pod_role.arn
}

# =============================================================================
# dynamodb.tf - 세션 상태 저장소
# =============================================================================

resource "aws_dynamodb_table" "session_state" {
  name         = "${var.cluster_name}-session-state"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "session_id"
  range_key    = "turn_id"

  attribute {
    name = "session_id"
    type = "S"
  }

  attribute {
    name = "turn_id"
    type = "N"
  }

  ttl {
    attribute_name = "expires_at"
    enabled        = true
  }

  tags = {
    Environment = var.environment
    Purpose     = "agent-session-state"
  }
}

# =============================================================================
# efs.tf - 공유 파일시스템
# =============================================================================

resource "aws_efs_file_system" "agent_shared" {
  creation_token = "${var.cluster_name}-shared-fs"
  encrypted      = true

  tags = {
    Name = "${var.cluster_name}-shared-fs"
  }
}

resource "aws_efs_mount_target" "agent_shared" {
  count           = length(module.vpc.private_subnets)
  file_system_id  = aws_efs_file_system.agent_shared.id
  subnet_id       = module.vpc.private_subnets[count.index]
  security_groups = [aws_security_group.efs.id]
}

resource "aws_security_group" "efs" {
  name_prefix = "${var.cluster_name}-efs-"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port       = 2049
    to_port         = 2049
    protocol        = "tcp"
    security_groups = [module.eks.node_security_group_id]
  }
}

# =============================================================================
# helm.tf - Kubernetes 워크로드 배포 (OTEL Collector, ALB Controller)
# =============================================================================

resource "helm_release" "aws_load_balancer_controller" {
  name       = "aws-load-balancer-controller"
  repository = "https://aws.github.io/eks-charts"
  chart      = "aws-load-balancer-controller"
  namespace  = "kube-system"

  set {
    name  = "clusterName"
    value = module.eks.cluster_name
  }
}

resource "helm_release" "otel_collector" {
  name       = "otel-collector"
  repository = "https://open-telemetry.github.io/opentelemetry-helm-charts"
  chart      = "opentelemetry-collector"
  namespace  = "observability"
  create_namespace = true

  values = [<<-EOT
    mode: sidecar
    config:
      exporters:
        awsxray: {}
        awscloudwatchlogs:
          log_group_name: "/aws/eks/${var.cluster_name}/agent-traces"
      service:
        pipelines:
          traces:
            exporters: [awsxray]
          logs:
            exporters: [awscloudwatchlogs]
  EOT
  ]
}
```

```yaml
# =============================================================================
# kubernetes/agent-deployment.yaml - 에이전트 Deployment 매니페스트
# =============================================================================

apiVersion: v1
kind: Namespace
metadata:
  name: agent-runtime
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: agent-sa
  namespace: agent-runtime
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ai-agent
  namespace: agent-runtime
spec:
  replicas: 2
  selector:
    matchLabels:
      app: ai-agent
  template:
    metadata:
      labels:
        app: ai-agent
    spec:
      serviceAccountName: agent-sa
      containers:
        - name: agent
          image: "${AGENT_IMAGE}"   # Terraform 변수로 치환
          ports:
            - containerPort: 8080
          env:
            - name: AWS_REGION
              value: "us-west-2"
            - name: SESSION_TABLE_NAME
              value: "agent-runtime-cluster-session-state"
            - name: BEDROCK_MODEL_ID
              value: "anthropic.claude-sonnet-4-20250514"
          resources:
            requests:
              cpu: "500m"
              memory: "1Gi"
            limits:
              cpu: "2000m"
              memory: "4Gi"
          volumeMounts:
            - name: shared-data
              mountPath: /mnt/shared
          livenessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 10
            periodSeconds: 30
          readinessProbe:
            httpGet:
              path: /ready
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 10
      volumes:
        - name: shared-data
          persistentVolumeClaim:
            claimName: agent-efs-pvc
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: ai-agent-hpa
  namespace: agent-runtime
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: ai-agent
  minReplicas: 2
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 60
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 70
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ai-agent-ingress
  namespace: agent-runtime
  annotations:
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: ip
    alb.ingress.kubernetes.io/listen-ports: '[{"HTTPS": 443}]'
    alb.ingress.kubernetes.io/healthcheck-path: /health
spec:
  ingressClassName: alb
  rules:
    - http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: ai-agent-svc
                port:
                  number: 80
---
apiVersion: v1
kind: Service
metadata:
  name: ai-agent-svc
  namespace: agent-runtime
spec:
  type: ClusterIP
  selector:
    app: ai-agent
  ports:
    - port: 80
      targetPort: 8080
```

> **참고**: 위 Terraform 예제는 핵심 인프라 구성을 보여주는 것으로, 프로덕션 환경에서는 추가로 WAF, Secrets Manager 연동, 네트워크 정책(Calico/Cilium), Pod Disruption Budget, 모니터링 대시보드 등을 구성해야 합니다.

#### 대안 4: Amazon EC2

EC2 인스턴스에서 에이전트 서버를 직접 실행하는 방식입니다.

| 장점 | 단점 |
|------|------|
| 완전한 OS 수준 제어 | 서버 패치, 스케일링, 모니터링 모두 수동 |
| GPU 인스턴스로 로컬 모델 추론 가능 | 고가용성 직접 구성 (ALB, ASG) |
| 장기 예약으로 비용 절감 (Reserved/Savings Plans) | 유휴 시간에도 비용 지속 발생 |
| 디버깅 및 프로파일링 직접 접근 | 세션 격리, 보안 경계 모두 직접 구현 |

#### AgentCore Runtime vs 비관리형 비교 요약

| 비교 항목 | AgentCore Runtime | Lambda | ECS Fargate | EKS |
|-----------|-------------------|--------|-------------|-----|
| **세션 격리** | microVM 자동 | 없음 | 컨테이너 수준 (직접 구현) | Pod 수준 (직접 구현) |
| **최대 실행 시간** | 8시간 | 15분 | 무제한 | 무제한 |
| **콜드 스타트** | ~200ms | 50~200ms+ | 수십 초 (태스크 시작) | 수십 초 (Pod 스케줄링) |
| **파일시스템** | Managed Storage + S3/EFS | /tmp (임시) | EFS 마운트 | EBS/EFS |
| **Observability** | 자동 통합 | 직접 구성 | 직접 구성 | 직접 구성 |
| **Identity 통합** | 내장 (인바운드/아웃바운드) | IAM 직접 설정 | IAM 직접 설정 | IRSA/Pod Identity |
| **스케일링** | 자동 | 자동 | 정책 필요 | HPA/KEDA 필요 |
| **운영 부담** | 최소 | 낮음 | 중간 | 높음 |
| **비용 모델** | 세션 기반 | 호출 기반 | 태스크 실행 시간 | 노드 실행 시간 |
| **적합한 경우** | 에이전트 전용 프로덕션 | 간단한 에이전트, 간헐적 호출 | 장기 실행, 사이드카 필요 | 멀티클라우드, GPU, 대규모 |

> **강사 포인트**: AgentCore Runtime의 핵심 차별점은 **microVM 기반 세션 격리**와 **에이전트 전용 수명주기 관리**입니다. 비관리형 방식에서는 세션 격리, 멀티 턴 대화 상태 유지, 비동기 태스크 관리, Identity 연동 등을 모두 직접 구현해야 하며, 이는 상당한 엔지니어링 오버헤드를 수반합니다. 반면, 기존 인프라 투자가 있거나 에이전트 외 워크로드와 통합이 필요한 경우 비관리형 방식이 더 적합할 수 있습니다.

---

### 에이전틱 구성 요소 호스팅

AgentCore Runtime은 에이전트뿐 아니라 MCP 서버도 호스팅할 수 있습니다:

```
                    ┌───────────┐
                    │ 클라이언트   │
                    └─────┬─────┘
                          ▼
                    ┌───────────────┐
                    │ 감독자 에이전트.  │
                    └───┬───┬───┬───┘
                        │   │   │
        ┌───────────────┘   │   └───────────────┐
        ▼                   ▼                   ▼
┌─────────────────────────────────────────────────────────┐
│ 고객 AWS 계정                                             │
│                                                         │
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────┐ │
│ │AgentCore Runtime│ │AgentCore Runtime│ │  AgentCore  │ │
│ │                 │ │                 │ │   Gateway   │ │
│ │  에이전트 1       │ │  MCP 서버        │ │             │ │
│ │  + 로컬 도구      │ │  도구1, 도구2      │ │ 외부 도구/    │ │
│ │                 │ │                 │ │ API         │ │
│ └─────────────────┘ └─────────────────┘ └─────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## 4. Runtime 핵심 개념

### 4.1 런타임 및 호스팅

에이전트 코드를 실행하는 호스팅 계층. 서버리스로 관리되며 인프라 프로비저닝 불필요.

### 4.2 엔드포인트 및 버전

특정 에이전트 버전에 대한 주소 지정 가능한 액세스 포인트.

**버전 관리 흐름**:

```
1단계: 에이전트 생성 + 기본 엔드포인트 (DEFAULT)
───────────────────────────────────────────────
  에이전트 V1 ←── DEFAULT 엔드포인트
  
2단계: 프로덕션 엔드포인트 생성
───────────────────────────────────────────────
  에이전트 V1 ←── DEFAULT 엔드포인트
             ←── PROD 엔드포인트
  
3단계: 에이전트 업데이트 (V2)
───────────────────────────────────────────────
  에이전트 V2 ←── DEFAULT 엔드포인트 (최신 버전)
  에이전트 V1 ←── PROD 엔드포인트 (안정 버전 유지)
```

**호출 방식**:
```
POST /runtimes/{EncodedAgentARN}/invocations?accountId=accountId
POST /runtimes/{EncodedAgentARN}/invocations?accountId=accountId&qualifier=PROD
```

### 4.3 세션

사용자 상호 작용을 위한 격리된 실행 컨텍스트. 각 세션은 독립된 microVM에서 실행됩니다.

---

## 5. 세션 격리 및 수명 주기

### True 세션 격리

AgentCore Runtime의 가장 중요한 보안 특성:

```
┌─────────────────────────────────────────────────────────────────┐
│                      AgentCore Runtime                          │
│                                                                 │
│  ┌─────────────────────────┐   ┌─────────────────────────┐      │
│  │    MicroVM 커널 1        │   │    MicroVM 커널 2       │       │
│  │  ┌────────┬──────┬────┐ │   │  ┌────────┬──────┬────┐ │     │
│  │  │컴퓨팅    │메모리 │파일  │ │  │  │컴퓨팅    │메모리. │파일│ │      │
│  │  │        │      │시스 │ │   │  │        │      │시스│ │      │
│  │  │        │      │템   │ │   │  │        │      │템  │ │     │
│  │  └────────┴──────┴────┘ │   │  └────────┴──────┴────┘ │     │
│  └────────────┬─────────────┘   └──────────┬──────────────┘    │
│               │     ❌ 접근 불가            │                   │
│               └╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┘                   │
└────────────────────────────────────────────────────────────────┘
```

**완전 격리: 세션 간 데이터 접근 불가**

**핵심 포인트**:
- 각 세션이 **완전히 격리된 microVM** (컴퓨팅 + 메모리 + 파일시스템)에서 실행
- 세션을 격리하지 않으면 세션 전체에서 로컬 파일 및 상태에 접근 가능 → 보안 위험
- 스테이트풀: 세션 내에서 상태를 안전하게 보존
- 단기/장기 세션 중단 상태에 AgentCore Memory 사용


### 세션 수명 주기

```
          ●
          │ 요청 수신
          ▼
┌──────────────────────────────────┐
│ 세션활성                         │
│ 동기 요청 처리 중                │
│ 또는 백그라운드 태스크 수행 중   │
└────────────┬─────────────────────┘
             │ 처리 완료
             ▼
┌──────────────────────────────────┐
│ 세션유휴                         │◀─── 새 요청 (세션활성으로 복귀)
│ 처리 완료, 이후 호출 대기        │
└────────────┬─────────────────────┘
             │ 15분 유휴
             ▼
┌──────────────────────────────────┐
│ 세션시간제한                     │
│ 15분 유휴 후 실행 환경 종료      │
└────────────┬─────────────────────┘
             │ 환경 종료
             ▼
┌──────────────────────────────────┐
│ 세션종료                         │
│ 실행 환경 완전 종료              │
└──────────────────────────────────┘

* 요청 시간 제한: 15분 | 스트리밍: 60분 | 최대 세션 기간: 8시간 (비동기)
```

| 상태 | 설명 |
|------|------|
| **세션 활성** | 동기화 요청 처리 중 또는 백그라운드 태스크 수행 중 |
| **세션 유휴** | 처리 완료, 이후 호출에 사용 가능 |
| **세션 시간 제한** | 15분 유휴 후 실행 환경 종료 |
| **세션 종료** | 실행 환경 완전 종료 |

🆕 **Managed Session Storage**: 세션이 종료되어도 파일시스템 상태를 유지 (최대 1GB, 14일 보존). 에이전트가 코드 작성, 패키지 설치, 아티팩트 생성 후 세션 재개 시 상태 복원 가능.

---

## 6. 비동기 및 장기 실행 작업

### 비동기 태스크 패턴

에이전트가 장시간 작업(보고서 생성, 데이터 분석 등)을 백그라운드에서 실행하면서
사용자에게 즉시 응답을 반환하는 패턴:

```python
@tool
def start_background_task(duration: int = 5) -> str:
    # 비동기 태스크 추적 시작
    task_id = app.add_async_task("report_generation", 
                                 {"duration": duration})
    
    # 백그라운드 스레드에서 태스크 실행
    def background_work():
        # 작업 로직 (데이터 분석, 보고서 생성 등)
        app.complete_async_task(task_id)  # 완료로 표시
    
    threading.Thread(target=background_work, daemon=True).start()
    return f"백그라운드 작업(ID: {task_id})이 {duration}초 동안 시작되었습니다."
```

**핵심 포인트**:
- 최대 8시간까지 장기 실행 가능
- 세션이 활성 상태로 유지되어 상태 보존
- 사용자는 즉시 응답을 받고, 나중에 결과 조회 가능

🆕 **Shell Command Execution** (`InvokeAgentRuntimeCommand`):
- microVM 내에서 셸 명령을 직접 실행 (모델 추론 없이)
- HTTP/2 스트리밍으로 실시간 출력
- 테스트, 빌드, 배포 등 결정적 작업에 적합
- 토큰 비용 없이 에이전트 리소스를 추론에 집중

---

## 7. 인프라 및 배포

### 배포 방식 비교

```
┌─────────────────────────────────────────────────────────────────────┐
│ 방식 1: 컨테이너 기반 배포                                          │
│   에이전트 코드 + Dockerfile ──▶ Amazon ECR ──▶ Runtime 엔드포인트  │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ 방식 2: 직접 코드 배포                                              │
│   에이전트 코드 (.zip) ──────────────────────▶ Runtime 엔드포인트   │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ 🆕 방식 3: Managed Harness                                          │
│   구성 파일 (모델+프롬프트+도구) ──2 API 호출──▶ Runtime 엔드포인트 │
└─────────────────────────────────────────────────────────────────────┘
```

**방식별 특성**:
- **방식 1**: 최대 유연성, 커스텀 의존성, 모든 프레임워크 지원
- **방식 2**: 빠른 배포, 간단한 패키징, Python 🆕 + Node.js 지원
- **🆕 방식 3**: 오케스트레이션 코드 불필요, 격리된 microVM, 모든 모델 공급자 지원 (GA - 2026년 6월 NY Summit)


### 컨테이너 기반 배포 상세

배포에 필요한 구성 요소:

| 구성 요소 | 역할 |
|-----------|------|
| 에이전트 코드 | 에이전트 로직 (프레임워크 + 도구) |
| Dockerfile | 컨테이너 이미지 정의 |
| AgentCore Runtime 데코레이터 | 에이전트 진입점 (`@app.entrypoint`) |
| AgentCore Observability 구성 | 모니터링/추적 설정 |
| AgentCore Identity 구성 | 인증/권한 부여 설정 |
| Runtime 엔드포인트 구성 | 스케일링, 타임아웃, 리소스 |

### 직접 코드 배포 상세

컨테이너 없이 .zip 파일로 배포:
- Python 또는 🆕 Node.js 런타임 지원
- 🆕 Python 3.14 지원
- Dockerfile 불필요
- 빠른 반복 개발에 적합

---

## 8. 개발자 도구 및 경험

### AgentCore SDK (Python) - 에이전트 생성

```python
# agent.py - AgentCore SDK를 사용한 에이전트 코드
from bedrock_agentcore.runtime import BedrockAgentCoreApp
from strands import Agent
from strands.models.bedrock import BedrockModel

app = BedrockAgentCoreApp()

@app.entrypoint
def my_agent(request):
    """에이전트 진입점 - AgentCore Runtime이 /invocations로 호출합니다."""
    model = BedrockModel(model_id="anthropic.claude-sonnet-4-20250514")
    agent = Agent(
        system_prompt="당신은 도움이 되는 AI 어시스턴트입니다.",
        model=model
    )
    response = agent(request.get("input", ""))
    return {"output": str(response)}

if __name__ == "__main__":
    app.run()
```

**핵심**: `@app.entrypoint` 데코레이터가 Runtime과의 통합 포인트

### 컨테이너 이미지 빌드 - Dockerfile 예제

AgentCore Runtime에 컨테이너 기반으로 배포하려면 에이전트를 Docker 이미지로 패키징해야 합니다.

**AgentCore Runtime 컨테이너 요구사항**:
- **아키텍처**: ARM64 필수 (`--platform linux/arm64`)
- **엔드포인트**: `/invocations` (POST) - 에이전트 호출, `/ping` (GET) - 상태 확인
- **포트**: 8080 (기본)

```dockerfile
# Dockerfile
# AgentCore Runtime은 ARM64 아키텍처를 요구합니다
FROM --platform=linux/arm64 python:3.12-slim

WORKDIR /app

# 시스템 의존성 설치
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Python 의존성 설치
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 에이전트 코드 복사
COPY agent.py .

# AgentCore Runtime이 상태 확인에 사용하는 포트
EXPOSE 8080

# 에이전트 시작
ENTRYPOINT ["python", "agent.py"]
```

```text
# requirements.txt
bedrock-agentcore>=1.0.0
strands-agents>=0.1.0
strands-agents-builder>=0.1.0
boto3>=1.35.0
```

**이미지 빌드 및 ECR 푸시**:

```bash
# ARM64 이미지 빌드 (Apple Silicon Mac에서는 네이티브, x86에서는 크로스 빌드)
docker build --platform linux/arm64 -t my-agent:latest .

# ECR 로그인
aws ecr get-login-password --region us-west-2 | \
  docker login --username AWS --password-stdin 123456789012.dkr.ecr.us-west-2.amazonaws.com

# 태깅 및 푸시
docker tag my-agent:latest 123456789012.dkr.ecr.us-west-2.amazonaws.com/my-agent:latest
docker push 123456789012.dkr.ecr.us-west-2.amazonaws.com/my-agent:latest
```

> **참고**: 위 Dockerfile 구조는 [AWS 공식 문서 - Get started without the AgentCore CLI](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/getting-started-custom.html)에서 명시한 요구사항(ARM64, `/invocations` POST, `/ping` GET 엔드포인트)을 기반으로 합니다. `BedrockAgentCoreApp`이 이 엔드포인트들을 자동으로 처리합니다.

### AgentCore Runtime (boto3) - 에이전트 배포

에이전트 코드를 작성한 후, boto3의 `bedrock-agentcore-control` 클라이언트를 사용하여 Runtime에 배포합니다.

```python
import boto3

client = boto3.client("bedrock-agentcore-control", region_name="us-west-2")

# 1단계: 에이전트 런타임 생성 (컨테이너 기반 배포)
response = client.create_agent_runtime(
    agentRuntimeName="my-customer-service-agent",
    description="고객 서비스 에이전트",
    roleArn="arn:aws:iam::123456789012:role/AgentCoreRuntimeRole",
    agentRuntimeArtifact={
        "containerConfiguration": {
            "containerUri": "123456789012.dkr.ecr.us-west-2.amazonaws.com/my-agent:latest"
        }
    },
    networkConfiguration={
        "networkMode": "PUBLIC"  # 또는 "VPC" (프라이빗 리소스 접근 시)
    }
)

agent_runtime_arn = response["agentRuntimeArn"]
print(f"Runtime 생성됨: {agent_runtime_arn}")
```

```python
# 1단계 (대안): 직접 코드 배포 (CodeZip)
import base64

with open("agent_package.zip", "rb") as f:
    zip_content = f.read()

response = client.create_agent_runtime(
    agentRuntimeName="my-agent-codezip",
    description="직접 코드 배포 에이전트",
    roleArn="arn:aws:iam::123456789012:role/AgentCoreRuntimeRole",
    agentRuntimeArtifact={
        "codeConfiguration": {
            "runtime": "python3.12",       # python3.10 ~ python3.14, nodejs20.x 등
            "entryHandler": "agent.main",   # 모듈.함수명
            "sourceCode": {
                "zipContent": zip_content   # .zip 바이너리
            }
        }
    },
    networkConfiguration={
        "networkMode": "PUBLIC"
    }
)
```

```python
# 2단계: 에이전트 런타임 엔드포인트 생성
endpoint_response = client.create_agent_runtime_endpoint(
    agentRuntimeId=response["agentRuntimeId"],
    agentRuntimeEndpointName="prod",
    description="프로덕션 엔드포인트"
)

endpoint_id = endpoint_response["agentRuntimeEndpointId"]
print(f"엔드포인트 생성됨: {endpoint_id}")
```

```python
# 3단계: 에이전트 호출 (Data Plane)
data_client = boto3.client("bedrock-agentcore", region_name="us-west-2")

invoke_response = data_client.invoke_agent_runtime(
    agentRuntimeArn=agent_runtime_arn,
    payload={
        "input": "최근 주문 상태를 확인하고 싶습니다."
    },
    sessionId="user-session-001",    # 세션 격리를 위한 고유 세션 ID
    qualifier="prod"                 # 엔드포인트 한정자 (생략 시 DEFAULT)
)

print(invoke_response["output"])
```

> **참고**: 위 코드는 boto3 `bedrock-agentcore-control` (Control Plane) 및 `bedrock-agentcore` (Data Plane) 클라이언트의 API 구조를 기반으로 작성되었습니다. 정확한 파라미터명은 배포 시점의 boto3 버전에 따라 달라질 수 있으므로, [공식 boto3 문서](https://docs.aws.amazon.com/boto3/latest/reference/services/bedrock-agentcore-control.html)를 참조하세요.

### AgentCore 스타터 도구 키트 - 에이전트 배포

```bash
# 1. 배포 리소스, IAM 역할 및 인증 설정
agentcore configure

# 2. AgentCore Runtime에 배포
agentcore launch

# 3. 페이로드로 간접 호출
agentcore invoke
```

### 🆕 AgentCore CLI (GA) - 전체 수명주기 관리

```bash
# 프로젝트 생성 (프레임워크 선택)
agentcore init --framework strands

# 로컬 개발 (핫 리로드 + Agent Inspector UI)
agentcore dev

# 기능 추가
agentcore add memory
agentcore add identity
agentcore add gateway

# 프로덕션 배포
agentcore deploy

# 모니터링
agentcore logs
agentcore traces

# 리소스 정리
agentcore teardown
```

**Agent Inspector** (`agentcore dev` 실행 시 브라우저 UI):
- 에이전트와 실시간 채팅
- 토큰 사용량 및 도구 호출 검사
- 실행 트레이스 타임라인 시각화
- AgentCore Memory 브라우징

### 접근 방식 비교

| 기준 | 스타터 도구 키트 | 도구 키트 없음 | 🆕 AgentCore CLI |
|------|-----------------|---------------|-----------------|
| **자동화 수준** | ECR 관리, 배포 자동화 | 수동 제어 | 전체 수명주기 자동화 |
| **유연성** | 중간 | 최대 | 높음 |
| **적합한 경우** | 빠른 시작 | 기업 통합, 고급 구성 | 일반적 개발 워크플로 |
| **로컬 개발** | 제한적 | 수동 | 핫 리로드 + Inspector |


### 스타터 도구 키트 없이 시작하기 (수동 배포)

1. 에이전트의 관찰성 활성화
2. uv 설치 (빠른 Python 패키지 관리자)
3. 에이전트 코드 정의:
   - `/invocations` 엔드포인트: 에이전트 상호 작용을 위한 POST
   - `/ping` 엔드포인트: 상태 확인을 위한 GET
4. 로컬 테스트
5. Dockerfile 생성
6. Amazon ECR에 배포
7. 에이전트 런타임 배포

---

## 9. 지식 확인 및 핵심 정리

### 지식 확인 문제

**문제 1**: AgentCore Runtime의 세션 격리 접근 방식의 주요 보안 이점은?
- ✅ **정답: B** - 별도의 컴퓨팅, 메모리, 파일시스템을 갖춘 완전히 격리된 microVM에서 각 세션을 실행
- 핵심: microVM 수준의 격리가 핵심 (단순 프로세스 격리가 아님)

**문제 2**: 장시간 데이터 분석 + 즉각적 사용자 응답 + 상태 유지를 위한 기능은?
- ✅ **정답: C** - 비동기 태스크 처리를 통한 컨테이너 기반 배포
- 핵심: 비동기 태스크 + 세션 상태 유지 + 최대 8시간 실행

### 모듈 학습 목표 달성 확인

이 모듈을 완료하면 다음을 수행할 수 있습니다:
- ✅ AgentCore Runtime에서 지원되는 프레임워크를 사용하여 에이전트를 배포
- ✅ AgentCore Runtime의 핵심 기능을 설명
- ✅ 세션 격리를 통한 서버리스 실행을 구성

---

## 10. 추가 Key Points - 강사 보충 자료

### 10.1 🆕 Managed Harness 심화

Managed Harness는 "가장 빠른 경로"로, 프레임워크 코드 없이 에이전트를 실행합니다:

```
┌─────────────────────────────────────────────────────────────────────┐
│ 개발자가 정의                                                       │
│                                                                     │
│  모델               시스템         도구            메모리    Identity │
│  (Bedrock,          프롬프트       (MCP 서버,     구성      설정     │
│   Anthropic,                       Gateway)                         │
│   OpenAI, Gemini)                                                   │
└─────────────────────────────────────┬───────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│ AgentCore가 관리                                                    │
│                                                                     │
│  에이전틱 루프        응답          세션 격리     Observability  비용 │
│  (추론→도구선택       스트리밍      (microVM)    (자동)         제어 │
│   →실행→응답)                                                       │
└─────────────────────────────────────┬───────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 추가 기능                                                           │
│                                                                     │
│  Shell Command Execution    영구 파일시스템    S3 Files / EFS 마운트 │
└─────────────────────────────────────────────────────────────────────┘
```

**🆕 Harness GA (2026년 6월 NY Summit)**:

2026년 6월 AWS Summit New York에서 Harness가 정식 출시(GA)되었습니다. 핵심 업데이트:

| 항목 | 내용 |
|------|------|
| **2개 API로 구축** | `CreateHarness`로 에이전트 정의, `InvokeHarness`로 실행 |
| **구성 기반 정의** | 모델, 도구, 스킬(skills), 지침(instructions)을 구성으로 선언하면 AgentCore가 루프를 조립·실행 |
| **격리 환경 내장** | 파일시스템 + 셸, 세션 간 메모리, 스킬(AWS 큐레이션 카탈로그 포함), 웹 브라우징 기본 제공 |
| **모델 독립적** | 모델과 harness를 분리 → 에이전트 로직 변경 없이 세션 중간에 모델 전환 가능 |
| **코드로 내보내기 (export to code)** | 커스텀 오케스트레이션이 필요하면 harness를 코드로 내보내 동일 플랫폼에서 계속 사용 (재구축 불필요) |
| **단일 플랫폼 통합** | 동일 Gateway를 통해 도구·보안 정책·조직 지식·웹 검색·유료 서비스에 연결, Identity/Memory/Observability 자동 적용 |

> **핵심 메시지**: "처음 선언한 에이전트가 천 번째 호출에서 운영하는 에이전트와 같다" -
> 시작 구성을 그대로 스케일에서 운영. 시작용 도구가 아니라 프로덕션 기반.

### 10.2 🆕 Runtime 성능 최적화

최근 업데이트로 Runtime 성능이 크게 개선되었습니다:

| 개선 항목 | 내용 |
|-----------|------|
| **순차 호출 25-35% 빠름** | 인증 토큰 30분 캐싱으로 중복 토큰 요청 제거 |
| **플랫폼 오버헤드 TM99 35% 감소** | PDX 리전 기준 |
| **빠른 초기화** | 최대 200ms 콜드 스타트 |

### 10.3 🆕 파일시스템 지원

에이전트가 파일을 읽고 쓸 수 있는 3가지 방식:

| 방식 | 특성 | 사용 사례 |
|------|------|-----------|
| **Managed Session Storage** | 세션 간 유지, 1GB, 14일 | 코드 작성, 패키지 설치, 아티팩트 |
| **Amazon S3 Files** | S3 버킷과 자동 동기화 | 공유 데이터, 프롬프트 템플릿 |
| **Amazon EFS** | 서브밀리초 지연, NFS 공유 | 실시간 협업, 대용량 데이터셋 |

마운트 설정:
- `CreateRuntime` 또는 `UpdateRuntime` 시 구성
- 최대 5개 마운트 동시 사용 가능
- 커스텀 마운트 코드 불필요, 표준 파일 작업으로 접근

### 10.4 🆕 AG-UI 프로토콜 지원

Agent User Interface 프로토콜로 프론트엔드와 실시간 통신:

- 텍스트 청크 스트리밍
- 추론 단계 실시간 표시
- 도구 호출 및 결과 시각화
- 상태 동기화 (UI 요소)
- 양방향 WebSocket 전송
- CopilotKit과 공식 파트너십 (AgentCore = 권장 배포 대상)

### 10.5 Runtime 보안 모범 사례

| 영역 | 권장 사항 |
|------|-----------|
| **네트워크** | VPC 배포로 프라이빗 리소스 접근, PrivateLink로 컨트롤/데이터 플레인 보호 |
| **인증** | JWT Bearer 또는 IAM SigV4, 🆕 OAuth WebSocket 인증 |
| **IAM** | 최소 권한 실행 역할, 🆕 VPC 조건 키 (`bedrock-agentcore:Subnets`, `SecurityGroups`) |
| **세션** | microVM 격리 활용, 민감 데이터는 세션 종료 시 자동 삭제 |
| **감사** | Observability 활성화, 모든 에이전트 작업 추적 |

### 10.6 MCP 서버 호스팅 전략

Runtime에서 MCP 서버를 호스팅하는 두 가지 방식:

| 방식 | 장점 | 적합한 경우 |
|------|------|------------|
| **로컬 호스팅** (에이전트와 같은 Runtime) | 지연 시간 최소화, 관리 오버헤드 감소, 프로세스 격리 | 빈번한 호출, 낮은 지연 필요 |
| **원격 호스팅** (별도 Runtime) | 독립적 스케일링, 여러 에이전트 간 도구 공유, 스택 유연성 | 공유 도구, 독립 배포 |

🆕 **Stateful MCP 지원**: Runtime에서 호스팅되는 MCP 서버가 세션 컨텍스트를 유지하여 Elicitation, Sampling, Progress Notifications 등 고급 기능 사용 가능

### 10.7 AgentCore Runtime 한계 및 고려사항

AgentCore Runtime을 채택하기 전에 알아야 할 제약사항과 고려사항입니다.

#### 서비스 할당량 (Quotas)

| 항목 | 기본 한도 | 비고 |
|------|-----------|------|
| **동시 세션 수** | us-east-1, us-west-2: 1,000 / 기타 리전: 500 | 증가 요청 가능 |
| **세션 유휴 타임아웃** | 15분 (900초) | 유휴 상태에서 자동 종료 |
| **최대 세션 기간** | 8시간 (28,800초) | 세션 자체는 새 인스턴스로 계속 가능 |
| **종료 유예 시간** | 최대 15초 | 로깅/프로세스 완료 대기 |
| **셸 세션** | 런타임당 최대 10개 동시 활성 | 초과 시 새 연결 거부 |
| **Managed Session Storage** | 1GB, 14일 보존 | |
| **파일시스템 마운트** | 최대 5개 동시 | |

> 출처: [Quotas for Amazon Bedrock AgentCore](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/bedrock-agentcore-limits.html)

#### 아키텍처 제약

| 제약 | 영향 | 대응 방안 |
|------|------|-----------|
| **ARM64 전용** | x86_64 이미지 사용 불가. 크로스 빌드 필수 | `docker buildx build --platform linux/arm64` 사용 |
| **15분 유휴 종료** | 장기 대기 중 세션이 예기치 않게 종료될 수 있음 | `add_async_task()`로 세션 활성 유지 또는 lifecycle 설정 조정 |
| **세션 간 상태 공유 불가** | microVM 격리로 세션 간 메모리/파일 직접 공유 불가 | AgentCore Memory 또는 외부 저장소(DynamoDB, S3) 사용 |
| **VPC 설정 시 NAT Gateway 필요** | VPC 모드에서 인터넷 접근 시 추가 비용 발생 | PUBLIC 모드 또는 VPC 엔드포인트 활용 |

#### 비용 고려사항

| 고려 항목 | 상세 |
|-----------|------|
| **활성 리소스 소비 기반 과금** | I/O 대기 및 유휴 시간은 무료 (다른 백그라운드 프로세스가 없는 경우) |
| **워밍업 비용** | 비활성 후 재시작 시 콜드 스타트 발생. 워밍 풀 유지 시 기본 비용 증가 |
| **고빈도 단순 호출 시** | 단순 요청/응답 패턴(세션 불필요)은 Lambda가 더 비용 효율적일 수 있음 |
| **LLM 토큰 비용 별도** | Runtime 비용과 Bedrock 모델 호출 비용이 분리되어 청구됨 |

> 출처: [Amazon Bedrock AgentCore Pricing](https://aws.amazon.com/bedrock/agentcore/pricing/)

#### 리전 가용성

AgentCore Runtime은 모든 AWS 리전에서 사용 가능하지 않습니다. 주요 리전(us-east-1, us-west-2, eu-west-1, ap-northeast-1 등)에서 사용 가능하며, 서울 리전(ap-northeast-2)은 2026년 1월부터 지원됩니다. 최신 가용 리전은 [공식 엔드포인트 문서](https://docs.aws.amazon.com/general/latest/gr/bedrock_agentcore.html)를 확인하세요.

#### AgentCore Runtime을 사용하지 않는 것이 나은 경우

| 상황 | 이유 | 대안 |
|------|------|------|
| 단순 요청/응답, 세션 불필요 | microVM 격리 오버헤드가 불필요한 비용 | Lambda |
| x86_64 전용 라이브러리 의존 | ARM64 빌드 불가능한 네이티브 바이너리 | ECS/EKS (x86) |
| 기존 Kubernetes 인프라 활용 | 이미 운영 중인 클러스터에 통합이 효율적 | EKS + 직접 구현 |
| GPU 로컬 추론 필요 | AgentCore Runtime은 GPU 인스턴스 미지원 | EKS GPU 노드 또는 EC2 GPU |
| 멀티클라우드/하이브리드 요구 | AWS 전용 서비스 | Kubernetes (EKS/GKE/AKS) |
| 세밀한 네트워크/보안 제어 필요 | 관리형 서비스의 네트워크 구성 제한 | ECS/EKS + 커스텀 VPC |

> 출처: [When to Use Bedrock AgentCore Runtime (vs Lambda)](https://virtuability.com/blog/2026-03-27-when-to-use-agentcore/) 참고로 정리

### 10.8 강의 토론 포인트

1. **"에이전트를 배포할 때 어떤 Runtime 기능을 활용하겠습니까?"**
   - 세션 격리, 비동기 태스크, 파일시스템, 버전 관리

2. **"컨테이너 vs 직접 코드 vs Harness - 어떤 방식을 선택하겠습니까?"**
   - 복잡도, 유연성, 개발 속도 트레이드오프

3. **"8시간 장기 실행이 필요한 실제 사용 사례는?"**
   - 대규모 데이터 분석, 코드 생성/테스트, 문서 처리

---

## 교재 대비 변경 요약

| 교재 내용 (v1.0.4) | 현재 상태 (2026년 5월) |
|---------------------|----------------------|
| 배포 방식 2가지 | **3가지** (+ Managed Harness, 🆕 NY Summit 2026 GA) |
| Python 직접 코드만 | **Python + Node.js** (+ Python 3.14) |
| CLI 언급 없음 | **AgentCore CLI GA** (v0.4.0) |
| 세션 종료 시 상태 소실 | **Managed Session Storage** (1GB, 14일) |
| 파일시스템 없음 | **S3 Files + EFS 마운트** (최대 5개) |
| 기본 스트리밍 | **AG-UI Protocol + 양방향 WebSocket** |
| 기본 성능 | **25-35% 지연 시간 개선** |
| 기본 MCP 호스팅 | **Stateful MCP** (Elicitation, Sampling) |
| 기본 셸 접근 없음 | **InvokeAgentRuntimeCommand** (직접 셸 실행) |

---

## 참고 자료

- [AgentCore Runtime 공식 문서](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime.html)
- [AgentCore CLI 시작하기](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/agentcore-get-started-cli.html)
- [Managed Harness 문서](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/harness.html)
- [Runtime 파일시스템 구성](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-filesystem-configurations.html)
- [Strands Agents SDK](https://github.com/strands-agents/sdk-python)
- [AgentCore CLI GitHub](https://github.com/aws/agentcore-cli)

---

*본 문서는 MLAGAC-10-KO-KR-M02-Runtime_InstructorDeck.pdf의 내용을 기반으로 작성되었으며,
🆕 표시된 내용은 2026년 5월 기준 최신 서비스 업데이트를 반영한 강사 보충 자료입니다.*

*문서 버전: 2.1 | 작성일: 2026-05-28 | 최종 수정: 2026-06-23 | 업데이트 기준: 2026년 6월 AWS Summit New York 반영*
