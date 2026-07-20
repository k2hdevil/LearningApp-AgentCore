# Implementation Plan: Learning App Enhancements

## Overview

Implement 8 feature improvements for the AgentCore learning app built with React 18 + Vite 6. The implementation order is (1) foundational infrastructure (test framework, Context), (2) core features (progress tracking, code blocks), (3) external integration (D2 rendering), (4) UI/layout improvements, (5) Mermaid→D2 transition and mermaid dependency removal, (6) UI redesign (dark mode, TreeNavigation, breadcrumbs, tag badges, footer), with incremental integration with existing code at each stage.

## Tasks

- [x] 1. Test Framework Setup and ProgressContext Implementation
  - [x] 1.1 Vitest + Testing Library + fast-check Setup
    - Add `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `fast-check`, `jsdom` as devDependencies
    - Create `vitest.config.js` (jsdom environment, globals, setupFiles configuration)
    - Create `src/test/setup.js` (@testing-library/jest-dom import)
    - Add `"test": "vitest --run"` script to package.json
    - _Requirements: Overall test infrastructure_

  - [x] 1.2 ProgressContext and useProgress Hook Implementation
    - Create `src/contexts/ProgressContext.jsx`
    - Implement `ProgressProvider` component: load initial state from localStorage, provide `toggleModule(moduleId)` function
    - Implement `useProgress()` custom Hook: return `progress`, `toggleModule`, `completedCount`, `totalCount`, `percentage`
    - localStorage key: `agentcore-learning-progress`
    - If localStorage is inaccessible or parsing fails, initialize all modules as incomplete and operate without errors
    - Correct missing fields with default values on schema mismatch
    - _Requirements: 2.1, 2.2, 2.3, 2.5, 2.6, 2.8_

  - [x] 1.3 Property test: Progress persistence round-trip
    - **Property 1: Progress persistence round-trip**
    - Generate arbitrary progress state with fast-check → serialize → save to localStorage mock → deserialize → verify identity
    - **Validates: Requirements 2.1, 2.6**

  - [x] 1.4 Property test: Completion toggle preserves data integrity
    - **Property 2: Completion toggle preserves data integrity**
    - From arbitrary moduleId and initial state: toggle once → verify completed/completedAt, toggle twice → verify original completed state restoration
    - **Validates: Requirements 2.2, 2.3**

  - [x] 1.5 Property test: Progress calculation correctness
    - **Property 3: Progress calculation correctness**
    - Set 0~9 arbitrary modules as completed → verify completedCount === K, percentage === Math.round((K/N)*100)
    - **Validates: Requirements 2.4, 2.5**

- [x] 2. ProgressSummary and ModuleCompletionToggle Implementation
  - [x] 2.1 ProgressSummary Component Implementation
    - Create `src/components/ProgressSummary.jsx`
    - Display completed count/total count and percentage using the Cloudscape `ProgressBar` component
    - Consume data via `useProgress()` Hook
    - _Requirements: 2.4, 2.5_

  - [x] 2.2 ModuleCompletionToggle Component Implementation
    - Create `src/components/ModuleCompletionToggle.jsx`
    - Use Cloudscape `Toggle` or `Checkbox` component
    - props: `moduleId`, `completed`, `onToggle`
    - Place at the top of each module content view
    - _Requirements: 2.7_

  - [x] 2.3 Integrate ProgressProvider and Progress UI in App.jsx
    - Wrap App with `ProgressProvider`
    - Place `ProgressSummary` at the top of SideNavigation
    - Add completion status icon (check mark) to each SideNavigation item
    - Place `ModuleCompletionToggle` within ContentLayout
    - _Requirements: 1.3, 2.4, 2.7_

  - [x] 2.4 Unit tests: ProgressSummary and ModuleCompletionToggle
    - Verify ProgressSummary renders correct count and percentage
    - Verify ModuleCompletionToggle calls onToggle on click
    - Verify initialization behavior on localStorage corruption
    - _Requirements: 2.4, 2.5, 2.7, 2.8_

- [x] 3. Checkpoint - Progress Tracking Feature Verification
  - Verify all tests pass and ask the user if any issues arise.

- [x] 4. CodeBlockWrapper and CopyButton Implementation
  - [x] 4.1 CopyButton Component Implementation
    - Create `src/components/CopyButton.jsx`
    - Attempt `navigator.clipboard.writeText(text)`, fallback to temporary textarea + execCommand('copy') on failure
    - On success, maintain "Copied" state for 2 seconds then restore original state
    - Apply `aria-label="Copy code"` accessibility attribute
    - CSS handling to show only on hover/focus
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [x] 4.2 CodeBlockWrapper Component Implementation
    - Create `src/components/CodeBlockWrapper.jsx`
    - props: `code`, `language`
    - If language is `mermaid` or `d2` → delegate to diagram renderer (no syntax highlighting, no copy button)
    - If language is a supported language → apply `react-syntax-highlighter` Prism + dark theme
    - If language is not provided → render as plain text
    - Include CopyButton in all non-diagram code blocks
    - Supported languages: Python, JavaScript, TypeScript, JSON, YAML, Bash, HCL (minimum)
    - _Requirements: 3.1, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 4.3 Property test: Copy preserves code content
    - **Property 4: Copy preserves code content**
    - Pass arbitrary string (including Unicode) to copy function → verify identity with clipboard mock contents
    - **Validates: Requirements 3.2**

  - [x] 4.4 Property test: Syntax highlighting tokenization
    - **Property 5: Syntax highlighting tokenization**
    - Select arbitrary supported language + arbitrary non-empty code string → verify styled span exists in highlighter output
    - **Validates: Requirements 4.1**

  - [x] 4.5 Unit tests: CopyButton and CodeBlockWrapper
    - Verify "Copied" state for 2 seconds after CopyButton click (timer mock)
    - Verify fallback behavior when clipboard API is not supported
    - Verify mermaid language code blocks are not syntax highlighted
    - Verify plain text rendering when language is not specified
    - _Requirements: 3.2, 3.3, 3.4, 4.4, 4.5_

- [x] 5. D2Renderer Implementation
  - [x] 5.1 D2Renderer Component Implementation
    - Create `src/components/D2Renderer.jsx`
    - Kroki API integration: `POST https://kroki.io/d2/svg`, Content-Type: `text/plain`, body: raw D2 text
    - Loading state: display spinner or placeholder
    - On success: render SVG within Diagram_Container (light background, 16px padding, 8px border-radius, center-aligned, max-width 100%)
    - On error: retain original code block + left 4px `#e74c3c` border
    - timeout: 10 seconds
    - Allow horizontal scrolling on viewports ≤768px
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

  - [x] 5.2 Property test: D2 encoding round-trip
    - **Property 6: D2 encoding round-trip**
    - Arbitrary non-empty D2 text → POST body encoding → verify identity with original (since POST method, encoding is identity but verify trim/whitespace handling)
    - **Validates: Requirements 6.2**

  - [x] 5.3 Unit tests: D2Renderer
    - Verify SVG insertion on successful Kroki service response (fetch mock)
    - Verify original code block + error border on Kroki service error
    - Verify mermaid code blocks are not processed by D2Renderer
    - _Requirements: 6.1, 6.7, 6.8_

