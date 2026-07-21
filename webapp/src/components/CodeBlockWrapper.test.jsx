import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import CodeBlockWrapper from './CodeBlockWrapper';

describe('CodeBlockWrapper', () => {
  beforeEach(() => {
    // clipboard mock for CopyButton inside CodeBlockWrapper
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('language="mermaid"일 때 지원 언어가 아니므로 plain text로 렌더링한다', () => {
    const { container } = render(
      <CodeBlockWrapper code="graph TD; A-->B;" language="mermaid" />
    );

    // mermaid는 SUPPORTED_LANGUAGES에 없으므로 plain text(pre/code)로 렌더링
    const preElement = container.querySelector('pre');
    expect(preElement).toBeInTheDocument();
    const codeElement = container.querySelector('pre > code');
    expect(codeElement).toHaveTextContent('graph TD; A-->B;');
  });

  it('language="python"일 때 구문 강조된 출력을 렌더링한다 (styled span 존재)', () => {
    const { container } = render(
      <CodeBlockWrapper code="def hello():\n    print('hi')" language="python" />
    );

    // SyntaxHighlighter는 styled span을 생성함
    const spans = container.querySelectorAll('span[style]');
    expect(spans.length).toBeGreaterThan(0);
  });

  it('language가 undefined/null일 때 plain text로 pre/code에 렌더링한다 (styled span 없음)', () => {
    const { container } = render(
      <CodeBlockWrapper code="some plain text" language={undefined} />
    );

    const preElement = container.querySelector('pre');
    const codeElement = container.querySelector('pre > code');
    expect(preElement).toBeInTheDocument();
    expect(codeElement).toBeInTheDocument();
    expect(codeElement).toHaveTextContent('some plain text');

    // styled span이 없어야 함 (plain text)
    const styledSpans = container.querySelectorAll('span[style]');
    expect(styledSpans.length).toBe(0);
  });

  it('비-다이어그램 코드 블록에 CopyButton(aria-label="코드 복사")이 포함된다', () => {
    render(<CodeBlockWrapper code="console.log('test')" language="javascript" />);

    const copyButton = screen.getByRole('button', { name: '코드 복사' });
    expect(copyButton).toBeInTheDocument();
  });

  it('language=null일 때도 CopyButton이 포함된다', () => {
    render(<CodeBlockWrapper code="plain text here" language={null} />);

    const copyButton = screen.getByRole('button', { name: '코드 복사' });
    expect(copyButton).toBeInTheDocument();
  });
});
