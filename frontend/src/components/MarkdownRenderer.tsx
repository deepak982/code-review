/**
 * MarkdownRenderer component - Renders markdown content with proper styling
 *
 * @param {Object} props - Component props
 * @param {string} props.content - Markdown content to render
 * @returns JSX element
 */

interface MarkdownRendererProps {
  content: string
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  // Parse markdown manually for common patterns
  const renderMarkdown = (text: string) => {
    const lines = text.split('\n')
    const elements: JSX.Element[] = []
    let codeBlock = false
    let codeContent: string[] = []
    let codeLanguage = ''
    let listItems: string[] = []
    let inList = false

    const flushList = () => {
      if (listItems.length > 0) {
        elements.push(
          <ul key={`list-${elements.length}`} className="list-disc list-inside my-2 space-y-1">
            {listItems.map((item, idx) => (
              <li key={idx} className="ml-4">{processInlineMarkdown(item)}</li>
            ))}
          </ul>
        )
        listItems = []
      }
      inList = false
    }

    const processInlineMarkdown = (line: string) => {
      // Bold: **text** or __text__
      line = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      line = line.replace(/__(.+?)__/g, '<strong>$1</strong>')

      // Italic: *text* or _text_
      line = line.replace(/\*(.+?)\*/g, '<em>$1</em>')
      line = line.replace(/_(.+?)_/g, '<em>$1</em>')

      // Inline code: `code`
      line = line.replace(/`(.+?)`/g, '<code class="px-1.5 py-0.5 bg-slate-100 text-slate-800 rounded text-sm font-mono">$1</code>')

      // Links: [text](url)
      line = line.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">$1</a>')

      return <span dangerouslySetInnerHTML={{ __html: line }} />
    }

    lines.forEach((line, index) => {
      // Code blocks: ```language
      if (line.startsWith('```')) {
        if (!codeBlock) {
          flushList()
          codeBlock = true
          codeLanguage = line.slice(3).trim()
          codeContent = []
        } else {
          codeBlock = false
          elements.push(
            <div key={`code-${index}`} className="my-3">
              {codeLanguage && (
                <div className="bg-slate-700 text-slate-300 text-xs px-3 py-1 rounded-t font-mono">
                  {codeLanguage}
                </div>
              )}
              <pre className={`bg-slate-800 text-slate-100 p-3 overflow-x-auto ${codeLanguage ? 'rounded-b' : 'rounded'}`}>
                <code className="text-sm font-mono">{codeContent.join('\n')}</code>
              </pre>
            </div>
          )
          codeContent = []
          codeLanguage = ''
        }
        return
      }

      if (codeBlock) {
        codeContent.push(line)
        return
      }

      // Headers
      if (line.startsWith('#### ')) {
        flushList()
        elements.push(<h4 key={index} className="text-base font-semibold mt-3 mb-2">{line.slice(5)}</h4>)
      } else if (line.startsWith('### ')) {
        flushList()
        elements.push(<h3 key={index} className="text-lg font-semibold mt-4 mb-2">{line.slice(4)}</h3>)
      } else if (line.startsWith('## ')) {
        flushList()
        elements.push(<h2 key={index} className="text-xl font-bold mt-4 mb-3">{line.slice(3)}</h2>)
      } else if (line.startsWith('# ')) {
        flushList()
        elements.push(<h1 key={index} className="text-2xl font-bold mt-4 mb-3">{line.slice(2)}</h1>)
      }
      // Lists: - item or * item
      else if (line.match(/^[\*\-]\s+/)) {
        if (!inList) {
          inList = true
        }
        listItems.push(line.replace(/^[\*\-]\s+/, ''))
      }
      // Numbered lists: 1. item
      else if (line.match(/^\d+\.\s+/)) {
        flushList()
        const content = line.replace(/^\d+\.\s+/, '')
        if (!elements.length || elements[elements.length - 1].type !== 'ol') {
          elements.push(
            <ol key={`ol-${index}`} className="list-decimal list-inside my-2 space-y-1">
              <li className="ml-4">{processInlineMarkdown(content)}</li>
            </ol>
          )
        }
      }
      // Blockquotes: > text
      else if (line.startsWith('> ')) {
        flushList()
        elements.push(
          <blockquote key={index} className="border-l-4 border-slate-300 pl-4 italic text-slate-600 my-2">
            {processInlineMarkdown(line.slice(2))}
          </blockquote>
        )
      }
      // Horizontal rule: --- or ***
      else if (line.match(/^(\-\-\-|\*\*\*)$/)) {
        flushList()
        elements.push(<hr key={index} className="my-4 border-slate-300" />)
      }
      // Empty line
      else if (line.trim() === '') {
        flushList()
        elements.push(<div key={index} className="h-2" />)
      }
      // Regular paragraph
      else {
        if (inList && !line.match(/^[\*\-]\s+/)) {
          flushList()
        }
        if (line.trim()) {
          elements.push(<p key={index} className="my-1.5">{processInlineMarkdown(line)}</p>)
        }
      }
    })

    // Flush any remaining list items
    flushList()

    return elements
  }

  return <div className="markdown-content">{renderMarkdown(content)}</div>
}