- [x] 6. MarkdownRenderer Integration Refactoring
  - [x] 6.1 Apply components prop-based code block routing in MarkdownRenderer
    - Use ReactMarkdown's `components={{ code }}` prop
    - inline code → maintain existing style
    - block code + language=mermaid → maintain existing Mermaid rendering (useEffect-based or component switch)
    - block code + language=d2 → delegate to D2Renderer
    - block code + other language → delegate to CodeBlockWrapper
    - block code + no language → delegate to CodeBlockWrapper (plain text mode)
    - Remove or convert existing mermaid useEffect post-processing logic to component-based
    - _Requirements: 4.5, 6.8, 6.9_

  - [x] 6.2 Integration tests: MarkdownRenderer Integration
    - Verify mermaid code blocks render as diagrams as before
    - Verify d2 code blocks are delegated to D2Renderer
    - Verify python/js code blocks show syntax highlighting + copy button
    - _Requirements: 4.5, 6.8, 6.9_

- [x] 7. Checkpoint - Code Block and Diagram Feature Verification
  - Verify all tests pass and ask the user if any issues arise.

- [x] 8. UI Improvements and Layout Stability
  - [x] 8.1 Unified Styling Based on Cloudscape Design Tokens
    - Improve `MarkdownRenderer.css` and `global.css`
    - Apply consistent styling using Cloudscape design tokens (spacing, typography, color)
    - Apply modern color scheme to headings, borders, and accent elements
    - Visual feedback transition within 100ms on interactive element hover
    - Add smooth content transition effects during module switching
    - _Requirements: 1.1, 1.2, 1.5, 1.6_

  - [x] 8.2 Responsive Layout and Scroll Stability
    - Leverage Cloudscape AppLayout's built-in sticky header/sidebar behavior
    - Verify responsive rendering without horizontal overflow across 320px~1920px viewport range
    - Verify sidebar operates as toggleable drawer below 768px (leverage existing navOpen logic)
    - Ensure Content_Area independent vertical scrolling with no horizontal scrollbar
    - Prevent body scroll lock when sidebar drawer opens on mobile
    - _Requirements: 1.4, 1.7, 1.8, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8_

  - [x] 8.3 Unit tests: Responsive breakpoints and layout
    - Verify sidebar transitions to drawer below 768px
    - Verify header/sidebar position fixed during scroll (scroll event simulation)
    - _Requirements: 1.7, 5.1, 5.2_

