# LearningApp-AgentCore

Amazon Bedrock AgentCore 교육 과정을 위한 인터랙티브 학습 웹 애플리케이션입니다.

## 개요

"Building Agentic AI with Amazon Bedrock AgentCore" 과정의 학습 콘텐츠를 웹 기반으로 열람할 수 있는 SPA(Single Page Application)입니다. 마크다운으로 작성된 교육 자료를 계층적 네비게이션과 함께 제공하며, AWS 콘솔 스타일의 UI를 통해 일관된 학습 경험을 전달합니다.

## 주요 기능

- **한국어/영어 언어 전환** — 브라우저 언어 자동 감지, TopNavigation 버튼으로 수동 전환, localStorage 영속
- **마크다운 기반 콘텐츠 렌더링** — GFM(GitHub Flavored Markdown) 지원, 코드 구문 강조, 이미지/테이블 렌더링
- **계층적 SideNavigation** — Cloudscape SideNavigation 컴포넌트 기반 모듈 목차
- **다크 모드** — 시스템 설정 감지 + 수동 토글, localStorage 영속
- **반응형 레이아웃** — 768px 기준 사이드바 drawer 자동 전환
- **브레드크럼 네비게이션** — 현재 위치의 계층 경로 표시
- **콘텐츠 태그** — 모듈별 기술 키워드를 카테고리 색상 Badge로 표시

## 기술 스택

