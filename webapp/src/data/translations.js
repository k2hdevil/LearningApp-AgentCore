/**
 * UI 번역 문자열 정의
 * 각 로케일별 UI 라벨을 관리한다.
 */

const translations = {
  ko: {
    // TopNavigation
    logoAlt: 'Agentic AI Training Series 로고',
    darkModeToggle: '다크 모드로 전환',
    lightModeToggle: '라이트 모드로 전환',
    languageToggleLabel: 'English',

    // AppLayout
    sideNavLabel: '사이드 내비게이션',
    sideNavClose: '내비게이션 닫기',
    sideNavToggle: '내비게이션 열기',

    // Content loading
    contentNotFound: '# 콘텐츠를 찾을 수 없습니다.',
    contentLoadFailed: '# 콘텐츠를 불러올 수 없습니다.',
    loading: '로딩 중...',
    contentLoadErrorHeader: '콘텐츠 로드 실패',
    contentLoadErrorMessage: '콘텐츠를 불러올 수 없습니다.',

    // BreadcrumbNav
    breadcrumbLabel: '브레드크럼 내비게이션',

    // AppFooter
    footerText:
      '© 2025 콘텐츠로 활용 가능하도록 AWS T&C 공식 교육 자료가 아닙니다. 감사가 🤖 Kiro 를 활용하여 빌드 제작하였습니다. 일부 오류가 있을 수 있습니다.',

    // Navigation tree titles
    nav: {
      seriesTitle: 'Building Agentic AI with Amazon Bedrock AgentCore',
      module0: '모듈 0: 과정 소개',
      module1: '모듈 1: 에이전틱 AI 패턴의 기초',
      module2: '모듈 2: AgentCore Runtime 및 프레임워크 통합',
      module3: '모듈 3: 보안 및 자격 증명 관리',
      module4: '모듈 4: AgentCore와의 도구 통합',
      module5: '모듈 5: 에이전틱 메모리 구현',
      module6: '모듈 6: 프로덕션 모니터링 및 관찰성',
      module7: '모듈 7: AgentCore 서비스의 신규 기능',
      lab1Download: '📥 실습 1: AgentCore Jupyter Notebook 다운로드',
    },

    // Default page title
    defaultPageTitle: '문서',
  },

  en: {
    // TopNavigation
    logoAlt: 'Agentic AI Training Series Logo',
    darkModeToggle: 'Switch to dark mode',
    lightModeToggle: 'Switch to light mode',
    languageToggleLabel: '한국어',

    // AppLayout
    sideNavLabel: 'Side navigation',
    sideNavClose: 'Close navigation',
    sideNavToggle: 'Open navigation',

    // Content loading
    contentNotFound: '# Content not found.',
    contentLoadFailed: '# Failed to load content.',
    loading: 'Loading...',
    contentLoadErrorHeader: 'Content load failed',
    contentLoadErrorMessage: 'Unable to load content.',

    // BreadcrumbNav
    breadcrumbLabel: 'Breadcrumb navigation',

    // AppFooter
    footerText:
      '© 2025 This is not official AWS T&C training material. Built with 🤖 Kiro for educational purposes. Some errors may exist.',

    // Navigation tree titles
    nav: {
      seriesTitle: 'Building Agentic AI with Amazon Bedrock AgentCore',
      module0: 'Module 0: Course Introduction',
      module1: 'Module 1: Foundations of Agentic AI Patterns',
      module2: 'Module 2: AgentCore Runtime & Framework Integration',
      module3: 'Module 3: Security & Credential Management',
      module4: 'Module 4: Tool Integration with AgentCore',
      module5: 'Module 5: Implementing Agentic Memory',
      module6: 'Module 6: Production Monitoring & Observability',
      module7: 'Module 7: New Features of AgentCore Services',
      lab1Download: '📥 Lab 1: Download AgentCore Jupyter Notebook',
    },

    // Default page title
    defaultPageTitle: 'Document',
  },
};

/**
 * 현재 로케일에 맞는 번역 객체를 반환한다.
 * @param {string} locale - 'ko' | 'en'
 * @returns {Object} 해당 로케일의 번역 문자열 객체
 */
export function getTranslations(locale) {
  return translations[locale] || translations.ko;
}

export default translations;
