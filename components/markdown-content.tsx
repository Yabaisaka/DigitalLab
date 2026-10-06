import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import '@/app/markdown.css';

export default function MarkdownContent({children}:{children:string}) {
  return <div className="markdown-body"><ReactMarkdown
    remarkPlugins={[remarkGfm]}
    skipHtml
    disallowedElements={['img']}
    urlTransform={url=>/^(https?:|mailto:|tel:|#|\/(?!\/))/i.test(url.trim())?url:''}
    components={{
      a:({href,children})=>href?<a href={href} target={/^https?:/i.test(href)?'_blank':undefined} rel="noopener noreferrer">{children}</a>:<span>{children}</span>,
      h1:({children})=><h3>{children}</h3>,
      h2:({children})=><h4>{children}</h4>,
      table:({children})=><div className="markdown-table"><table>{children}</table></div>
    }}
  >{children}</ReactMarkdown></div>;
}
