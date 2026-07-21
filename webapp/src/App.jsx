import React, { useState, useEffect, useMemo } from 'react';
import AppLayout from '@cloudscape-design/components/app-layout';
import TopNavigation from '@cloudscape-design/components/top-navigation';

import Header from '@cloudscape-design/components/header';
import Container from '@cloudscape-design/components/container';
import Spinner from '@cloudscape-design/components/spinner';
import Box from '@cloudscape-design/components/box';
import Alert from '@cloudscape-design/components/alert';
import MarkdownRenderer from './components/MarkdownRenderer.jsx';
import { ProgressProvider } from './contexts/ProgressContext.jsx';
import { DarkModeProvider, useDarkMode } from './contexts/DarkModeContext.jsx';
import { LocaleProvider, useLocale } from './contexts/LocaleContext.jsx';
import TreeNavigation from './components/TreeNavigation.jsx';
import DarkModeToggle from './components/DarkModeToggle.jsx';
import BreadcrumbNav from './components/BreadcrumbNav.jsx';
import TagBadges from './components/TagBadges.jsx';
import AppFooter from './components/AppFooter.jsx';
import { NAVIGATION_TREE, findNodeById, getLocalizedTree } from './data/navigationTree.js';
import { getTranslations } from './data/translations.js';

/**
 * AppContent - 메인 레이아웃 컴포넌트
 * DarkModeProvider, LocaleProvider, ProgressProvider 내부에서 실제 앱 UI를 렌더링한다.
 */
function AppContent() {
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const { locale, toggleLocale } = useLocale();
  const t = getTranslations(locale);

  // 로케일에 맞는 내비게이션 트리 생성
  const localizedTree = useMemo(() => getLocalizedTree(NAVIGATION_TREE, locale), [locale]);

  // 현재 활성 페이지 ID (초기값: 과정 소개)
  const [activePageId, setActivePageId] = useState('M00-CourseIntro_Summary');
  // 마크다운 콘텐츠 상태
  const [markdownContent, setMarkdownContent] = useState('');
  // 로딩 상태
  const [loading, setLoading] = useState(true);
  // 네비게이션 패널 열림/닫힘 상태
  const [navOpen, setNavOpen] = useState(window.innerWidth > 768);


  // 활성 페이지 또는 로케일이 변경되면 콘텐츠 파일을 로드한다
  useEffect(() => {
    const node = findNodeById(NAVIGATION_TREE, activePageId);
    const contentFile = node?.contentFile;

    if (!contentFile) {
      setMarkdownContent(t.contentNotFound);
      setLoading(false);
      return;
    }

    // 로케일에 따라 콘텐츠 경로를 분기한다
    // Korean: /content/{file}, English: /content/en/{file}
    const contentPath = locale === 'en' ? `/content/en/${contentFile}` : `/content/${contentFile}`;

    setLoading(true);
    fetch(contentPath)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load');
        return res.text();
      })
      .then((text) => {
        setMarkdownContent(text);
        setLoading(false);
      })
      .catch(() => {
        setMarkdownContent(t.contentLoadFailed);
        setLoading(false);
      });
  }, [activePageId, locale]);

  // TreeNavigation 항목 선택 핸들러
  const handleItemSelect = (itemId) => {
    setActivePageId(itemId);
    // 모바일에서 네비게이션 선택 후 자동 닫힘
    if (window.innerWidth <= 768) {
      setNavOpen(false);
    }
  };

  // 브레드크럼 네비게이션 클릭 핸들러
  const handleBreadcrumbNavigate = (itemId) => {
    // 카테고리/시리즈 노드를 클릭한 경우 무시 (리프 노드만 이동)
    const node = findNodeById(localizedTree, itemId);
    if (node?.contentFile) {
      setActivePageId(itemId);
    }
  };

  // 현재 활성 노드에서 타이틀과 태그 정보 조회 (로케일 적용된 트리에서)
  const activeNode = findNodeById(localizedTree, activePageId);
  const pageTitle = activeNode?.title || t.defaultPageTitle;
  const pageTags = activeNode?.tags || [];

  // TopNavigation utilities 구성
  const topNavUtilities = [
    {
      type: 'button',
      text: t.languageToggleLabel,
      ariaLabel: t.languageToggleLabel,
      onClick: toggleLocale,
    },
    {
      type: 'button',
      text: isDarkMode ? '☀️' : '🌙',
      ariaLabel: isDarkMode ? t.lightModeToggle : t.darkModeToggle,
      onClick: toggleDarkMode,
      disableUtilityCollapse: true,
    },
  ];

  return (
    <div>
      {/* TopNavigation: 다크 배경 스타일 */}
      <div id="top-nav">
        <TopNavigation
          identity={{
            title: 'Agentic AI Training Series',
            href: '#',
            logo: {
              src: '/images/training-logo.svg',
              alt: t.logoAlt,
            },
          }}
          utilities={topNavUtilities}
        />
      </div>

      {/* AppLayout: 사이드 네비게이션 + 콘텐츠 영역 */}
      <AppLayout
        headerSelector="#top-nav"
        navigationOpen={navOpen}
        onNavigationChange={({ detail }) => setNavOpen(detail.open)}
        navigation={
          <TreeNavigation
            navigationTree={localizedTree}
            activeItemId={activePageId}
            onItemSelect={handleItemSelect}
          />
        }
        content={
          <div>
            {/* 브레드크럼 네비게이션 */}
            <BreadcrumbNav
              activeItemId={activePageId}
              navigationTree={localizedTree}
              onNavigate={handleBreadcrumbNavigate}
            />
            {/* 페이지 타이틀 및 태그 뱃지 */}
            <Header variant="h1">
              {pageTitle}
            </Header>
            <TagBadges tags={pageTags} />
            {/* 마크다운 콘텐츠 컨테이너 */}
            <Container>
              {loading ? (
                <Box textAlign="center" padding="l">
                  <Spinner size="large" /> {t.loading}
                </Box>
              ) : markdownContent ? (
                <div key={`${activePageId}-${locale}`} className="module-content-transition">
                  <MarkdownRenderer content={markdownContent} />
                </div>
              ) : (
                <Alert type="error" header={t.contentLoadErrorHeader}>
                  {t.contentLoadErrorMessage}
                </Alert>
              )}
            </Container>
            {/* 페이지 하단 푸터 */}
            <AppFooter />
          </div>
        }
        toolsHide={true}
        navigationWidth={280}
        ariaLabels={{
          navigation: t.sideNavLabel,
          navigationClose: t.sideNavClose,
          navigationToggle: t.sideNavToggle,
        }}
      />
    </div>
  );
}

/**
 * App - 최상위 컴포넌트
 * DarkModeProvider → LocaleProvider → ProgressProvider → AppContent 순서로 감싼다.
 */
function App() {
  return (
    <DarkModeProvider>
      <LocaleProvider>
        <ProgressProvider>
          <AppContent />
        </ProgressProvider>
      </LocaleProvider>
    </DarkModeProvider>
  );
}

export default App;
