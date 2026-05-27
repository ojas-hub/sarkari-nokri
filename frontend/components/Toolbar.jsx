const html = "\u003c!-- Toolbar markup is preserved inside Editor for identical layout. --\u003e";

export default function Toolbar() {
  return <div className="legacy-fragment" dangerouslySetInnerHTML={{ __html: html }} />;
}


