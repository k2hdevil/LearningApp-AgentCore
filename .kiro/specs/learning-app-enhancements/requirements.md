# Requirements Document

## Introduction

This document defines the feature improvements to enhance the user experience of the Amazon Bedrock AgentCore learning app. The current app functions as a basic Markdown content viewer, and through these improvements, we will implement (1) visual enhancements reflecting the latest UI trends, (2) learning progress tracking functionality, (3) code block copy functionality, and (4) a modern learning platform experience through screenshot-based UI redesign.

## Glossary

- **Learning_App**: A web application for viewing Amazon Bedrock AgentCore learning materials, built with React 18 + Vite 6
- **Module**: A logical unit of learning content (Modules M00~M07 + L01 lab guide, 9 items total)
- **Progress_Tracker**: A functional component that tracks and visually displays the user's learning progress
- **Code_Block**: A programming code area embedded within Markdown content (`<pre><code>` element)
- **Copy_Button**: A UI button displayed at the top of a code block that copies the code to the clipboard when clicked
- **Sidebar**: A left-side module navigation panel based on Cloudscape SideNavigation
- **Completion_Status**: The learning completion state of an individual module (completed/incomplete)
- **Local_Storage**: A client-side data store utilizing the browser's localStorage API
- **Syntax_Highlighter**: A feature that applies language-specific syntax highlighting to code blocks
- **Sticky_Header**: A TopNavigation area that remains fixed at the top of the screen even during scrolling
- **Sticky_Sidebar**: A SideNavigation area that remains fixed on the left side of the screen and scrolls independently during scrolling
- **Content_Area**: The main area where module content is rendered, scrolling independently from the Sidebar
- **Viewport**: The user's browser display area, which varies depending on device and browser size
- **Dark_TopNavigation**: An AWS-style dark background header area containing a logo, user avatar, language selector, and dark mode toggle
- **Tree_Navigation**: A hierarchical sidebar navigation that displays expandable/collapsible sections and sub-items in a tree structure
- **Breadcrumb**: A top navigation element displaying the hierarchical path of the current page (e.g., 🏠 > Agent Foundations > Building Agents with Strands)
- **Tag_Badge**: A UI element that displays technology keywords related to the content as colored labels (e.g., "Strands Agents SDK", "Amazon Bedrock")
- **Footer**: A copyright and branding information display area located at the bottom of the page
- **Dark_Mode_Toggle**: A toggle button for switching between light mode and dark mode in the app
- **NEW_Badge**: A visual badge indicator displayed on newly added content items

## Requirements

### Requirement 1: UI Enhancement Reflecting Latest Trends

**User Story:** As a learner, I want to use a clean UI that reflects the latest design trends, so that I can focus more on learning content and experience less visual fatigue.

#### Acceptance Criteria

1. THE Learning_App SHALL apply consistent spacing and typography across the entire interface using Cloudscape Design System tokens
2. THE Learning_App SHALL display smooth transition effects when navigating between modules
3. THE Sidebar SHALL display a visual indicator next to each module showing the Completion_Status
4. THE Learning_App SHALL render responsively without horizontal overflow or content clipping across viewports ranging from 320px to 1920px in width
5. THE Learning_App SHALL apply a modern color scheme harmonized with Cloudscape design tokens to headings, borders, and accent elements
6. WHEN the user hovers over an interactive element, THE Learning_App SHALL display subtle visual feedback within 100ms
7. WHILE Viewport width is 768px or less, THE Learning_App SHALL collapse the Sidebar into a toggleable drawer to maximize Content_Area space
8. WHILE Viewport width exceeds 768px, THE Sidebar SHALL be displayed alongside the Content_Area without overlapping

### Requirement 2: Learning Progress Tracking

**User Story:** As a learner, I want to track the completion status of each module and view my overall progress, so that I can see at a glance how far I've progressed and manage my remaining learning.

#### Acceptance Criteria

1. THE Progress_Tracker SHALL persist Completion_Status data in Local_Storage
2. WHEN the user marks a Module as complete, THE Progress_Tracker SHALL update the Completion_Status to complete and store a timestamp
3. WHEN the user marks a completed Module as incomplete, THE Progress_Tracker SHALL revert the Completion_Status to incomplete
4. THE Sidebar SHALL display a progress summary showing the number of completed modules out of the total number of modules
5. THE Progress_Tracker SHALL display the overall progress percentage calculated as (completed modules / total modules) × 100
6. WHEN the Learning_App loads, THE Progress_Tracker SHALL restore previously saved Completion_Status from Local_Storage
7. THE Learning_App SHALL provide a toggle or checkbox within each module view to mark that module as complete
8. IF Local_Storage is unavailable or corrupted, THEN THE Progress_Tracker SHALL initialize all modules as incomplete and continue operating without errors

### Requirement 3: Code Block Copy Functionality

**User Story:** As a learner, I want to copy the contents of a code block to the clipboard with a single click, so that I can quickly reuse code during hands-on practice.

#### Acceptance Criteria

