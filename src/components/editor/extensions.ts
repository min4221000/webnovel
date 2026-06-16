import { Extension } from "@tiptap/core";
import Image from "@tiptap/extension-image";

// ===== 글자 크기 확장 (TextStyle 기반) =====
declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    fontSize: {
      setFontSize: (size: string) => ReturnType;
      unsetFontSize: () => ReturnType;
    };
  }
}

export const FontSize = Extension.create({
  name: "fontSize",
  addOptions() {
    return { types: ["textStyle"] };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (el) => (el as HTMLElement).style.fontSize || null,
            renderHTML: (attrs) =>
              attrs.fontSize ? { style: `font-size: ${attrs.fontSize}` } : {},
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontSize:
        (size) =>
        ({ chain }) =>
          chain().setMark("textStyle", { fontSize: size }).run(),
      unsetFontSize:
        () =>
        ({ chain }) =>
          chain()
            .setMark("textStyle", { fontSize: null })
            .removeEmptyTextStyle()
            .run(),
    };
  },
});

// ===== 이미지 확장: width(크기) 속성 추가, 블록 노드(정렬 가능) =====
export const ResizableImage = Image.extend({
  inline: false,
  group: "block",
  draggable: true,
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (el) =>
          (el as HTMLElement).style.width ||
          (el as HTMLElement).getAttribute("width") ||
          null,
        renderHTML: (attrs) =>
          attrs.width ? { style: `width: ${attrs.width}; height: auto;` } : {},
      },
    };
  },
});
