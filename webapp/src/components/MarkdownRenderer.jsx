import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import CodeBlockWrapper from './CodeBlockWrapper.jsx';
import './MarkdownRenderer.css';

/**
 * heading 텍스트에서 GitHub 스타일 slug을 생성한다.
 * (github-slugger 알고리즘과 동일: 소문자화, 특수문자 제거, 공백→하이픈)
 */
function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, '') // 문자, 숫자, 공백, 하이픈만 유지 (유니코드 지원)
    .replace(/[\s]+/g, '-')            // 공백 → 하이픈
    .replace(/^-+|-+$/g, '');          // 양끝 하이픈 제거
}

/**
 * React 노드에서 순수 텍스트만 추출한다.
 */
function extractText(children) {
  if (typeof children === 'string') return children;
  if (Array.isArray(children)) return children.map(extractText).join('');
  if (children && children.props && children.props.children) {
    return extractText(children.props.children);
  }
  return '';
}

function MarkdownRenderer({ content }) {
  const components = {
    // heading에 id를 부여하여 목차 앵커 링크가 동작하도록 한다
    h1({ children, node, ...props }) { const id = slugify(extractText(children)); return <h1 id={id} {...props}>{children}</h1>; },
    h2({ children, node, ...props }) { const id = slugify(extractText(children)); return <h2 id={id} {...props}>{children}</h2>; },
    h3({ children, node, ...props }) { const id = slugify(extractText(children)); return <h3 id={id} {...props}>{children}</h3>; },
    h4({ children, node, ...props }) { const id = slugify(extractText(children)); return <h4 id={id} {...props}>{children}</h4>; },
    h5({ children, node, ...props }) { const id = slugify(extractText(children)); return <h5 id={id} {...props}>{children}</h5>; },
    h6({ children, node, ...props }) { const id = slugify(extractText(children)); return <h6 id={id} {...props}>{children}</h6>; },

    // 앵커 링크: #hash 링크 클릭 시 해당 heading으로 스크롤
    a({ href, children, node, ...props }) {
      if (href && href.startsWith('#')) {
        const handleClick = (e) => {
          e.preventDefault();
          const targetId = decodeURIComponent(href.slice(1));
          const el = document.getElementById(targetId);
          if (el) {
            // location.hash를 설정하면 브라우저가 네이티브로 해당 요소로 스크롤한다
            window.location.hash = href;
          }
        };
        return <a href={href} onClick={handleClick} {...props}>{children}</a>;
      }
      return <a href={href} target="_blank" rel="noopener noreferrer" {...props}>{children}</a>;
    },

    // <pre> 태그를 자식 요소만 직접 전달하도록 오버라이드
    // 기본 <pre> 래퍼가 커스텀 코드 블록 렌더링을 방해하지 않도록 한다.
    pre({ children }) {
      return <>{children}</>;
    },

    code({ className, children, node, ...props }) {
      const match = /language-(\w+)/.exec(className || '');
      const language = match ? match[1] : null;
      const codeText = String(children).replace(/\n$/, '');

      // className이 있거나, 여러 줄인 경우 블록 코드로 판단
      const isBlock = className || codeText.includes('\n');
      if (isBlock) {
        return <CodeBlockWrapper code={codeText} language={language} />;
      }

      // 한 줄이고 className도 없으면 인라인 코드
      return <code {...props}>{children}</code>;
    },
  };

  if (!content) {
    return <p>콘텐츠가 비어 있습니다.</p>;
  }

  return (
    <div className="md-content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export default MarkdownRenderer;
