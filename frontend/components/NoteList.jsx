const html = "\u003c!-- Note lists are rendered by the existing noteListHTML helper. --\u003e";

export default function NoteList() {
  return <div className="legacy-fragment" dangerouslySetInnerHTML={{ __html: html }} />;
}


