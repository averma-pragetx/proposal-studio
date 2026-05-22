import React from "react";

export function MarkdownView({ source }: { source: string }) {
  const blocks: React.ReactNode[] = [];
  const lines = source.split(/\r?\n/);
  let buf: string[] = [];
  let listBuf: string[] = [];
  let numListBuf: string[] = [];

  const flushPara = () => {
    if (buf.length) {
      blocks.push(
        <p key={blocks.length} className="my-3 leading-relaxed text-foreground whitespace-pre-wrap">
          {buf.map((line, i) => (
            <React.Fragment key={i}>
              {renderInline(line)}
              {i < buf.length - 1 && <br />}
            </React.Fragment>
          ))}
        </p>,
      );
      buf = [];
    }
  };

  const flushList = () => {
    if (listBuf.length) {
      blocks.push(
        <ul key={blocks.length} className="my-3 ml-6 space-y-1">
          {listBuf.map((li, i) => (
            <li key={i} className="relative">
              <span className="absolute -left-4 text-primary opacity-50">•</span>
              {renderInline(li)}
            </li>
          ))}
        </ul>,
      );
      listBuf = [];
    }
  };

  const flushNumList = () => {
    if (numListBuf.length) {
      blocks.push(
        <ol key={blocks.length} className="my-3 ml-6 list-decimal space-y-1">
          {numListBuf.map((li, i) => (
            <li key={i}>{renderInline(li)}</li>
          ))}
        </ol>
      );
      numListBuf = [];
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      flushPara();
      flushList();
      flushNumList();
      continue;
    }

    // Headings
    if (line.match(/^###\s*/)) {
      flushPara(); flushList(); flushNumList();
      blocks.push(<h3 key={blocks.length} className="mt-5 mb-2 text-base font-semibold">{line.replace(/^###\s*/, "")}</h3>);
    } else if (line.match(/^##\s*/)) {
      flushPara(); flushList(); flushNumList();
      blocks.push(<h2 key={blocks.length} className="mt-7 mb-3 border-b pb-1 text-lg font-semibold">{line.replace(/^##\s*/, "")}</h2>);
    } else if (line.match(/^#\s*/)) {
      flushPara(); flushList(); flushNumList();
      blocks.push(<h1 key={blocks.length} className="mt-8 mb-4 text-xl font-bold">{line.replace(/^#\s*/, "")}</h1>);
    } 
    // Bullet lists
    else if (line.match(/^[-*+]\s+/)) {
      flushPara(); flushNumList();
      listBuf.push(line.replace(/^[-*+]\s+/, ""));
    }
    // Numbered lists
    else if (line.match(/^\d+\.\s+/)) {
      flushPara(); flushList();
      numListBuf.push(line.replace(/^\d+\.\s+/, ""));
    }
    // Paragraph text
    else {
      flushList(); flushNumList();
      buf.push(line);
    }
  }

  flushPara();
  flushList();
  flushNumList();

  return <div className="text-sm">{blocks}</div>;
}

function renderInline(s: string): React.ReactNode {
  // Handle bold (**text**)
  let parts: (string | React.ReactNode)[] = s.split(/(\*\*[^*]+\*\*)/g).map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) {
      return <strong key={`b-${i}`}>{p.slice(2, -2)}</strong>;
    }
    return p;
  });

  // Handle italics (*text* or _text_)
  // We need to be careful not to match across already processed nodes
  const processed: React.ReactNode[] = [];
  for (const part of parts) {
    if (typeof part === "string") {
      const subParts = part.split(/(\*[^*]+\*|_[^_]+_)/g);
      subParts.forEach((sp, i) => {
        if ((sp.startsWith("*") && sp.endsWith("*")) || (sp.startsWith("_") && sp.endsWith("_"))) {
          processed.push(<em key={`e-${i}`}>{sp.slice(1, -1)}</em>);
        } else if (sp) {
          processed.push(sp);
        }
      });
    } else {
      processed.push(part);
    }
  }

  return processed;
}
