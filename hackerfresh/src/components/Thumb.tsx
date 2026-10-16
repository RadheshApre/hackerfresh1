import { RESUME_CSS, renderResumeHtml } from "@/lib/resume/render";
import { SAMPLE_RESUME } from "@/lib/resume/sample";
import type { TemplateId } from "@/lib/resume/types";

export default function Thumb({ template, scale = 0.36 }: { template: TemplateId; scale?: number }) {
  return (
    <div className="thumbwrap" style={{ ["--s" as string]: scale }} aria-label={`${template} template preview (sample data)`}>
      <style>{RESUME_CSS}</style><span className="tag">SAMPLE</span>
      <div className="scale" dangerouslySetInnerHTML={{ __html: renderResumeHtml(SAMPLE_RESUME, template) }} />
    </div>);
}