- [x] 9. Final Checkpoint - Full Feature Integration Verification
  - Verify all tests pass and ask the user if any issues arise.

---

## New Tasks (Requirements 7 & 8)

- [x] 10. Mermaid → D2 Transition (Requirement 8)
  - [x] 10.1 Convert 5 Mermaid diagrams in M02-Runtime_Summary.md to D2 syntax
    - Convert all ```mermaid code blocks to ```d2 in `Contents/M02-Runtime_Summary.md`
    - Convert Mermaid graph TD/LR, subgraph, stateDiagram-v2, etc. to equivalent D2 syntax
    - Maintain identical logical structure and relationships from original diagrams
    - _Requirements: 8.1, 8.2, 8.3_

  - [x] 10.2 Copy converted content to webapp/public/content/
    - Apply the same D2 conversion to `webapp/public/content/M02-Runtime_Summary.md`
    - Verify diagram content synchronization between the two files
    - _Requirements: 8.3_

  - [x] 10.2a Convert ASCII art diagrams in content files to D2
    - M00-CourseIntro_Summary.md: Timeline diagram (1)
    - M01-Foundations_Summary.md: Traditional AI vs Agentic AI architecture comparison diagram (1)
    - M03-SecurityAndIdentity_Summary.md: Agent security challenges map diagram (1)
    - M04-ToolsAndGateway_Summary.md: Tool selection decision tree (1)
    - M05-Memory_Summary.md: AgentCore Memory architecture diagram (1)
    - M06-DeploymentObservability_Summary.md: Service architecture + session structure diagrams (2)
    - M07-NewFeatures_Summary.md: Managed Harness architecture diagram (1)
    - Convert to D2 syntax maintaining identical logical structure, nodes, and relationships from each ASCII art
    - Replace existing plain ``` code fences with ```d2 code fences
    - Apply to both Contents/ and webapp/public/content/ directories
    - _Requirements: 8.11, 8.12, 8.13_

  - [x] 10.2b Sync converted ASCII art D2 diagrams to webapp/public/content/
    - Copy conversion results from Contents/ directory to webapp/public/content/
    - Verify D2 diagram content synchronization across all files
    - _Requirements: 8.11, 8.13_

  - [x] 10.3 Remove MermaidRenderer from MarkdownRenderer
    - Delete `MermaidRenderer` component definition
    - Delete `import mermaid from 'mermaid'` statement
    - Delete `mermaid.initialize(...)` call
    - Change `language === 'mermaid'` branch to delegate to CodeBlockWrapper
    - _Requirements: 8.4, 8.6, 8.8, 8.9_

  - [x] 10.4 Update mermaid code block handling in CodeBlockWrapper
    - Remove existing `if (language === 'mermaid') return null` or diagram delegation logic
    - Render mermaid language code blocks as regular syntax-highlighted code
    - Change CodeBlockWrapper to treat mermaid the same as other languages
    - _Requirements: 8.8, 8.9_

  - [x] 10.5 Remove mermaid package dependency
    - Remove `"mermaid": "^11.4.0"` from `package.json`
    - Run `npm install` to remove mermaid from node_modules
    - _Requirements: 8.5_

  - [x] 10.6 Update Mermaid-related tests
    - Remove existing mermaid mock and mermaid rendering tests
    - Add tests verifying mermaid code blocks render as plain code
    - Remove mermaid diagram rendering verification from MarkdownRenderer integration tests
    - Add test verifying no `import mermaid` or `require('mermaid')` statements exist in source code
    - _Requirements: 8.6, 8.8, 8.9_

  - [ ]* 10.7 Property test: Legacy mermaid blocks render as plain code
    - **Property 11: Legacy mermaid blocks render as plain code**
    - Arbitrary code string + language="mermaid" → MarkdownRenderer → verify no SVG in result + original code text present
    - **Validates: Requirements 8.8, 8.9**

