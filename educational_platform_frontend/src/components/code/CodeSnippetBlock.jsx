import { useCallback, useMemo, useState } from 'react';
import { Check, Code2, Copy, Maximize2, Minimize2, WrapText } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  countCodeLines,
  formatCodeSize,
  resolveLangLabel,
  resolveLangMeta,
} from '@/lib/codePostMeta';
import { tokenizeCodeLine } from '@/utils/codeHighlight';

const DEFAULT_VISIBLE_LINES = 18;

function HighlightedLine({ line, language }) {
  const tokens = useMemo(() => tokenizeCodeLine(line, language), [line, language]);
  return (
    <code className="code-snippet__line-code">
      {tokens.map((token, idx) => (
        <span key={idx} className={`code-snippet__tok code-snippet__tok--${token.type}`}>
          {token.text}
        </span>
      ))}
    </code>
  );
}

export default function CodeSnippetBlock({
  content,
  language,
  fileName: fileNameProp,
  className,
  initialVisibleLines = DEFAULT_VISIBLE_LINES,
}) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showAllLines, setShowAllLines] = useState(false);
  const [wordWrap, setWordWrap] = useState(false);

  const lines = useMemo(() => String(content || '').split('\n'), [content]);
  const lineCount = lines.length;
  const hiddenLineCount = Math.max(0, lineCount - initialVisibleLines);
  const isCollapsed = !showAllLines && hiddenLineCount > 0;
  const visibleLines = isCollapsed ? lines.slice(0, initialVisibleLines) : lines;

  const meta = resolveLangMeta(language);
  const langLabel = resolveLangLabel(language);
  const fileName = fileNameProp || `snippet.${meta?.ext ?? 'txt'}`;
  const sizeLabel = formatCodeSize(content);
  const langClass = meta ? `code-snippet__lang-badge--${String(language).toLowerCase()}` : '';

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }, [content]);

  return (
    <>
      <div className={cn('code-snippet', className)}>
        <div className="code-snippet__header">
          <div className="code-snippet__header-left">
            <span className="code-snippet__dots" aria-hidden>
              <span className="code-snippet__dot code-snippet__dot--red" />
              <span className="code-snippet__dot code-snippet__dot--yellow" />
              <span className="code-snippet__dot code-snippet__dot--green" />
            </span>
            <Code2 className="code-snippet__file-icon" aria-hidden />
            <span className="code-snippet__filename">{fileName}</span>
            <span className={cn('code-snippet__lang-badge', langClass)}>{langLabel.toUpperCase()}</span>
          </div>

          <div className="code-snippet__header-right">
            <span className="code-snippet__meta">
              {lineCount} {lineCount === 1 ? 'line' : 'lines'} · {sizeLabel}
            </span>
            <button
              type="button"
              className="code-snippet__icon-btn"
              aria-label={wordWrap ? 'Disable word wrap' : 'Enable word wrap'}
              aria-pressed={wordWrap}
              onClick={() => setWordWrap((v) => !v)}
            >
              <WrapText aria-hidden />
            </button>
            <button
              type="button"
              className="code-snippet__icon-btn"
              aria-label={expanded ? 'Close expanded view' : 'Expand code'}
              onClick={() => setExpanded(true)}
            >
              <Maximize2 aria-hidden />
            </button>
            <button
              type="button"
              className="code-snippet__copy"
              onClick={handleCopy}
              aria-label="Copy code"
            >
              {copied ? (
                <>
                  <Check aria-hidden />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy aria-hidden />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div
          className={cn(
            'code-snippet__editor',
            wordWrap && 'code-snippet__editor--wrap',
            isCollapsed && 'code-snippet__editor--collapsed',
          )}
        >
          <div className="code-snippet__lines" role="presentation">
            {visibleLines.map((line, idx) => (
              <div key={idx} className="code-snippet__row">
                <span className="code-snippet__line-no">{idx + 1}</span>
                <HighlightedLine line={line} language={language} />
              </div>
            ))}
          </div>
        </div>

        {isCollapsed ? (
          <button
            type="button"
            className="code-snippet__expand"
            onClick={() => setShowAllLines(true)}
          >
            Show {hiddenLineCount} more {hiddenLineCount === 1 ? 'line' : 'lines'}
          </button>
        ) : null}
      </div>

      {expanded ? (
        <div
          className="code-snippet-modal"
          role="dialog"
          aria-modal="true"
          aria-label={`${fileName} code snippet`}
          onClick={() => setExpanded(false)}
        >
          <div
            className="code-snippet-modal__panel"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="code-snippet__header code-snippet-modal__header">
              <div className="code-snippet__header-left">
                <span className="code-snippet__dots" aria-hidden>
                  <span className="code-snippet__dot code-snippet__dot--red" />
                  <span className="code-snippet__dot code-snippet__dot--yellow" />
                  <span className="code-snippet__dot code-snippet__dot--green" />
                </span>
                <Code2 className="code-snippet__file-icon" aria-hidden />
                <span className="code-snippet__filename">{fileName}</span>
                <span className={cn('code-snippet__lang-badge', langClass)}>{langLabel.toUpperCase()}</span>
              </div>
              <div className="code-snippet__header-right">
                <span className="code-snippet__meta">
                  {lineCount} {lineCount === 1 ? 'line' : 'lines'} · {sizeLabel}
                </span>
                <button
                  type="button"
                  className="code-snippet__copy"
                  onClick={handleCopy}
                  aria-label="Copy code"
                >
                  {copied ? (
                    <>
                      <Check aria-hidden />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy aria-hidden />
                      <span>Copy</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  className="code-snippet__icon-btn"
                  aria-label="Close expanded view"
                  onClick={() => setExpanded(false)}
                >
                  <Minimize2 aria-hidden />
                </button>
              </div>
            </div>
            <div className={cn('code-snippet__editor code-snippet-modal__editor', wordWrap && 'code-snippet__editor--wrap')}>
              <div className="code-snippet__lines">
                {lines.map((line, idx) => (
                  <div key={idx} className="code-snippet__row">
                    <span className="code-snippet__line-no">{idx + 1}</span>
                    <HighlightedLine line={line} language={language} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
