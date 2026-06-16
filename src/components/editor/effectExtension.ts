import { Node, mergeAttributes } from "@tiptap/core";

export const WnEffect = Node.create({
  name: "wnEffect",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      effectType: { default: "darken-start" },
      color:      { default: "#0d0d0d" },
    };
  },

  parseHTML() {
    return [{
      tag: "div[data-wn-effect]",
      getAttrs: (el) => {
        const e = el as HTMLElement;
        return {
          effectType: e.getAttribute("data-wn-effect") ?? "darken-start",
          color:      e.getAttribute("data-wn-color") ?? "#0d0d0d",
        };
      },
    }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes({
      "data-wn-effect": HTMLAttributes.effectType,
      "data-wn-color":  HTMLAttributes.color,
      class: "wn-effect-block",
    })];
  },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement("div");
      dom.contentEditable = "false";
      const t = node.attrs.effectType as string;
      dom.textContent = t === "darken-start" ? "🌑 어두워짐 시작" : "🌅 어두워짐 끝 (복구)";
      dom.className = `wn-effect-node wn-effect-node--${t === "darken-start" ? "darken" : "darken-end"}`;
      return { dom };
    };
  },
});
