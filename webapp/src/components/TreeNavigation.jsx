import Badge from '@cloudscape-design/components/badge';
import SideNavigation from '@cloudscape-design/components/side-navigation';

/**
 * 트리 노드를 검색 쿼리로 필터링하는 함수 (검색 기능 확장용)
 * 매칭 항목 및 해당 부모 노드만 반환한다.
 * @param {Array} nodes - 내비게이션 노드 배열
 * @param {string} query - 검색 쿼리 문자열
 * @returns {Array} 필터링된 노드 배열
 */
export function filterTree(nodes, query) {
  if (!query) return nodes;
  const lowerQuery = query.toLowerCase();
  return nodes.reduce((acc, node) => {
    const titleMatch = node.title.toLowerCase().includes(lowerQuery);
    const filteredChildren = node.children
      ? filterTree(node.children, query)
      : [];
    if (titleMatch || filteredChildren.length > 0) {
      acc.push({ ...node, children: node.children ? filteredChildren : undefined });
    }
    return acc;
  }, []);
}

/**
 * navigationTree 데이터를 Cloudscape SideNavigation items 형식으로 변환한다.
 * - series → section (접을 수 있는 그룹, 기본 확장)
 * - 개별 모듈 → link (href에 모듈 id를 프래그먼트로 사용)
 * - download 타입 → 외부 링크 (파일 다운로드)
 * - isNew → info 슬롯에 NEW Badge
 * @param {Array} navigationTree - 계층적 내비게이션 트리
 * @returns {Array} SideNavigation items 배열
 */
export function toSideNavigationItems(navigationTree) {
  return navigationTree.map((series) => ({
    type: 'section',
    text: series.title,
    items: (series.children || []).map((item) => {
      // 다운로드 타입: 외부 링크로 처리하여 파일 다운로드 유도
      if (item.type === 'download') {
        return {
          type: 'link',
          text: item.title,
          href: `/content/${item.downloadFile}`,
          external: true,
          info: item.isNew ? <Badge color="blue">NEW</Badge> : undefined,
        };
      }
      return {
        type: 'link',
        text: item.title,
        href: `#${item.id}`,
        info: item.isNew ? <Badge color="blue">NEW</Badge> : undefined,
      };
    }),
  }));
}

/**
 * TreeNavigation - Cloudscape SideNavigation 기반 모듈 내비게이션
 *
 * 라우터가 없으므로 href에 모듈 id 프래그먼트(#id)를 사용하고,
 * onFollow에서 기본 이동을 막은 뒤 onItemSelect 콜백으로 활성 페이지를 전환한다.
 * 접근성·키보드 탐색·활성 항목 표시는 SideNavigation이 기본 제공한다.
 *
 * @param {Object} props
 * @param {Array} props.navigationTree - 계층적 내비게이션 트리
 * @param {string} props.activeItemId - 현재 활성 모듈 id
 * @param {function} props.onItemSelect - 항목 선택 콜백 (모듈 id 전달)
 */
function TreeNavigation({ navigationTree, activeItemId, onItemSelect }) {
  const items = toSideNavigationItems(navigationTree);

  return (
    <SideNavigation
      activeHref={`#${activeItemId}`}
      items={items}
      onFollow={(event) => {
        // 외부 링크(다운로드)는 기본 동작 허용
        if (event.detail.external) {
          return;
        }
        event.preventDefault();
        onItemSelect(event.detail.href.replace(/^#/, ''));
      }}
    />
  );
}

export default TreeNavigation;
