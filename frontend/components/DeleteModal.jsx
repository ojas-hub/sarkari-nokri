const html = "\u003cdiv class=\"modal-ov\" id=\"delModal\"\u003e\n  \u003cdiv class=\"modal\"\u003e\n    \u003ch2\u003eDelete Note?\u003c/h2\u003e\n    \u003cp\u003eThis will permanently remove the note, images, and drawing data. This cannot be undone.\u003c/p\u003e\n    \u003cdiv class=\"modal-acts\"\u003e\n      \u003cbutton class=\"m-btn m-btn-cancel\" onclick=\"closeModal()\"\u003eCancel\u003c/button\u003e\n      \u003cbutton class=\"m-btn m-btn-del\" onclick=\"confirmDelete()\"\u003eDelete\u003c/button\u003e\n    \u003c/div\u003e\n  \u003c/div\u003e";

export default function DeleteModal() {
  return <div className="legacy-fragment" dangerouslySetInnerHTML={{ __html: html }} />;
}


