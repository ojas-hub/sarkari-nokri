const html = "\u003cdiv class=\"toast-wrap\" id=\"toastWrap\"\u003e\u003c/div\u003e";

export default function Toast() {
  return <div className="legacy-fragment" dangerouslySetInnerHTML={{ __html: html }} />;
}


