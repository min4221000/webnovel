"use client";

import { useCallback, useRef, useState } from "react";
import { useEditor, EditorContent, type Editor as TiptapEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextStyle from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import FontFamily from "@tiptap/extension-font-family";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";
import Youtube from "@tiptap/extension-youtube";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";

import { FontSize, ResizableImage } from "./extensions";
import { WnEffect } from "./effectExtension";
import { compressAndUpload } from "@/lib/uploadImage";
import {
  FONT_FAMILIES,
  FONT_SIZES,
  IMAGE_SIZE_PRESETS,
  MAX_CHARS,
  MAX_IMAGES_PER_CHAPTER,
} from "@/lib/constants";

type Props = {
  content?: string;
  onChange?: (html: string) => void;
};

// 2.5초 hover 후 툴팁 표시
function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  const [show, setShow] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  return (
    <span
      className="relative"
      onMouseEnter={() => { timer.current = setTimeout(() => setShow(true), 2500); }}
      onMouseLeave={() => { if (timer.current) clearTimeout(timer.current); setShow(false); }}
    >
      {children}
      {show && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 rounded bg-gray-900 text-white text-xs p-2 shadow-lg z-50 pointer-events-none whitespace-pre-wrap leading-relaxed">
          {text}
        </span>
      )}
    </span>
  );
}

const SPECIAL_CHARS: { open: string; close?: string; title: string }[] = [
  { open: "…", title: "말줄임표" },
  { open: "—", title: "긴줄표" },
  { open: "–", title: "짧은줄표" },
  { open: "·", title: "가운뎃점" },
  { open: "「", close: "」", title: "홑낫표" },
  { open: "『", close: "』", title: "겹낫표" },
  { open: "《", close: "》", title: "이중꺾쇠" },
  { open: "〈", close: "〉", title: "꺾쇠" },
  { open: "※", title: "참고표" },
  { open: "♥", title: "하트" },
  { open: "★", title: "별" },
];

function Btn({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`px-2 py-1 text-sm rounded hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-40 ${
        active ? "bg-black/15 dark:bg-white/20 font-semibold" : ""
      }`}
    >
      {children}
    </button>
  );
}

const Divider = () => (
  <span className="mx-1 w-px self-stretch bg-black/10 dark:bg-white/15" />
);

