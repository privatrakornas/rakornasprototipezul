import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';
import { Fragment } from 'react';

interface LatexTextProps {
  children: string;
  className?: string;
  block?: boolean;
}

/**
 * Renders text with LaTeX math formulas.
 * Supports both inline ($...$) and block ($$...$$) LaTeX notation.
 * Also supports \frac, \sqrt, etc. wrapped in $ signs.
 */
const LatexText = ({ children, className = '', block = false }: LatexTextProps) => {
  if (!children) return null;

  // Pattern to match LaTeX: $$...$$ for block, $...$ for inline
  // Also matches \(...\) for inline and \[...\] for block
  const latexPattern = /(\$\$[\s\S]*?\$\$|\$[^$\n]+?\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\))/g;

  const parts = children.split(latexPattern);

  const renderPart = (part: string, index: number) => {
    // Block math: $$...$$ or \[...\]
    if (part.startsWith('$$') && part.endsWith('$$')) {
      const math = part.slice(2, -2).trim();
      return <BlockMath key={index} math={math} />;
    }
    if (part.startsWith('\\[') && part.endsWith('\\]')) {
      const math = part.slice(2, -2).trim();
      return <BlockMath key={index} math={math} />;
    }

    // Inline math: $...$ or \(...\)
    if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
      const math = part.slice(1, -1).trim();
      return <InlineMath key={index} math={math} />;
    }
    if (part.startsWith('\\(') && part.endsWith('\\)')) {
      const math = part.slice(2, -2).trim();
      return <InlineMath key={index} math={math} />;
    }

    // Regular text - preserve whitespace and newlines
    return <Fragment key={index}>{part}</Fragment>;
  };

  return (
    <span className={className}>
      {parts.map((part, index) => renderPart(part, index))}
    </span>
  );
};

export default LatexText;
