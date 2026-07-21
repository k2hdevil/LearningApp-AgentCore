import React, { useState, useEffect } from 'react';
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
import TreeNavigation from './components/TreeNavigation.jsx';
import DarkModeToggle from './components/DarkModeToggle.jsx';
import BreadcrumbNav from './components/BreadcrumbNav.jsx';
import TagBadges from './components/TagBadges.jsx';
import AppFooter from './components/AppFooter.jsx';
import { NAVIGATION_TREE, findNodeById } from './data/navigationTree.js';

/**
 * AppContent - 메인 레이아웃 컴포넌트
 * DarkModeProvider, ProgressProvider 내부에서 실제 앱 UI를 렌더링한다.
 */
function AppContent() {
  const { isDarkMode, toggleDarkMode } = useDarkMode();

  // 현재 활성 페이지 ID (초기값: 과정 소개)
  const [activePageId, setActivePageId] = useState('M00-CourseIntro_Summary');
  // 마크다운 콘텐츠 상태
  const [markdownContent, setMarkdownContent] = useState('');
  // 로딩 상태
  const [loading, setLoading] = useState(true);
  // 네비게이션 패널 열림/닫힘 상태
  const [navOpen, setNavOpen] = useState(window.innerWidth > 768);


  // 활성 페이지가 변경되면 콘텐츠 파일을 로드한다
  useEffect(() => {
    const node = findNodeById(NAVIGATION_TREE, activePageId);
    const contentFile = node?.contentFile;

    if (!contentFile) {
      setMarkdownContent('# 콘텐츠를 찾을 수 없습니다.');
      setLoading(false);
      return;
    }

    setLoading(true);
    fetch(`/content/${contentFile}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load');
        return res.text();
      })
      .then((text) => {
        setMarkdownContent(text);
        setLoading(false);
      })
      .catch(() => {
        setMarkdownContent('# 콘텐츠를 불러올 수 없습니다.');
        setLoading(false);
      });
  }, [activePageId]);

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
    const node = findNodeById(NAVIGATION_TREE, itemId);
    if (node?.contentFile) {
      setActivePageId(itemId);
    }
  };

  // 현재 활성 노드에서 타이틀과 태그 정보 조회
  const activeNode = findNodeById(NAVIGATION_TREE, activePageId);
  const pageTitle = activeNode?.title || '문서';
  const pageTags = activeNode?.tags || [];

  // TopNavigation utilities 구성
  const topNavUtilities = [
    {
      type: 'button',
      text: isDarkMode ? '☀️' : '🌙',
      ariaLabel: isDarkMode ? '라이트 모드로 전환' : '다크 모드로 전환',
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
              alt: 'Agentic AI Training Series 로고',
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
            navigationTree={NAVIGATION_TREE}
            activeItemId={activePageId}
            onItemSelect={handleItemSelect}
          />
        }
        content={
          <div>
            {/* 브레드크럼 네비게이션 */}
            <BreadcrumbNav
              activeItemId={activePageId}
              navigationTree={NAVIGATION_TREE}
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
                  <Spinner size="large" /> 로딩 중...
                </Box>
              ) : markdownContent ? (
                <div key={activePageId} className="module-content-transition">
                  <MarkdownRenderer content={markdownContent} />
                </div>
              ) : (
                <Alert type="error" header="콘텐츠 로드 실패">
                  콘텐츠를 불러올 수 없습니다.
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
          navigation: '사이드 내비게이션',
          navigationClose: '내비게이션 닫기',
          navigationToggle: '내비게이션 열기',
        }}
      />
    </div>
  );
}

/**
 * App - 최상위 컴포넌트
 * DarkModeProvider → ProgressProvider → AppContent 순서로 감싼다.
 */
function App() {
  return (
    <DarkModeProvider>
      <ProgressProvider>
        <AppContent />
      </ProgressProvider>
    </DarkModeProvider>
  );
}

export default App;
