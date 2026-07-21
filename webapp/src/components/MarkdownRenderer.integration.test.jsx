import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';

import MarkdownRenderer from './MarkdownRenderer';

describe('MarkdownRenderer Integration', () => {
  let mockFetch;

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Mermaid code block renders as plain text (mermaid 의존성 제거 후)', () => {
    it('mermaid 코드 블록은 CodeBlockWrapper를 통해 plain text로 렌더링된다', async () => {
      const markdown = '```mermaid\ngraph TD; A-->B;\n```';

      render(<MarkdownRenderer content={markdown} />);

      await waitFor(() => {
        // mermaid는 지원 언어가 아니므로 plain text로 렌더링됨
        const codeWrapper = document.querySelector('.code-block-wrapper--plain');
        expect(codeWrapper).toBeInTheDocument();
        const codeElement = codeWrapper.querySelector('pre > code');
        expect(codeElement).toHaveTextContent('graph TD; A-->B;');
      });
    });

    it('mermaid 코드 블록이 다이어그램(SVG)이 아닌 plain code로 렌더링된다', async () => {
      const markdown = '```mermaid\ngraph TD; A-->B;\n```';

      render(<MarkdownRenderer content={markdown} />);

      await waitFor(() => {
        // .mermaid-diagram 클래스 없음
        expect(document.querySelector('.mermaid-diagram')).not.toBeInTheDocument();
        // SVG 렌더링 없음
        expect(document.querySelector('svg')).not.toBeInTheDocument();
        // CodeBlockWrapper를 통해 렌더링됨
        const wrapper = document.querySelector('.code-block-wrapper');
        expect(wrapper).toBeInTheDocument();
        expect(wrapper.textContent).toContain('graph TD; A-->B;');
      });
    });
  });

  describe('소스 코드에 mermaid 의존성이 없음을 검증', () => {
    it('MarkdownRenderer 소스에 mermaid import가 없다', () => {
      // MarkdownRenderer.jsx 소스 코드를 읽어서 mermaid import 여부 확인
      const source = fs.readFileSync(
        path.resolve(__dirname, './MarkdownRenderer.jsx'),
        'utf-8'
      );
      expect(source).not.toMatch(/import.*mermaid/);
      expect(source).not.toMatch(/require\(.*mermaid.*\)/);
    });

    it('CodeBlockWrapper 소스에 mermaid import가 없다', () => {
      // CodeBlockWrapper.jsx 소스 코드를 읽어서 mermaid import 여부 확인
      const source = fs.readFileSync(
        path.resolve(__dirname, './CodeBlockWrapper.jsx'),
        'utf-8'
      );
      expect(source).not.toMatch(/import.*mermaid/);
      expect(source).not.toMatch(/require\(.*mermaid.*\)/);
    });
  });

  describe('Python code block has syntax highlighting + copy button', () => {
    it('renders python code with styled spans and copy button', async () => {
      const markdown = '```python\ndef hello():\n    pass\n```';

      render(<MarkdownRenderer content={markdown} />);

      await waitFor(() => {
        // Verify syntax highlighting: react-syntax-highlighter renders styled spans
        const codeWrapper = document.querySelector('.code-block-wrapper');
        expect(codeWrapper).toBeInTheDocument();

        const styledSpans = codeWrapper.querySelectorAll('span[style]');
        expect(styledSpans.length).toBeGreaterThan(0);

        // Verify copy button with aria-label
        const copyButton = screen.getByRole('button', { name: '코드 복사' });
        expect(copyButton).toBeInTheDocument();
      });
    });
  });

  describe('Inline code renders without CodeBlockWrapper', () => {
    it('renders inline code as plain <code> element without wrapper', () => {
      const markdown = 'This is `inline code` here';

      render(<MarkdownRenderer content={markdown} />);

      const codeElement = screen.getByText('inline code');
      expect(codeElement.tagName).toBe('CODE');

      // Should NOT have CodeBlockWrapper styling
      const wrapper = document.querySelector('.code-block-wrapper');
      expect(wrapper).not.toBeInTheDocument();
    });
  });
});
