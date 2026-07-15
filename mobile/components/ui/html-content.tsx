import React from "react";
import { Text, View } from "react-native";

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)));
}

const HEADING_OPEN = "\u0000H";
const HEADING_CLOSE = "\u0000/h";

type Segment =
  | { type: "heading"; level: number; content: string }
  | { type: "text"; content: string };

const BLOCK_TAGS = "p|div|li|tr|blockquote|section|article|header|footer|figure|figcaption|pre|hr";

function processHtml(html: string): Segment[] {
  let s = html;

  s = s.replace(/<script[\s\S]*?<\/script>/gi, "");
  s = s.replace(/<style[\s\S]*?<\/style>/gi, "");

  // Extract headings with null-byte markers
  s = s.replace(
    /<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi,
    function (_match, level, content) {
      var clean = content.replace(/<[^>]+>/g, "").trim();
      return HEADING_OPEN + level + HEADING_CLOSE + clean + HEADING_OPEN + "/" + level + HEADING_CLOSE;
    }
  );

  // Add newlines around block tags
  s = s.replace(
    new RegExp("<\\/?(?:" + BLOCK_TAGS + ")[^>]*>", "gi"),
    function (match) {
      if (match.startsWith("</")) {
        return "\n" + match + "\n";
      }
      return "\n" + match;
    }
  );

  s = s.replace(/<br\s*\/?>/gi, "\n");
  s = s.replace(/<hr[^>]*>/gi, "\n---\n");
  s = s.replace(/<[^>]+>/g, "");
  s = decodeEntities(s);
  s = s.replace(/[^\S\n]+/g, " ");
  s = s.replace(/\n\s+\n/g, "\n\n");
  s = s.replace(/\n{3,}/g, "\n\n");
  s = s.trim();

  var segments: Segment[] = [];
  var re = new RegExp(
    HEADING_OPEN + "([1-6])" + HEADING_CLOSE + "([\\s\\S]*?)" + HEADING_OPEN + "/\\1" + HEADING_CLOSE,
    "g"
  );
  var lastIdx = 0;
  var m: RegExpExecArray | null;

  while ((m = re.exec(s)) !== null) {
    if (m.index > lastIdx) {
      var before = s.substring(lastIdx, m.index).trim();
      if (before) segments.push({ type: "text", content: before });
    }
    var level = parseInt(m[1]);
    var content = m[2].trim();
    if (content) segments.push({ type: "heading", level: level, content: content });
    lastIdx = m.index + m[0].length;
  }

  if (lastIdx < s.length) {
    var rest = s.substring(lastIdx).trim();
    if (rest) segments.push({ type: "text", content: rest });
  }

  if (segments.length === 0 && s) {
    segments.push({ type: "text", content: s });
  }

  return segments;
}

function getHeadingStyle(level: number) {
  switch (level) {
    case 1: return { fontSize: 26, fontWeight: "800" as const, marginTop: 24, marginBottom: 12, color: "#0f172a" };
    case 2: return { fontSize: 22, fontWeight: "700" as const, marginTop: 20, marginBottom: 10, color: "#0f172a" };
    case 3: return { fontSize: 19, fontWeight: "700" as const, marginTop: 18, marginBottom: 8, color: "#1e293b" };
    default: return { fontSize: 17, fontWeight: "600" as const, marginTop: 16, marginBottom: 6, color: "#1e293b" };
  }
}

function renderTextBlock(text: string, keyPrefix: string): React.ReactNode[] {
  var parts: React.ReactNode[] = [];
  var paragraphs = text.split(/\n\n+/);

  for (var pIdx = 0; pIdx < paragraphs.length; pIdx++) {
    if (pIdx > 0) {
      parts.push(<Text key={keyPrefix + "-gap" + pIdx}>{"\n\n"}</Text>);
    }
    var lines = paragraphs[pIdx].split(/\n/);
    for (var lIdx = 0; lIdx < lines.length; lIdx++) {
      var trimmed = lines[lIdx].trim();
      if (!trimmed) continue;

      if (lIdx > 0) {
        parts.push(<Text key={keyPrefix + "-br" + pIdx + "-" + lIdx}>{"\n"}</Text>);
      }

      if (/^[•\-\*]\s/.test(trimmed)) {
        parts.push(
          <Text key={keyPrefix + "-li" + pIdx + "-" + lIdx} style={{ paddingLeft: 8 }}>
            {"• " + trimmed.replace(/^[•\-\*]\s/, "")}
          </Text>
        );
      } else if (/^\d+[.)]\s/.test(trimmed)) {
        parts.push(
          <Text key={keyPrefix + "-li" + pIdx + "-" + lIdx} style={{ paddingLeft: 8 }}>
            {trimmed}
          </Text>
        );
      } else {
        parts.push(<Text key={keyPrefix + "-t" + pIdx + "-" + lIdx}>{trimmed}</Text>);
      }
    }
  }

  return parts;
}

export function HtmlContent({ html }: { html: string }) {
  if (!html) return null;

  if (!/<[a-z][\s\S]*>/i.test(html)) {
    var parts = renderTextBlock(html, "plain");
    return <Text style={{ fontSize: 15, color: "#334155", lineHeight: 24 }}>{parts}</Text>;
  }

  var segments = processHtml(html);
  if (segments.length === 0) return null;

  return (
    <View style={{ gap: 4 }}>
      {segments.map(function (seg, i) {
        if (seg.type === "heading") {
          var style = getHeadingStyle(seg.level);
          return (
            <Text key={i} style={style}>
              {seg.content}
            </Text>
          );
        }
        var textParts = renderTextBlock(seg.content, "t" + i);
        return <Text key={i} style={{ fontSize: 15, color: "#334155", lineHeight: 24 }}>{textParts}</Text>;
      })}
    </View>
  );
}
