const html = "\u003c!-- SearchBar markup is preserved inside Sidebar for identical layout. --\u003e";

export default function SearchBar() {
  return <div className="legacy-fragment" dangerouslySetInnerHTML={{ __html: html }} />;
}


