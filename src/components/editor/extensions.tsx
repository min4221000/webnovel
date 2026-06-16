"use client";

import { Extension } from "@tiptap/core";
import Image from "@tiptap/extension-image";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { useRef, useCallback, useState } from "react";

// ===== 글자 크기 =====
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
          chain().setMark("textStyle", { fontSize: null }).removeEmptyTextStyle().run(),
    };
  },
});

// ===== 이미지 드래그 리사이즈 NodeView =====
function ImageResizeView({ node, updateAttributes, selected }: NodeViewProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const startX = useRef(0);
  const startW = useRef(0);
  const [broken, setBroken] = useState(false);

  const onResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      startX.current = e.clientX;
      startW.current = imgRef.current?.offsetWidth ?? 200;

      const onMove = (ev: MouseEvent) => {
        if (!imgRef.current) return;
        const newW = Math.max(50, startW.current + ev.clientX - startX.current);
        imgRef.current.style.width = newW + "px";
      };

      const onUp = (ev: MouseEvent) => {
        const newW = Math.max(50, startW.current + ev.clientX - startX.current);
        updateAttributes({ width: `${newW}px` });
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [updateAttributes],
  );

  const attrs = node.attrs as { src: string; alt?: string; width?: string; textAlign?: string };
  const textAlign = attrs.textAlign || "left";
  const width = attrs.width || "auto";

  return (
    <NodeViewWrapper style={{ display: "block", textAlign, lineHeight: 0, userSelect: "none" }}>
      <span
        style={{
          display: "inline-block",
          position: "relative",
          width,
          maxWidth: "100%",
          lineHeight: 0,
        }}
      >
        {broken ? (
          <div className="wn-img-broken" style={{ minHeight: 80 }}>
            🖼 이미지를 불러올 수 없습니다
          </div>
        ) : (
          <img
            ref={imgRef}
            src={attrs.src}
            alt={attrs.alt || ""}
            draggable={false}
            style={{ width: "100%", height: "auto", display: "block" }}
            onError={() => setBroken(true)}
          />
        )}
        {selected && (
          <>
            {/* 선택 테두리 */}
            <span
              style={{
                position: "absolute",
                inset: 0,
                border: "2px solid #6366f1",
                pointerEvents: "none",
                boxSizing: "border-box",
              }}
            />
            {/* 리사이즈 핸들 */}
            <span
              title="드래그하여 크기 조절"
              style={{
                position: "absolute",
                bottom: 0,
                right: 0,
                width: 14,
                height: 14,
                background: "#6366f1",
                cursor: "se-resize",
                borderTopLeftRadius: 3,
                lineHeight: 0,
              }}
              onMouseDown={onResizeStart}
            />
          </>
        )}
      </span>
    </NodeViewWrapper>
  );
}

// ===== ResizableImage 확장 =====
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
  addNodeView() {
    return ReactNodeViewRenderer(ImageResizeView);
  },
});
