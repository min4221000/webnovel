/* eslint-disable @typescript-eslint/no-explicit-any */
import { Node, mergeAttributes } from "@tiptap/core";
import { NodeSelection, TextSelection } from "@tiptap/pm/state";

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
      textColor:  { default: "#f0f0f0" },
      hideStyles: { default: "true" },  // 밖에서 커스텀 색 숨김
    };
  },

  parseHTML() {
    return [{
      tag: "div[data-wn-effect]",
      getAttrs: (el) => {
        const e = el as HTMLElement;
        return {
          effectType:  e.getAttribute("data-wn-effect")      ?? "darken-start",
          color:       e.getAttribute("data-wn-color")       ?? "#0d0d0d",
          textColor:   e.getAttribute("data-wn-text-color")  ?? "#f0f0f0",
          hideStyles:  e.getAttribute("data-wn-hide-styles") ?? "true",
        };
      },
    }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes({
      "data-wn-effect":      HTMLAttributes.effectType,
      "data-wn-color":       HTMLAttributes.color,
      "data-wn-text-color":  HTMLAttributes.textColor,
      "data-wn-hide-styles": HTMLAttributes.hideStyles,
      class: "wn-effect-block",
    })];
  },

  addKeyboardShortcuts() {
    return {
      Enter: () => {
        const { state } = this.editor;
        if (!(state.selection instanceof NodeSelection)) return false;
        if (state.selection.node.type.name !== this.name) return false;
        const sel = state.selection;
        return this.editor.chain().command(({ tr, dispatch }) => {
          if (dispatch) {
            tr.insert(sel.to, state.schema.nodes.paragraph.create());
            tr.setSelection(TextSelection.create(tr.doc, sel.to + 1));
            dispatch(tr);
          }
          return true;
        }).run();
      },
    };
  },

  addNodeView() {
    return ({ node, getPos, editor }: any) => {
      const t = node.attrs.effectType as string;
      const isDarkStart = t === "darken-start";
      const cur = { ...node.attrs };

      const dom = document.createElement("div");
      dom.contentEditable = "false";
      dom.draggable = true;
      dom.className = `wn-effect-node wn-effect-node--${isDarkStart ? "darken" : "darken-end"}`;
      dom.style.cssText = "display:flex;align-items:center;gap:6px;cursor:grab;";

      const grip = document.createElement("span");
      grip.textContent = "⠿";
      grip.style.cssText = "opacity:.4;font-size:14px;flex-shrink:0;";
      dom.appendChild(grip);

      const label = document.createElement("span");
      label.textContent = isDarkStart ? "🌑 어두워짐 시작" : "🌅 어두워짐 끝";
      label.style.flex = "1";
      dom.appendChild(label);

      let bgPicker: HTMLInputElement | null = null;
      let textPicker: HTMLInputElement | null = null;
      let updateToggle: (() => void) | null = null;

      if (isDarkStart) {
        const makeTag = (text: string) => {
          const s = document.createElement("span");
          s.textContent = text;
          s.style.cssText = "font-size:11px;opacity:.65;flex-shrink:0;";
          return s;
        };

        const makePicker = (value: string, title: string, key: "color" | "textColor") => {
          const inp = document.createElement("input");
          inp.type = "color";
          inp.value = value;
          inp.title = title;
          inp.style.cssText =
            "width:22px;height:22px;border:2px solid rgba(255,255,255,.3);cursor:pointer;border-radius:4px;padding:1px;flex-shrink:0;background:none;";
          inp.addEventListener("mousedown", (e) => e.stopPropagation());
          inp.addEventListener("input", (e) => {
            if (typeof getPos !== "function") return;
            const val = (e.target as HTMLInputElement).value;
            cur[key] = val;
            editor.chain().command(({ tr, dispatch }: any) => {
              if (dispatch) tr.setNodeMarkup(getPos(), undefined, { ...cur });
              return true;
            }).run();
          });
          return inp;
        };

        bgPicker   = makePicker(cur.color,     "배경색", "color");
        textPicker = makePicker(cur.textColor, "글자색", "textColor");

        // hideStyles 토글
        const toggleBtn = document.createElement("button");
        toggleBtn.type = "button";
        toggleBtn.title = "밖에서 커스텀 색 숨김 토글";
        updateToggle = () => {
          toggleBtn.textContent = cur.hideStyles === "true" ? "👁‍🗨 숨김" : "👁 표시";
          toggleBtn.style.cssText =
            `font-size:11px;padding:2px 6px;border-radius:4px;cursor:pointer;flex-shrink:0;border:1px solid rgba(255,255,255,.3);background:${cur.hideStyles === "true" ? "rgba(255,255,255,.15)" : "rgba(255,200,0,.3)"};color:inherit;`;
        };
        updateToggle();
        toggleBtn.addEventListener("mousedown", (e) => e.stopPropagation());
        toggleBtn.addEventListener("click", () => {
          if (typeof getPos !== "function") return;
          cur.hideStyles = cur.hideStyles === "true" ? "false" : "true";
          updateToggle?.();
          editor.chain().command(({ tr, dispatch }: any) => {
            if (dispatch) tr.setNodeMarkup(getPos(), undefined, { ...cur });
            return true;
          }).run();
        });

        dom.appendChild(makeTag("배경"));
        dom.appendChild(bgPicker);
        dom.appendChild(makeTag("글자"));
        dom.appendChild(textPicker);
        dom.appendChild(toggleBtn);
      }

      const update = (updatedNode: any): boolean => {
        if (updatedNode.type.name !== node.type.name) return false;
        Object.assign(cur, updatedNode.attrs);
        if (bgPicker)   bgPicker.value   = cur.color;
        if (textPicker) textPicker.value  = cur.textColor;
        if (updateToggle) updateToggle();
        return true;
      };

      return { dom, update };
    };
  },
});
