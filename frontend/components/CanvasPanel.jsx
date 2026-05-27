const html = "\u003c!-- CanvasPanel markup is preserved inside Editor for identical layout. --\u003e";

export default function CanvasPanel() {
  return <div className="legacy-fragment" dangerouslySetInnerHTML={{ __html: html }} />;
}