- [x] 11. DarkModeContext Implementation (Requirement 7)
  - [x] 11.1 DarkModeContext and useDarkMode Hook Implementation
    - Create `src/contexts/DarkModeContext.jsx`
    - Implement `DarkModeProvider` component: load initial mode from localStorage, provide `toggleDarkMode()` function
    - Implement `useDarkMode()` custom Hook: return `isDarkMode`, `toggleDarkMode`
    - localStorage key: `agentcore-dark-mode`, value: `'dark'` or `'light'`
    - Initialization: localStorage value → if absent, reference `prefers-color-scheme` media query → default light
    - Apply theme via Cloudscape `applyMode(Mode.Dark)` / `applyMode(Mode.Light)` calls
    - If localStorage is inaccessible, default to light mode and ignore error
    - _Requirements: 7.13, 7.14, 7.15_

  - [ ]* 11.2 Property test: Dark mode persistence round-trip
    - **Property 7: Dark mode persistence round-trip**
    - Arbitrary mode value ("dark"/"light") → save to localStorage → read → verify same mode restoration
    - **Validates: Requirements 7.13, 7.14, 7.15**

  - [ ]* 11.3 Unit tests: DarkModeContext
    - Verify DarkModeProvider restores mode from localStorage on initialization
    - Verify toggleDarkMode switches mode and saves to localStorage
    - Verify light default when localStorage has invalid value (not 'dark'/'light')
    - Verify applyMode calls (Cloudscape global-styles mock)
    - _Requirements: 7.13, 7.14, 7.15_

