const html = "\u003cdiv class=\"lightbox\" id=\"lightbox\" onclick=\"closeLightbox()\"\u003e\n  \u003cimg id=\"lbImg\" src=\"\" alt=\"Note image\"\u003e\n  \u003cdiv class=\"lb-close\" onclick=\"closeLightbox()\"\u003e\n    \u003csvg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"\u003e\u003cline x1=\"18\" y1=\"6\" x2=\"6\" y2=\"18\"/\u003e\u003cline x1=\"6\" y1=\"6\" x2=\"18\" y2=\"18\"/\u003e\u003c/svg\u003e\n  \u003c/div\u003e\n\u003c/div\u003e";

export default function Lightbox() {
  return <div className="legacy-fragment" dangerouslySetInnerHTML={{ __html: html }} />;
}


