import React from "react";

export function MarkdownView({ source }: { source: string }) {
  const blocks: React.ReactNode[] = [];
  const lines = source.split(/\r?\n/);
  let buf: string[] = [];
  let listBuf: string[] = [];

  const flushPara = () => {
    if (buf.length) {
      blocks.push(
        <p key={blocks.length} className="my-2 leading-relaxed text-foreground">
          {renderInline(buf.join(" "))}
        </p>,
      );
      buf = [];
    }
  };
  const flushList = () => {
    if (listBuf.length) {
      blocks.push(
        <ul key={blocks.length} className="my-2 ml-6 list-disc space-y-1">
          {listBuf.map((li, i) => (
            <li key={i}>{renderInline(li)}</li>
          ))}
        </ul>,
      );
      listBuf = [];
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      flushPara();
      flushList();
      continue;
    }
    if (line.startsWith("### ")) {
      flushPara();
      flushList();
      blocks.push(
        <h3 key={blocks.length} className="mt-4 text-base font-semibold">
          {line.replace(/^###\s+/, "")}
        </h3>,
      );
    } else if (line.startsWith("## ")) {
      flushPara();
      flushList();
      blocks.push(
        <h2 key={blocks.length} className="mt-6 border-b pb-1 text-lg font-semibold">
          {line.replace(/^##\s+/, "")}
        </h2>,
      );
    } else if (line.startsWith("# ")) {
      flushPara();
      flushList();
      blocks.push(
        <h1 key={blocks.length} className="mt-6 text-xl font-bold">
          {line.replace(/^#\s+/, "")}
        </h1>,
      );
    } else if (/^[-*]\s+/.test(line)) {
      flushPara();
      listBuf.push(line.replace(/^[-*]\s+/, ""));
    } else {
      flushList();
      buf.push(line);
    }
  }
  flushPara();
  flushList();
  return <div className="text-sm">{blocks}</div>;
}

function renderInline(s: string): React.ReactNode {
  const parts = s.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) {
      return <strong key={i}>{p.slice(2, -2)}</strong>;
    }
    return <span key={i}>{p}</span>;
  });
}
