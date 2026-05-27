const html = "\u003c!-- ImagePanel markup is preserved inside Editor for identical layout. --\u003e";

export default function ImagePanel() {
  return <div className="legacy-fragment" dangerouslySetInnerHTML={{ __html: html }} />;
}


