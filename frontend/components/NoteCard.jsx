const html = "\u003c!-- Note cards are rendered by the existing noteCardHTML helper. --\u003e";

export default function NoteCard() {
  return <div className="legacy-fragment" dangerouslySetInnerHTML={{ __html: html }} />;
}


