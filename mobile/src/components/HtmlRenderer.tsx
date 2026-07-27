import React from 'react';
import { View, Text } from 'react-native';

interface HtmlRendererProps {
  html: string;
  baseTextStyle?: object;
}

type Block =
  | { type: 'paragraph'; nodes: InlineNode[] }
  | { type: 'heading'; level: 1 | 2 | 3; nodes: InlineNode[] }
  | { type: 'list'; ordered: boolean; items: InlineNode[][] }
  | { type: 'br' };

type InlineNode =
  | { kind: 'text'; text: string }
  | { kind: 'bold'; text: string }
  | { kind: 'italic'; text: string }
  | { kind: 'bolditalic'; text: string };

function decodeEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function pushText(nodes: InlineNode[], text: string, bold: boolean, italic: boolean) {
  if (!text) return;
  if (bold && italic) nodes.push({ kind: 'bolditalic', text });
  else if (bold) nodes.push({ kind: 'bold', text });
  else if (italic) nodes.push({ kind: 'italic', text });
  else nodes.push({ kind: 'text', text });
}

function parseInline(html: string): InlineNode[] {
  const nodes: InlineNode[] = [];
  const re = /<(\/?)(?:b|strong|i|em)>/gi;
  let bold = false;
  let italic = false;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    const textBefore = html.slice(lastIndex, match.index);
    if (textBefore) {
      pushText(nodes, decodeEntities(textBefore.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '')), bold, italic);
    }
    const closing = match[1] === '/';
    const tagLower = match[0].replace(/<\/?/g, '').replace(/>/, '').toLowerCase();
    if (tagLower === 'b' || tagLower === 'strong') bold = !closing;
    if (tagLower === 'i' || tagLower === 'em') italic = !closing;
    lastIndex = re.lastIndex;
  }
  const tail = html.slice(lastIndex);
  if (tail) {
    pushText(nodes, decodeEntities(tail.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '')), bold, italic);
  }
  return nodes;
}

function parseBlocks(html: string): Block[] {
  const blocks: Block[] = [];
  const src = html.replace(/<br\s*\/>/gi, '<br>');
  const blockRe = /<(h[1-3]|p|ul|ol|li|div|blockquote)[^>]*>([\s\S]*?)<\/\1>|<br>/gi;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = blockRe.exec(src)) !== null) {
    const before = src.slice(lastIndex, match.index).trim();
    if (before) blocks.push({ type: 'paragraph', nodes: parseInline(before) });
    const tag = (match[1] || '').toLowerCase();
    const inner = match[2] || '';
    if (!tag) {
      blocks.push({ type: 'br' });
    } else if (tag === 'h1' || tag === 'h2' || tag === 'h3') {
      blocks.push({ type: 'heading', level: Number(tag[1]) as 1 | 2 | 3, nodes: parseInline(inner) });
    } else if (tag === 'ul' || tag === 'ol') {
      const items: InlineNode[][] = [];
      const liRe = /<li[^>]*>([\s\S]*?)<\/li>/gi;
      let liMatch: RegExpExecArray | null;
      while ((liMatch = liRe.exec(inner)) !== null) {
        items.push(parseInline(liMatch[1]));
      }
      if (items.length > 0) blocks.push({ type: 'list', ordered: tag === 'ol', items });
    } else if (tag === 'p' || tag === 'div' || tag === 'blockquote') {
      const nodes = parseInline(inner);
      if (nodes.length > 0) blocks.push({ type: 'paragraph', nodes });
    } else if (tag === 'li') {
      blocks.push({ type: 'paragraph', nodes: parseInline(inner) });
    }
    lastIndex = blockRe.lastIndex;
  }
  const tailSrc = src.slice(lastIndex).trim();
  if (tailSrc) blocks.push({ type: 'paragraph', nodes: parseInline(tailSrc) });
  if (blocks.length === 0 && html.trim()) blocks.push({ type: 'paragraph', nodes: parseInline(html) });
  return blocks;
}

function renderInline(nodes: InlineNode[], baseStyle: object) {
  return (
    <Text style={baseStyle}>
      {nodes.map((node, i) => {
        if (node.kind === 'bold') return <Text key={i} style={{ fontWeight: '700' }}>{node.text}</Text>;
        if (node.kind === 'italic') return <Text key={i} style={{ fontStyle: 'italic' }}>{node.text}</Text>;
        if (node.kind === 'bolditalic') return <Text key={i} style={{ fontWeight: '700', fontStyle: 'italic' }}>{node.text}</Text>;
        return <Text key={i}>{node.text}</Text>;
      })}
    </Text>
  );
}

export default function HtmlRenderer({ html, baseTextStyle }: HtmlRendererProps) {
  if (!html) return null;
  const textStyle: object = { fontSize: 14, color: '#334155', lineHeight: 22, ...(baseTextStyle || {}) };
  const blocks = parseBlocks(html);
  return (
    <View>
      {blocks.map((block, i) => {
        if (block.type === 'br') return <View key={i} style={{ height: 8 }} />;
        if (block.type === 'heading') {
          const headingStyle = {
            fontWeight: '700' as const,
            color: '#0f172a',
            marginBottom: 6,
            marginTop: i > 0 ? 12 : 0,
            fontSize: block.level === 1 ? 20 : block.level === 2 ? 17 : 15,
          };
          return <View key={i}>{renderInline(block.nodes, headingStyle)}</View>;
        }
        if (block.type === 'paragraph') {
          return <View key={i} style={{ marginBottom: 8 }}>{renderInline(block.nodes, textStyle)}</View>;
        }
        if (block.type === 'list') {
          return (
            <View key={i} style={{ marginBottom: 8, paddingLeft: 4 }}>
              {block.items.map((itemNodes, idx) => (
                <View key={idx} style={{ flexDirection: 'row', marginBottom: 4, alignItems: 'flex-start' }}>
                  <Text style={{ ...(textStyle as any), minWidth: 20, color: '#475569' }}>
                    {block.ordered ? `${idx + 1}.` : '•'}
                  </Text>
                  <View style={{ flex: 1 }}>{renderInline(itemNodes, textStyle)}</View>
                </View>
              ))}
            </View>
          );
        }
        return null;
      })}
    </View>
  );
}
