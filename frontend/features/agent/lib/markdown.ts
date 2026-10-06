/**
 * Normalizes LLM-produced Markdown so it renders correctly with GFM.
 * Models frequently emit raw HTML breaks and slightly malformed tables;
 * this pass repairs the common cases without changing visible content.
 */
export function normalizeMarkdown(input: string): string {
  if (!input) return "";
  let out = input;

  // 1. HTML line breaks -> Markdown hard breaks (rendered literally otherwise).
  out = out.replace(/<br\s*\/?>/gi, "  \n");

  // 2. Strip other stray inline HTML tags models sometimes emit inside
  //    table cells (keep code spans intact).
  out = out.replace(/<\/?(?:div|span|p|font)[^>]*>/gi, "");

  // 3. Repair single-line tables: models sometimes emit an entire table on
  //    one physical line ("| A | B | |---|---| | a | b |"). GFM needs one row
  //    per line, so split them back into rows. Only touches lines that look
  //    like a header + delimiter crammed together.
  out = out
    .split("\n")
    .map((line) => {
      const pipeCount = (line.match(/\|/g) || []).length;
      if (pipeCount >= 6 && /\|[\s:|-]*---/.test(line)) {
        // Split "||" row boundaries, then ensure every row is pipe-wrapped.
        const rows = line.split("||").map((r) => {
          let s = r.trim();
          if (!s.startsWith("|")) s = `| ${s}`;
          if (!s.endsWith("|")) s = `${s} |`;
          return s;
        });
        if (rows.length > 1) return rows.join("\n");
      }
      return line;
    })
    .join("\n");

  return out;
}