| 영역 | 기술 |
|------|------|
| UI 프레임워크 | React 18 |
| 디자인 시스템 | [Cloudscape Design System](https://cloudscape.design/) |
| 빌드 도구 | Vite 6 |
| 마크다운 | react-markdown + remark-gfm + rehype-raw |
| 코드 하이라이팅 | react-syntax-highlighter |
| 테스트 | Vitest + Testing Library + fast-check (property-based) |

## 프로젝트 구조

```
LearningApp-AgentCore/
├── Contents/              # 교육 콘텐츠 원본 (마크다운 + 이미지)
├── webapp/                # 웹 애플리케이션
│   ├── public/content/    # 한국어 콘텐츠 (기본)
│   │   ├── en/            # 영어 콘텐츠
│   │   └── images/        # 콘텐츠 이미지
│   ├── src/
│   │   ├── components/    # React 컴포넌트
│   │   ├── contexts/      # Context (DarkMode, Locale, Progress)
│   │   ├── data/          # 네비게이션 트리, 번역 데이터
│   │   ├── App.jsx        # 메인 레이아웃
│   │   └── main.jsx       # 엔트리 포인트
│   ├── package.json
│   └── index.html
└── .kiro/                 # Kiro IDE 스펙 및 설정
```

## 시작하기

### 사전 요구사항

- Node.js 18 이상
- npm 9 이상

### 설치 및 실행

```bash
# 의존성 설치
cd webapp
npm install

# 개발 서버 실행
npm run dev
```

브라우저에서 `http://localhost:5173`으로 접속합니다.

### 빌드

```bash
npm run build
```

빌드 결과물은 `webapp/dist/` 에 생성됩니다.

### 테스트

```bash
npm run test
```

## 학습 콘텐츠 모듈

| 모듈 | 주제 |
|------|------|
| M00 | 과정 소개 |
| M01 | Foundations (기반 개념) |
| M02 | Runtime (런타임) |
| M03 | Security and Identity (보안 및 자격 증명) |
| M04 | Tools and Gateway (도구 및 게이트웨이) |
| M05 | Memory (메모리) |
| M06 | Deployment and Observability (배포 및 관찰성) |
| M07 | New Features (신규 기능) |

## 콘텐츠 추가 방법

1. `Contents/` 디렉토리에 마크다운 파일을 추가합니다.
2. `webapp/public/content/`에 한국어 파일을, `webapp/public/content/en/`에 영어 파일을 배치합니다.
3. `webapp/src/data/navigationTree.js`에 항목을 추가합니다.
   ```js
   {
     id: 'M08-NewModule',
     title: '모듈 8: 새 모듈 제목',
     titleKey: 'module8',
     type: 'item',
     contentFile: 'M08-NewModule.md',
     tags: [{ label: '태그명', category: 'concept' }],
   }
   ```
4. `webapp/src/data/translations.js`의 `nav` 객체에 양쪽 로케일 제목을 추가합니다.
   ```js
   // ko.nav
   module8: '모듈 8: 새 모듈 제목',
   // en.nav
   module8: 'Module 8: New Module Title',
   ```

## 다국어 (i18n) 구조

언어 전환은 외부 i18n 라이브러리 없이 React Context + 번역 파일로 구현되어 있습니다.

| 파일 | 역할 |
|------|------|
| `src/contexts/LocaleContext.jsx` | 로케일 상태 관리 (localStorage 영속, 브라우저 언어 감지) |
| `src/data/translations.js` | UI 라벨 번역 문자열 (ko/en) |
| `src/data/navigationTree.js` | `getLocalizedTree()` — 네비게이션 제목 로케일 적용 |
| `public/content/` | 한국어 마크다운 콘텐츠 (기본) |
| `public/content/en/` | 영어 마크다운 콘텐츠 |

**동작 방식:**
- 첫 방문 시 브라우저 언어를 감지하여 한국어/영어를 자동 선택합니다.
- TopNavigation 상단 바의 언어 버튼으로 수동 전환할 수 있습니다.
- 선택된 언어는 `localStorage`에 저장되어 다음 방문 시 유지됩니다.
- 영어 선택 시 콘텐츠는 `/content/en/` 경로에서, 한국어는 `/content/`에서 로드됩니다.

## 라이선스

이 프로젝트는 내부 교육 목적으로 제작되었습니다.

---

# LearningApp-AgentCore (English)

An interactive learning web application for the Amazon Bedrock AgentCore training course.

## Overview

A SPA (Single Page Application) that provides web-based access to the learning content for the "Building Agentic AI with Amazon Bedrock AgentCore" course. It delivers training materials written in Markdown with hierarchical navigation and a consistent learning experience through an AWS Console-style UI.

## Key Features

- **Korean/English language switching** — Browser language auto-detection, manual toggle via TopNavigation button, localStorage persistence
- **Markdown-based content rendering** — GFM (GitHub Flavored Markdown) support, code syntax highlighting, image/table rendering
- **Hierarchical SideNavigation** — Module table of contents based on Cloudscape SideNavigation component
- **Dark mode** — System setting detection + manual toggle, localStorage persistence
- **Responsive layout** — Sidebar drawer auto-toggle at 768px breakpoint
- **Breadcrumb navigation** — Displays hierarchical path of current location
- **Content tags** — Module-specific technology keywords displayed as color-coded category Badges

## Tech Stack

| Area | Technology |
|------|------------|
| UI Framework | React 18 |
| Design System | [Cloudscape Design System](https://cloudscape.design/) |
| Build Tool | Vite 6 |
| Markdown | react-markdown + remark-gfm + rehype-raw |
| Code Highlighting | react-syntax-highlighter |
| Testing | Vitest + Testing Library + fast-check (property-based) |

## Project Structure

```
LearningApp-AgentCore/
├── Contents/              # Training content source (Markdown + images)
├── webapp/                # Web application
│   ├── public/content/    # Korean content (default)
│   │   ├── en/            # English content
│   │   └── images/        # Content images
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── contexts/      # Context (DarkMode, Locale, Progress)
│   │   ├── data/          # Navigation tree, translation data
│   │   ├── App.jsx        # Main layout
│   │   └── main.jsx       # Entry point
│   ├── package.json
│   └── index.html
└── .kiro/                 # Kiro IDE specs and settings
```

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm 9 or higher

### Installation and Running

```bash
# Install dependencies
cd webapp
npm install

# Start development server
npm run dev
```

Open `http://localhost:5173` in your browser.

### Build

```bash
npm run build
```

Build output is generated in `webapp/dist/`.

### Testing

```bash
npm run test
```

## Learning Content Modules

| Module | Topic |
|--------|-------|
| M00 | Course Introduction |
| M01 | Foundations |
| M02 | Runtime |
| M03 | Security and Identity |
| M04 | Tools and Gateway |
| M05 | Memory |
| M06 | Deployment and Observability |
| M07 | New Features |

## Adding Content

1. Add Markdown files to the `Contents/` directory.
2. Place Korean files in `webapp/public/content/` and English files in `webapp/public/content/en/`.
3. Add an entry to `webapp/src/data/navigationTree.js`.
   ```js
   {
     id: 'M08-NewModule',
     title: '모듈 8: 새 모듈 제목',
     titleKey: 'module8',
     type: 'item',
     contentFile: 'M08-NewModule.md',
     tags: [{ label: 'TagName', category: 'concept' }],
   }
   ```
4. Add locale titles for both languages in the `nav` object of `webapp/src/data/translations.js`.
   ```js
   // ko.nav
   module8: '모듈 8: 새 모듈 제목',
   // en.nav
   module8: 'Module 8: New Module Title',
   ```

## Internationalization (i18n) Architecture

Language switching is implemented using React Context + translation files without external i18n libraries.

| File | Role |
|------|------|
| `src/contexts/LocaleContext.jsx` | Locale state management (localStorage persistence, browser language detection) |
| `src/data/translations.js` | UI label translation strings (ko/en) |
| `src/data/navigationTree.js` | `getLocalizedTree()` — Applies locale to navigation titles |
| `public/content/` | Korean Markdown content (default) |
| `public/content/en/` | English Markdown content |

**How it works:**
- On first visit, the browser language is detected to auto-select Korean or English.
- Users can manually switch languages via the language button in the TopNavigation bar.
- The selected language is saved in `localStorage` and persisted across visits.
- When English is selected, content loads from `/content/en/`; Korean content loads from `/content/`.

## License

This project was created for internal training purposes.
