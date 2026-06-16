import { Node, mergeAttributes } from "@tiptap/core";

export const WnEffect = Node.create({
  name: "wnEffect",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      effectType: { default: "vibrate" },
      color:      { default: "#000000" },
      duration:   { default: "2000" },
      text:       { default: "" },
    };
  },

  parseHTML() {
    return [{
      tag: "div[data-wn-effect]",
      getAttrs: (el) => {
        const e = el as HTMLElement;
        return {
          effectType: e.getAttribute("data-wn-effect") ?? "vibrate",
          color:      e.getAttribute("data-wn-color") ?? "#000000",
          duration:   e.getAttribute("data-wn-duration") ?? "2000",
          text:       e.getAttribute("data-wn-text") ?? "",
        };
      },
    }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes({
      "data-wn-effect":   HTMLAttributes.effectType,
      "data-wn-color":    HTMLAttributes.color,
      "data-wn-duration": HTMLAttributes.duration,
      "data-wn-text":     HTMLAttributes.text,
      class: "wn-effect-block",
    })];
  },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement("div");
      dom.contentEditable = "false";

      const t = node.attrs.effectType as string;
      const LABEL: Record<string, string> = {
        vibrate:    "⚡ 진동 (쾅!) — 모바일 1회 진동",
        darken:     "🌑 화면 어두워짐",
        typewriter: "⌨️ 타이핑 효과",
        parallax:   "🌊 패럴랙스 구분선",
      };
      let label = LABEL[t] ?? "효과";
      if (t === "typewriter" && node.attrs.text) {
        const preview = (node.attrs.text as string).slice(0, 24);
        label = `⌨️ "${preview}${node.attrs.text.length > 24 ? "…" : ""}"`;
      }
      dom.textContent = label;
      dom.className = `wn-effect-node wn-effect-node--${t}`;
      return { dom };
    };
  },
});