- [x] 12. TreeNavigation Implementation (Requirement 7)
  - [x] 12.1 NAVIGATION_TREE Data Structure Definition
    - Create `src/data/navigationTree.js`
    - Define hierarchical NavigationNode[] array (series > category > individual items)
    - Include id, title, type, contentFile, tags, isNew properties for each item
    - Maintain leaf item ids compatible with existing PAGES array module IDs
    - Define TAG_COLORS constant (sdk: blue, service: orange, concept: green, tool: purple, default: gray)
    - _Requirements: 7.2, 7.5, 7.9, 7.10_

  - [x] 12.2 TreeNavigation Component Implementation
    - Create `src/components/TreeNavigation.jsx`
    - Implement 3-level tree structure using nested Cloudscape `ExpandableSection`
    - props: `navigationTree`, `activeItemId`, `onItemSelect`
    - Manage expand/collapse state via local state
    - Display Cloudscape `Badge` "NEW" for items with `isNew`
    - Display "SKT - AX BootCamp" title in header
    - Style with `TreeNavigation.css`
    - _Requirements: 7.2, 7.3, 7.4, 7.5, 7.6_

  - [ ]* 12.3 Property test: NEW badge rendering
    - **Property 10: NEW badge rendering**
    - Arbitrary navigation item (isNew true/false) → render → verify NEW badge presence matches isNew
    - **Validates: Requirements 7.5**

  - [ ]* 12.4 Unit tests: TreeNavigation
    - Verify 3-level nested rendering
    - Verify expand/collapse toggle behavior
    - Verify header title "SKT - AX BootCamp" display
    - Verify NEW badge rendering
    - Verify drawer transition below 768px
    - _Requirements: 7.2, 7.3, 7.4, 7.5, 7.6, 7.16_

- [x] 13. TopNavigation Redesign (Requirement 7)
  - [x] 13.1 DarkModeToggle Component Implementation
    - Create `src/components/DarkModeToggle.jsx`
    - props: `darkMode`, `onToggle`
    - Icon-based toggle button (sun/moon icons)
    - Structure placeable within TopNavigation utilities
    - _Requirements: 7.13, 7.14_

  - [x] 13.2 App.jsx TopNavigation Redesign
    - Change TopNavigation to dark background style
    - Place logo and app title in identity
    - Place language selector ("한국어"), DarkModeToggle, and user avatar area in utilities
    - _Requirements: 7.1_

  - [ ]* 13.3 Unit tests: TopNavigation Redesign
    - Verify Dark TopNavigation renders all required elements (logo, avatar, language selector, dark mode toggle)
    - _Requirements: 7.1_

- [x] 14. BreadcrumbNav, TagBadges, AppFooter Implementation (Requirement 7)
  - [x] 14.1 BreadcrumbNav Component Implementation
    - Create `src/components/BreadcrumbNav.jsx`
    - Use Cloudscape `BreadcrumbGroup` component
    - props: `activeItemId`, `navigationTree`, `onNavigate`
    - `buildBreadcrumbPath(tree, targetId)` function for hierarchical path backtracking
    - Format: 🏠 > [category] > [current page]
    - Navigate to corresponding level on each segment click
    - _Requirements: 7.7, 7.8_

  - [ ]* 14.2 Property test: Breadcrumb path computation
    - **Property 8: Breadcrumb path computation**
    - Select arbitrary tree item → buildBreadcrumbPath → verify path segments match actual ancestor path
    - **Validates: Requirements 7.7**

  - [x] 14.3 TagBadges Component Implementation
    - Create `src/components/TagBadges.jsx`
    - props: `tags` (Tag[] array)
    - Render with category-specific colors based on TAG_COLORS mapping
    - Use Cloudscape `SpaceBetween` + styled `<span>`
    - _Requirements: 7.9, 7.10_

  - [ ]* 14.4 Property test: Tag badges correct colors
    - **Property 9: Tag badges render with correct category colors**
    - Arbitrary tag array (with categories) → render → verify each badge's color matches TAG_COLORS mapping
    - **Validates: Requirements 7.9, 7.10**

  - [x] 14.5 AppFooter Component Implementation
    - Create `src/components/AppFooter.jsx`
    - Fixed content: "© 2025 Kiro - Amazon Bedrock AgentCore Learning"
    - A `<footer>` element placed at the bottom of ContentLayout
    - _Requirements: 7.12_

  - [ ]* 14.6 Unit tests: BreadcrumbNav, TagBadges, AppFooter
    - Verify BreadcrumbNav segments display correct hierarchical path
    - Verify BreadcrumbNav segment click calls onNavigate
    - Verify TagBadges render with correct colors per category
    - Verify AppFooter copyright text display
    - _Requirements: 7.7, 7.8, 7.9, 7.10, 7.12_

