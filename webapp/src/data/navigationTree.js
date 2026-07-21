/**
 * 계층적 내비게이션 트리 데이터 구조
 * 시리즈(최상위) > 카테고리(중간) > 개별 항목(하위) 3단계 계층
 *
 * 각 노드는 titleKey를 통해 translations.js의 nav 객체에서 로케일별 제목을 조회한다.
 */

import { getTranslations } from './translations.js';

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
 * 내비게이션 트리 데이터 (로케일 독립적 구조)
 * title 필드는 기본값(Korean)으로 유지하며, titleKey를 통해 번역을 조회한다.
 * @type {NavigationNode[]}
 */
export const NAVIGATION_TREE = [
  {
    id: 'series-agentcore',
    title: 'Building Agentic AI with Amazon Bedrock AgentCore',
    titleKey: 'seriesTitle',
    type: 'series',
    children: [
      {
        id: 'M00-CourseIntro_Summary',
        title: '모듈 0: 과정 소개',
        titleKey: 'module0',
        type: 'item',
        contentFile: 'M00-CourseIntro_Summary.md',
        tags: [{ label: 'Amazon Bedrock', category: 'service' }],
      },
      {
        id: 'M01-Foundations_Summary',
        title: '모듈 1: 에이전틱 AI 패턴의 기초',
        titleKey: 'module1',
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
        titleKey: 'module2',
        type: 'item',
        contentFile: 'M02-Runtime_Summary.md',
        tags: [{ label: 'AgentCore Runtime', category: 'service' }],
      },
      {
        id: 'M03-SecurityAndIdentity_Summary',
        title: '모듈 3: 보안 및 자격 증명 관리',
        titleKey: 'module3',
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
        titleKey: 'module4',
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
        titleKey: 'module5',
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
        titleKey: 'module6',
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
        titleKey: 'module7',
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
        titleKey: 'lab1Download',
        type: 'download',
        downloadFile: 'L01-notebook_ko_kr.ipynb',
      },
    ],
  },
];

/**
 * 로케일에 맞게 트리 노드의 title을 번역된 값으로 교체하여 반환한다.
 * 원본 NAVIGATION_TREE를 변경하지 않는다.
 * @param {Array} tree - 내비게이션 트리
 * @param {string} locale - 'ko' | 'en'
 * @returns {Array} 번역된 title이 적용된 트리
 */
export function getLocalizedTree(tree, locale) {
  const t = getTranslations(locale);
  const navTranslations = t.nav;

  function localizeNode(node) {
    const localizedTitle = node.titleKey && navTranslations[node.titleKey]
      ? navTranslations[node.titleKey]
      : node.title;

    const localizedNode = { ...node, title: localizedTitle };

    if (node.children) {
      localizedNode.children = node.children.map(localizeNode);
    }

    return localizedNode;
  }

  return tree.map(localizeNode);
}