export default function Editor({ content = "", onChange }: Props) {
  const [textLen, setTextLen] = useState(0);
  const [imgCount, setImgCount] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [hlColor, setHlColor] = useState("#ffe58a");
  const fileRef = useRef<HTMLInputElement>(null);

  const sync = useCallback(
    (editor: TiptapEditor) => {
      setTextLen(editor.getText().replace(/\s+/g, " ").trim().length);
      const html = editor.getHTML();
      setImgCount((html.match(/<img\b/gi) || []).length);
      onChange?.(html);
    },
    [onChange],
  );

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      TextStyle,
      Color,
      FontFamily,
      FontSize,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph", "image"] }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { rel: "noopener noreferrer nofollow", target: "_blank" },
      }),
      ResizableImage.configure({ allowBase64: false }),
      Youtube.configure({ nocookie: true, controls: true, width: 640, height: 360 }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      WnEffect,
    ],
    content,
    editorProps: {
      attributes: { class: "wn-content min-h-[420px] focus:outline-none" },
    },
    onUpdate: ({ editor }) => sync(editor),
    onCreate: ({ editor }) => sync(editor),
  });

  const insertSpecialChar = (open: string, close?: string) => {
    if (!editor) return;
    if (!close) {
      editor.chain().focus().insertContent(open).run();
      return;
    }
    const { from, to, empty } = editor.state.selection;
    if (!empty) {
      const selected = editor.state.doc.textBetween(from, to, "\n");
      editor.chain().focus().deleteSelection().insertContent(open + selected + close).run();
    } else {
      editor.chain().focus().insertContent(open + close).run();
      editor.commands.setTextSelection(editor.state.selection.from - close.length);
    }
  };

  const onPickImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !editor) return;
    if (imgCount >= MAX_IMAGES_PER_CHAPTER) {
      alert(`이미지는 회차당 최대 ${MAX_IMAGES_PER_CHAPTER}장까지 가능합니다.`);
      return;
    }
    try {
      setUploading(true);
      const url = await compressAndUpload(file);
      editor.chain().focus().setImage({ src: url }).run();
    } catch (err) {
      alert(err instanceof Error ? err.message : "업로드 실패");
    } finally {
      setUploading(false);
    }
  };

  if (!editor) {
    return (
      <div className="border rounded-lg p-4 text-sm text-gray-400">
        에디터 로딩 중…
      </div>
    );
  }

  const imageActive = editor.isActive("image");
  const over = textLen > MAX_CHARS;

  return (
    <div className="border border-black/15 dark:border-white/20 rounded-lg overflow-hidden">
      {/* 툴바 */}
      <div className="flex flex-wrap items-stretch gap-0.5 p-1.5 border-b border-black/10 dark:border-white/15 bg-black/[0.03] dark:bg-white/[0.04]">
        {/* 폰트 */}
        <select
          title="글꼴"
          className="text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded px-1"
          onChange={(e) =>
            e.target.value
              ? editor.chain().focus().setFontFamily(e.target.value).run()
              : editor.chain().focus().unsetFontFamily().run()
          }
          defaultValue=""
        >
          {FONT_FAMILIES.map((f) => (
            <option key={f.label} value={f.value} className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
              {f.label}
            </option>
          ))}
        </select>
        {/* 크기 */}
        <select
          title="글자 크기"
          className="text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded px-1"
          onChange={(e) =>
            e.target.value
              ? editor.chain().focus().setFontSize(`${e.target.value}px`).run()
              : editor.chain().focus().unsetFontSize().run()
          }
          defaultValue=""
        >
          <option value="" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">크기</option>
          {FONT_SIZES.map((s) => (
            <option key={s} value={s} className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
              {s}
            </option>
          ))}
        </select>

        <Divider />
        <Btn title="굵게" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
          <b>가</b>
        </Btn>
        <Btn title="기울임" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <i>가</i>
        </Btn>
        <Btn title="밑줄" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <u>가</u>
        </Btn>
        <Btn title="취소선" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}>
          <s>가</s>
        </Btn>

        {/* 글자색 */}
        <label title="글자색" className="px-1 flex items-center cursor-pointer text-sm">
          <span style={{ color: editor.getAttributes("textStyle").color || undefined }}>색</span>
          <input
            type="color"
            className="w-0 h-0 opacity-0"
            onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
          />
        </label>
        {/* 배경색(형광) */}
        <label title="형광펜" className="px-1 flex items-center cursor-pointer text-sm">
          <span className="px-0.5 rounded" style={{ background: hlColor }}>밑</span>
          <input
            type="color"
            value={hlColor}
            className="w-0 h-0 opacity-0"
            onChange={(e) => {
              setHlColor(e.target.value);
              editor.chain().focus().setHighlight({ color: e.target.value }).run();
            }}
          />
        </label>

        <Divider />
        <Btn title="왼쪽" active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()}>좌</Btn>
        <Btn title="가운데" active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()}>중</Btn>
        <Btn title="오른쪽" active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()}>우</Btn>
        <Btn title="양쪽" active={editor.isActive({ textAlign: "justify" })} onClick={() => editor.chain().focus().setTextAlign("justify").run()}>양</Btn>

        <Divider />
        <Btn title="글머리 목록" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>•</Btn>
        <Btn title="번호 목록" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>1.</Btn>
        <Btn title="인용구" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>❝</Btn>
        <Btn title="구분선" onClick={() => editor.chain().focus().setHorizontalRule().run()}>―</Btn>

        <Divider />
        <Btn
          title="링크"
          active={editor.isActive("link")}
          onClick={() => {
            const prev = editor.getAttributes("link").href as string | undefined;
            const url = window.prompt("링크 URL", prev || "https://");
            if (url === null) return;
            if (url === "") editor.chain().focus().unsetLink().run();
            else editor.chain().focus().setLink({ href: url }).run();
          }}
        >
          🔗
        </Btn>
        <Divider />
        <Tooltip text={"어두운 배경 구간 삽입\n안에서 직접 글 작성, 배경/글자색 블록에서 변경"}>
          <Btn title="어두운 구간" onClick={() =>
            editor.chain().focus().insertContent({
              type: "wnEffect",
              content: [{ type: "paragraph" }],
            }).run()
          }>🌑</Btn>
        </Tooltip>
        <Divider />
        <Btn
          title="유튜브"
          onClick={() => {
            const url = window.prompt("유튜브 URL");
            if (url) editor.commands.setYoutubeVideo({ src: url });
          }}
        >
          ▶
        </Btn>
        <Btn
          title={`이미지 (회차당 ${MAX_IMAGES_PER_CHAPTER}장)`}
          disabled={uploading || imgCount >= MAX_IMAGES_PER_CHAPTER}
          onClick={() => fileRef.current?.click()}
        >
          {uploading ? "⏳" : "🖼"}
        </Btn>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPickImage} />

        <Divider />
        <Btn title="실행취소" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}>↶</Btn>
        <Btn title="다시실행" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}>↷</Btn>
      </div>

      {/* 문학 특수문자 */}
      <div className="flex flex-wrap items-center gap-0.5 px-1.5 py-1 border-b border-black/10 dark:border-white/15 bg-black/[0.02] dark:bg-white/[0.02]">
        <span className="text-xs text-gray-400 mr-1 shrink-0">부호</span>
        {SPECIAL_CHARS.map(({ open, close, title }) => (
          <button
            key={open}
            type="button"
            title={title}
            onClick={() => insertSpecialChar(open, close)}
            className="px-1.5 py-0.5 text-sm rounded hover:bg-black/10 dark:hover:bg-white/10 font-mono leading-none"
          >
            {open}{close ?? ""}
          </button>
        ))}
      </div>

      {/* 이미지 선택 시 정렬/크기 컨트롤 */}
      {imageActive && (
        <div className="flex flex-wrap items-center gap-1 px-2 py-1 border-b border-black/10 dark:border-white/15 bg-indigo-50 dark:bg-indigo-950/30 text-xs">
          <span className="text-gray-500">이미지:</span>
          <Btn title="왼쪽" onClick={() => editor.chain().focus().setTextAlign("left").run()}>좌</Btn>
          <Btn title="가운데" onClick={() => editor.chain().focus().setTextAlign("center").run()}>중</Btn>
          <Btn title="오른쪽" onClick={() => editor.chain().focus().setTextAlign("right").run()}>우</Btn>
          <Divider />
          {IMAGE_SIZE_PRESETS.map((p) => (
            <Btn
              key={p.label}
              title={`크기 ${p.label}`}
              onClick={() => editor.chain().focus().updateAttributes("image", { width: p.value }).run()}
            >
              {p.label}
            </Btn>
          ))}
        </div>
      )}

      {/* 본문 (좌우 패딩은 .wn-content 가 담당 → 읽기 화면과 줄바꿈 일치) */}
      <div className="py-2">
        <EditorContent editor={editor} />
      </div>

      {/* 글자수 카운터 */}
      <div className="flex justify-between items-center px-3 py-1.5 border-t border-black/10 dark:border-white/15 text-xs text-gray-500">
        <span>이미지 {imgCount}/{MAX_IMAGES_PER_CHAPTER}</span>
        <span className={over ? "text-red-500 font-semibold" : ""}>
          {textLen.toLocaleString()} / {MAX_CHARS.toLocaleString()}자
          {over && " — 초과! 저장 불가"}
        </span>
      </div>
    </div>
  );
}