- [x] 15. App.jsx Integration and Final Verification (Requirement 7)
  - [x] 15.1 Integrate New Components in App.jsx
    - Replace existing flat SideNavigation with TreeNavigation
    - Place BreadcrumbNav at the top of ContentLayout
    - Place TagBadges below module title (look up tags from activeItemId)
    - Place AppFooter at the bottom of ContentLayout
    - Switch data source from existing PAGES array to NAVIGATION_TREE
    - Update content loading logic based on contentFile
    - _Requirements: 7.2, 7.7, 7.9, 7.11, 7.12_

  - [x] 15.2 DarkModeProvider Integration
    - Wrap App top-level with `DarkModeProvider`
    - Connect TopNavigation DarkModeToggle with DarkModeContext
    - Verify Cloudscape applyMode call on dark mode toggle
    - _Requirements: 7.13, 7.14, 7.15_

  - [ ]* 15.3 Integration tests: Full Integration Verification
    - Verify applyMode call and UI theme change on dark mode toggle
    - Verify TreeNavigation drawer transition in mobile (≤768px) viewport
    - Verify mermaid dependency removal: no mermaid import in source
    - _Requirements: 7.13, 7.16_

  - [x] 15.4 Final Checkpoint - Full Feature Integration Verification
    - Verify all tests pass and ask the user if any issues arise.
    - Verify build succeeds (`npm run build`)
    - Verify mermaid package is not in node_modules

## Notes

- Tasks marked with `*` are optional and can be skipped for a fast MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental verification
- Property tests verify universal correctness properties from the design document
- Unit tests verify specific examples and edge cases
- The existing `react-syntax-highlighter` dependency already exists in package.json, so no additional installation is needed
- Cloudscape AppLayout supports sticky header/sidebar by default, minimizing additional CSS implementation
- D2 rendering depends on the external Kroki service, so network error handling is required
- Tasks 10-15 implement Requirement 7 (UI Redesign) and Requirement 8 (Mermaid→D2 Transition)
- Task 10 (Mermaid→D2 Transition) can proceed independently, while Tasks 11-15 (UI Redesign) integrate progressively starting from DarkModeContext
- After Mermaid removal, mermaid code blocks are rendered as syntax-highlighted plain code (legacy compatibility)

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["1.3", "1.4", "1.5", "2.1", "2.2"] },
    { "id": 3, "tasks": ["2.3"] },
    { "id": 4, "tasks": ["2.4", "4.1"] },
    { "id": 5, "tasks": ["4.2", "5.1"] },
    { "id": 6, "tasks": ["4.3", "4.4", "4.5", "5.2", "5.3"] },
    { "id": 7, "tasks": ["6.1"] },
    { "id": 8, "tasks": ["6.2", "8.1"] },
    { "id": 9, "tasks": ["8.2"] },
    { "id": 10, "tasks": ["8.3"] },
    { "id": 11, "tasks": ["10.1", "10.2a", "11.1"] },
    { "id": 12, "tasks": ["10.2", "10.2b", "10.3", "11.2", "11.3", "12.1"] },
    { "id": 13, "tasks": ["10.4", "10.5", "12.2", "13.1"] },
    { "id": 14, "tasks": ["10.6", "10.7", "12.3", "12.4", "13.2"] },
    { "id": 15, "tasks": ["13.3", "14.1"] },
    { "id": 16, "tasks": ["14.2", "14.3", "14.5"] },
    { "id": 17, "tasks": ["14.4", "14.6", "15.1"] },
    { "id": 18, "tasks": ["15.2", "15.3"] },
    { "id": 19, "tasks": ["15.4"] }
  ]
}
```
