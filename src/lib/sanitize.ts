import DOMPurify from 'dompurify';

const purifyConfig: DOMPurify.Config = {
  ALLOWED_TAGS: [
    'b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'blockquote', 'code', 'pre', 'hr', 'table', 'thead', 'tbody',
    'tr', 'th', 'td', 'span', 'div', 'img', 'sup', 'sub',
    'dl', 'dt', 'dd', 'del', 'ins'
  ],
  ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'id', 'target', 'rel', 'width', 'height'],
  ALLOW_DATA_ATTR: false,
};

export function sanitizeHtml(html: string): string {
  if (typeof window === 'undefined') return html;
  return DOMPurify.sanitize(html, purifyConfig);
}
