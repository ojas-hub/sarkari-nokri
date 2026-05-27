const html = "\u003c!-- Voice recorder button is preserved inside Editor toolbar. --\u003e";

export default function VoiceRecorder() {
  return <div className="legacy-fragment" dangerouslySetInnerHTML={{ __html: html }} />;
}