1. THE Learning_App SHALL display a Copy_Button in the upper-right corner of each Code_Block
2. WHEN the user clicks the Copy_Button, THE Learning_App SHALL copy the entire text content of the corresponding Code_Block to the system clipboard
3. WHEN the copy operation succeeds, THE Copy_Button SHALL display a "Copied" confirmation state for 2 seconds before returning to the default state
4. IF the clipboard API is unavailable, THEN THE Learning_App SHALL fall back to a legacy text selection copy method
5. THE Copy_Button SHALL be visible only when the user hovers over or focuses on the Code_Block
6. THE Copy_Button SHALL be keyboard accessible and have an aria-label of "Copy code"

### Requirement 4: Code Syntax Highlighting

**User Story:** As a learner, I want programming language-specific syntax highlighting applied to code blocks, so that I can easily understand the structure of the code and improve learning efficiency.

#### Acceptance Criteria

1. WHEN a Code_Block has a language identifier specified, THE Syntax_Highlighter SHALL apply language-specific color coding to the code content
2. THE Syntax_Highlighter SHALL support at minimum Python, JavaScript, TypeScript, JSON, YAML, Bash, and HCL languages
3. THE Syntax_Highlighter SHALL use a dark theme consistent with the existing Code_Block background color scheme
4. WHEN a Code_Block has no language identifier specified, THE Syntax_Highlighter SHALL render the code as plain text without syntax highlighting
5. THE Syntax_Highlighter SHALL NOT interfere with Mermaid diagram rendering of code blocks with the "mermaid" language identifier

### Requirement 5: Layout Stability During Scrolling

**User Story:** As a learner, I want the header and sidebar to remain stable when scrolling through content, so that I can access navigation immediately while reading long documents and the layout doesn't break.

#### Acceptance Criteria

1. THE Sticky_Header SHALL remain fixed at the top of the Viewport while the user scrolls the Content_Area
2. THE Sticky_Sidebar SHALL remain fixed in position and scroll independently from the Content_Area
3. WHILE the user scrolls the Content_Area, THE Sidebar SHALL NOT shift, overlap, or detach from the layout
4. WHILE the user scrolls the Content_Area, THE Sticky_Header SHALL NOT flicker, resize, or reflow
5. THE Content_Area SHALL scroll vertically without a horizontal scrollbar appearing in the Viewport
6. WHEN the Content_Area contains content taller than the Viewport, THE Learning_App SHALL allow smooth vertical scrolling without layout breaks or repaint artifacts
7. WHILE Viewport width is 768px or less, THE Content_Area SHALL occupy the full width of the Viewport and scroll independently without being blocked by the Sidebar
8. THE Learning_App SHALL prevent body-level scroll lock when the Sidebar drawer is open in mobile viewports

### Requirement 7: UI Redesign (Modern Learning Platform)

**User Story:** As a learner, I want to use a redesigned UI with a modern learning platform style, so that I can intuitively navigate hierarchical content structures and immerse myself in a professional learning environment.

#### Acceptance Criteria

1. THE Dark_TopNavigation SHALL render with a dark background color and display the application logo, user avatar area, language selector ("한국어"), and Dark_Mode_Toggle in a single horizontal row
2. THE Tree_Navigation SHALL replace the flat SideNavigation list with a hierarchical tree structure supporting at least 3 levels of nesting (series > category > individual items)
3. WHEN the user clicks the expand arrow of a Tree_Navigation section, THE Learning_App SHALL expand that section to reveal sub-items with a smooth animation
4. WHEN the user clicks the collapse arrow of an expanded Tree_Navigation section, THE Learning_App SHALL collapse that section to hide sub-items
5. THE Tree_Navigation SHALL display a NEW_Badge next to recently added content items
6. THE Tree_Navigation header SHALL display a "SKT - AX BootCamp" title with a collapse button and "Welcome" link
7. THE Breadcrumb SHALL display the hierarchical path of the current page below the Dark_TopNavigation in the format "🏠 > [category] > [current page]"
8. WHEN the user clicks a Breadcrumb segment, THE Learning_App SHALL navigate to the corresponding page or section
9. THE Content_Area SHALL display Tag_Badge elements showing the module title, subtitle description, and related technology keywords
10. THE Tag_Badge elements SHALL render as colored labels with distinct background colors per category (e.g., blue for SDK, orange for services)
11. THE Content_Area SHALL organize rendered content at the top of each module with clearly separated "Learning Objectives" and "Key Concepts" sections
12. THE Footer SHALL display a copyright notice with Kiro branding at the bottom of the Content_Area
13. WHEN the Dark_Mode_Toggle is activated, THE Learning_App SHALL switch the entire interface to a dark color scheme and persist the setting to Local_Storage
14. WHEN the Dark_Mode_Toggle is deactivated, THE Learning_App SHALL revert the interface to a light color scheme
15. THE Learning_App SHALL restore the previously saved dark mode setting from Local_Storage on load
16. WHILE Viewport width is 768px or less, THE Tree_Navigation SHALL collapse into a toggleable drawer with a hamburger menu trigger
17. WHILE Viewport width exceeds 768px, THE Tree_Navigation SHALL remain expanded alongside the Content_Area
