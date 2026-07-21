import BreadcrumbGroup from '@cloudscape-design/components/breadcrumb-group';
import { useLocale } from '../contexts/LocaleContext.jsx';
import { getTranslations } from '../data/translations.js';

/**
 * 트리에서 targetId까지의 경로를 역추적하여 브레드크럼 배열을 생성한다.
 * 
 * @param {Array} tree - 계층적 내비게이션 트리 데이터
 * @param {string} targetId - 현재 활성 항목 ID
 * @returns {Array|null} - 🏠부터 현재 항목까지의 경로 배열, 또는 항목을 찾지 못하면 null
 */
export function buildBreadcrumbPath(tree, targetId) {
  function findPath(nodes, path) {
    for (const node of nodes) {
      const currentPath = [...path, { text: node.title, href: node.id }];
      if (node.id === targetId) return currentPath;
      if (node.children) {
        const result = findPath(node.children, currentPath);
        if (result) return result;
      }
    }
    return null;
  }
  return findPath(tree, [{ text: '🏠', href: 'home' }]);
}

/**
 * BreadcrumbNav - 현재 페이지의 계층 경로를 표시하는 브레드크럼 컴포넌트
 * Cloudscape BreadcrumbGroup을 활용한다.
 * 
 * @param {Object} props
 * @param {string} props.activeItemId - 현재 활성 항목 ID
 * @param {Array} props.navigationTree - 전체 내비게이션 트리
 * @param {function} props.onNavigate - 브레드크럼 세그먼트 클릭 시 콜백 (itemId를 전달)
 */
export default function BreadcrumbNav({ activeItemId, navigationTree, onNavigate }) {
  const { locale } = useLocale();
  const t = getTranslations(locale);

  // 브레드크럼 경로 계산
  const breadcrumbPath = buildBreadcrumbPath(navigationTree, activeItemId);

  // 경로를 찾지 못한 경우 홈만 표시
  const items = breadcrumbPath || [{ text: '🏠', href: 'home' }];

  const handleFollow = (event) => {
    event.preventDefault();
    const clickedHref = event.detail.href;
    if (onNavigate && clickedHref !== 'home') {
      onNavigate(clickedHref);
    }
  };

  return (
    <BreadcrumbGroup
      items={items}
      ariaLabel={t.breadcrumbLabel}
      onFollow={handleFollow}
    />
  );
}
