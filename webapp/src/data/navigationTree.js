/**
 * 계층적 내비게이션 트리 데이터 구조
 * 시리즈(최상위) > 카테고리(중간) > 개별 항목(하위) 3단계 계층
 */

/**
 * 트리에서 ID로 노드를 검색하는 유틸리티 함수
 * 재귀적으로 모든 자식 노드를 탐색한다.
 * @param {Array} tree - 내비게이션 트리 배열
 * @param {string} id - 검색할 노드 ID
 * @returns {Object|null} 찾은 노드 또는 null
 */
export function findNodeById(tree, id) {
  for (const node of tree) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findNodeById(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

/**
 * 내비게이션 트리 데이터
 * @type {NavigationNode[]}
 */
export const NAVIGATION_TREE = [
  {
    id: 'series-agentcore',
    title: 'Building Agentic AI with Amazon Bedrock AgentCore',
    type: 'series',
    children: [
      {
        id: 'M00-CourseIntro_Summary',
        title: '모듈 0: 과정 소개',
        type: 'item',
        contentFile: 'M00-CourseIntro_Summary.md',
        tags: [{ label: 'Amazon Bedrock', category: 'service' }],
      },
      {
        id: 'M01-Foundations_Summary',
        title: '모듈 1: 에이전틱 AI 패턴의 기초',
        type: 'item',
        contentFile: 'M01-Foundations_Summary.md',
        tags: [
          { label: 'Strands Agents SDK', category: 'sdk' },
          { label: 'Amazon Bedrock', category: 'service' },
        ],
        isNew: true,
      },
      {
        id: 'M02-Runtime_Summary',
        title: '모듈 2: AgentCore Runtime 및 프레임워크 통합',
        type: 'item',
        contentFile: 'M02-Runtime_Summary.md',
        tags: [{ label: 'AgentCore Runtime', category: 'service' }],
      },
      {
        id: 'M03-SecurityAndIdentity_Summary',
        title: '모듈 3: 보안 및 자격 증명 관리',
        type: 'item',
        contentFile: 'M03-SecurityAndIdentity_Summary.md',
        tags: [
          { label: 'IAM', category: 'service' },
          { label: 'Security', category: 'concept' },
        ],
      },
      {
        id: 'M04-ToolsAndGateway_Summary',
        title: '모듈 4: AgentCore와의 도구 통합',
        type: 'item',
        contentFile: 'M04-ToolsAndGateway_Summary.md',
        tags: [
          { label: 'API Gateway', category: 'service' },
          { label: 'Tools', category: 'tool' },
        ],
      },
      {
        id: 'M05-Memory_Summary',
        title: '모듈 5: 에이전틱 메모리 구현',
        type: 'item',
        contentFile: 'M05-Memory_Summary.md',
        tags: [
          { label: 'AgentCore Memory', category: 'service' },
          { label: 'Context Management', category: 'concept' },
        ],
        isNew: true,
      },
      {
        id: 'M06-DeploymentObservability_Summary',
        title: '모듈 6: 프로덕션 모니터링 및 관찰성',
        type: 'item',
        contentFile: 'M06-DeploymentObservability_Summary.md',
        tags: [
          { label: 'Observability', category: 'concept' },
          { label: 'CloudWatch', category: 'service' },
        ],
      },
      {
        id: 'M07-NewFeatures_Summary',
        title: '모듈 7: AgentCore 서비스의 신규 기능',
        type: 'item',
        contentFile: 'M07-NewFeatures_Summary.md',
        tags: [
          { label: 'Managed Harness', category: 'service' },
          { label: 'Code Interpreter', category: 'tool' },
        ],
        isNew: true,
      },
      {
        id: 'L01-notebook-download',
        title: '📥 실습 1: AgentCore Jupyter Notebook 다운로드',
        type: 'download',
        downloadFile: 'L01-notebook_ko_kr.ipynb',
      },
    ],
  },
];
