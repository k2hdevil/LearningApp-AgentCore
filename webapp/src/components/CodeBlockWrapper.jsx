import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import CopyButton from './CopyButton.jsx';
import './CodeBlockWrapper.css';

/**
 * 지원 언어 목록 (최소 요구사항)
 * react-syntax-highlighter/Prism이 인식하는 언어 식별자
 */
const SUPPORTED_LANGUAGES = [
  'python',
  'javascript',
  'typescript',
  'json',
  'yaml',
  'bash',
  'hcl',
  'jsx',
  'tsx',
  'shell',
  'sh',
  'css',
  'html',
  'xml',
  'java',
  'go',
  'rust',
  'sql',
  'dockerfile',
  'toml',
  'ini',
  'diff',
  'markdown',
];

/**
 * CodeBlockWrapper - 코드 블록 래퍼 컴포넌트
 *
 * 일반 코드는 구문 강조 + 복사 버튼을 제공한다.
 *
 * @param {{ code: string, language: string|undefined }} props
 * - code: 코드 텍스트 내용
 * - language: 언어 식별자 (optional)
 */
export default function CodeBlockWrapper({ code, language }) {

  // 지원 언어가 있는 경우 → 구문 강조 적용
  const normalizedLang = language ? language.toLowerCase() : null;
  const isSupported = normalizedLang && SUPPORTED_LANGUAGES.includes(normalizedLang);

  return (
    <div className={`code-block-wrapper${!isSupported ? ' code-block-wrapper--plain' : ''}`}>
      {isSupported && <CopyButton text={code} />}
      {isSupported ? (
        <SyntaxHighlighter
          language={normalizedLang}
          style={oneDark}
          customStyle={{
            margin: 0,
            borderRadius: '8px',
            fontSize: '14px',
            lineHeight: '1.6',
          }}
          showLineNumbers={false}
          wrapLongLines={true}
        >
          {code}
        </SyntaxHighlighter>
      ) : (
        <pre>
          <code>{code}</code>
        </pre>
      )}
    </div>
  );
}
