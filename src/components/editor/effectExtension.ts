import { Node, mergeAttributes } from "@tiptap/core";

export const WnEffect = Node.create({
  name: "wnEffect",
  group: "block",
  content: "block+",   // 내부에 블록 컨텐츠 포함 (blockquote와 동일 구조)
  defining: true,
  draggable: true,

  addAttributes() {
    return {
      color:     { default: "#0d0d0d" },
      textColor: { default: "#f0f0f0" },
    };
  },

  parseHTML() {
    return [{
      tag: "div[data-wn-effect='darken']",
      getAttrs: (el) => {
        const e = el as HTMLElement;
        return {
          color:     e.getAttribute("data-wn-color")      ?? "#0d0d0d",
          textColor: e.getAttribute("data-wn-text-color") ?? "#f0f0f0",
        };
      },
    }];
  },

  renderHTML({ HTMLAttributes }) {
    const { color, textColor } = HTMLAttributes;
    return [
      "div",
      mergeAttributes({
        "data-wn-effect":     "darken",
        "data-wn-color":      color,
        "data-wn-text-color": textColor,
        class: "wn-darken-block",
        style: `background-color:${color};color:${textColor}`,
      }),
      0, // 컨텐츠 hole
    ];
  },

  addNodeView() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ({ node, getPos, editor }: any) => {
      // 현재 attrs를 mutable ref로 유지 (이벤트 핸들러 클로저용)
      const cur = { ...node.attrs };

      /* ── 외부 컨테이너 ── */
      const dom = document.createElement("div");
      dom.className = "wn-effect-node wn-effect-node--darken wn-darken-editor";
      dom.style.backgroundColor = cur.color;
      dom.style.color           = cur.textColor;

      /* ── 툴바 (편집 불가) ── */
      const toolbar = document.createElement("div");
      toolbar.contentEditable = "false";
      toolbar.draggable = true;
      toolbar.className = "wn-darken-toolbar";

      const grip = document.createElement("span");
      grip.textContent = "⠿";
      grip.style.cssText = "opacity:.4;cursor:grab;font-size:14px;margin-right:4px;";

      const lbl = document.createElement("span");
      lbl.textContent = "🌑 어두운 구간";
      lbl.style.flex = "1";

      const makeTag = (t: string) => {
        const s = document.createElement("span");
        s.textContent = t;
        s.style.cssText = "font-size:11px;opacity:.65;";
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
          // DOM 즉시 반영
          if (key === "color")     { dom.style.backgroundColor = val; }
          if (key === "textColor") { dom.style.color           = val; }
          editor.chain().command(({ tr, dispatch }: any) => {
            if (dispatch) tr.setNodeMarkup(getPos(), undefined, { ...cur });
            return true;
          }).run();
        });
        return inp;
      };

      const bgPick   = makePicker(cur.color,     "배경색", "color");
      const txtPick  = makePicker(cur.textColor, "글자색", "textColor");

      toolbar.append(grip, lbl, makeTag("배경"), bgPick, makeTag("글자"), txtPick);

      /* ── 컨텐츠 영역 ── */
      const contentDOM = document.createElement("div");
      contentDOM.className = "wn-darken-content";

      dom.append(toolbar, contentDOM);

      // 속성 변경 시 DOM만 업데이트 (전체 재마운트 방지)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const update = (updated: any): boolean => {
        if (updated.type.name !== node.type.name) return false;
        Object.assign(cur, updated.attrs);
        dom.style.backgroundColor = cur.color;
        dom.style.color           = cur.textColor;
        bgPick.value  = cur.color;
        txtPick.value = cur.textColor;
        return true;
      };

      return { dom, contentDOM, update };
    };
  },
});
