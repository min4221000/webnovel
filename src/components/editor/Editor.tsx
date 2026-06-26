"use client";

import { useCallback, useRef, useState } from "react";
import { useEditor, EditorContent, type Editor as TiptapEditor } from "@tiptap/react";
import { Fragment, Slice, type Node as PMNode } from "@tiptap/pm/model";
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

import { FontSize, LineHeight, ResizableImage, ShiftEnterSplit } from "./extensions";
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

const PALETTE = [
  "#000000", "#434343", "#666666", "#999999", "#cccccc", "#ffffff",
  "#ff0000", "#ff4444", "#ff8800", "#ffbb00", "#ffff00", "#88ff00",
  "#00ff00", "#00ff88", "#00ffff", "#0088ff", "#0000ff", "#8800ff",
  "#ff00ff", "#ff0088", "#880000", "#884400", "#888800", "#008800",
  "#004488", "#000088", "#440088", "#880044",
];

// 한 칼럼(배경색 또는 글자색): 초기화 링크 + 팔레트 그리드 + 커스텀 색상 입력
function ColorColumn({
  title,
  resetLabel,
  onSelect,
  onReset,
}: {
  title: string;
  resetLabel: string;
  onSelect: (color: string) => void;
  onReset: () => void;
}) {
  return (
    <div className="w-44">
      <p className="text-xs font-semibold text-center mb-1">{title}</p>
      <button
        type="button"
        onClick={onReset}
        className="text-xs text-gray-500 hover:underline block w-full text-center mb-1.5"
      >
        {resetLabel}
      </button>
      <div className="grid grid-cols-7 gap-1">
        {PALETTE.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onSelect(c)}
            className="w-5 h-5 rounded border border-black/20 dark:border-white/20 hover:scale-125 transition-transform"
            style={{ background: c }}
          />
        ))}
      </div>
      <label className="text-xs text-gray-500 hover:underline mt-1.5 block text-center cursor-pointer">
        다른 색상 선택
        <input
          type="color"
          className="sr-only"
          onChange={(e) => onSelect(e.target.value)}
        />
      </label>
    </div>
  );
}

// 통합 색상 패널 (디시 스타일: 배경색 | 글자색 두 칼럼)
function ColorPanel({
  onSelectBg,
  onResetBg,
  onSelectText,
  onResetText,
}: {
  onSelectBg: (c: string) => void;
  onResetBg: () => void;
  onSelectText: (c: string) => void;
  onResetText: () => void;
}) {
  return (
    <div className="absolute top-full left-0 mt-1 p-3 bg-white dark:bg-gray-800 border rounded-lg shadow-xl z-50 flex gap-4">
      <ColorColumn title="배경색" resetLabel="투명으로 설정" onSelect={onSelectBg} onReset={onResetBg} />
      <ColorColumn title="글자색" resetLabel="검은색으로 설정" onSelect={onSelectText} onReset={onResetText} />
    </div>
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
  const [showColor, setShowColor] = useState(false);
  const [bodyHeight, setBodyHeight] = useState(440); // 본문 영역 높이(px) — 하단 그립으로 조절
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
      // Enter = 새 문단(splitBlock), Shift+Enter = 문단 내 줄바꿈(<br>) — StarterKit 기본값
      // 정렬/행간은 paragraph(블록) 속성이라, 문단을 나눠야 선택 영역에만 적용됨.
      // 빈 줄 렌더링은 globals.css의 .wn-content p { min-height } 로 보장.
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      ShiftEnterSplit,
      Underline,
      TextStyle,
      Color,
      FontFamily,
      FontSize,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph", "image"] }),
      LineHeight,
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
      // handlePaste: text/plain이 text/html보다 줄 구조 풍부하면 text 우선
      // (Discord 등 일부 앱은 html에서 줄바꿈을 공백으로 평탄화해서 클립보드에 담음)
      handlePaste: (view, event) => {
        const cb = event.clipboardData;
        if (!cb) return false;
        const text = cb.getData("text/plain");
        if (!text || !text.includes("\n")) return false;

        // 에디터 내부 복붙은 ProseMirror 포맷으로 서식 보존 (기본 경로)
        const types = Array.from(cb.types || []);
        if (types.some((t) => t.startsWith("application/x-prosemirror"))) return false;

        // 외부 출처(Discord/Google Docs/메모장/워드 등) → 줄 구조는 text/plain 기준으로 통일
        // html 경로는 빈 단락 표현이 source마다 달라(<p><br></p> / <p>&nbsp;</p> 등) 간격 어긋남.
        event.preventDefault();
        const schema = view.state.schema;
        // 가짜 줄바꿈 표시: U+2028(LS), U+2029(PS) → \n. 앞뒤 빈 줄 제거(Google Docs trailing \n 흔함)
        const normalized = text
          .replace(/\r\n|\r|\u2028|\u2029/g, "\n")
          .replace(/^\n+|\n+$/g, "");
        // NBSP(\u00a0)·공백만 있는 줄은 "빈 줄"로 간주
        const isBlank = (s: string) => s.replace(/[\u00a0\s]/g, "") === "";
        // 각 줄 = 한 단락 (빈 줄/공백·NBSP만 있는 줄 = 빈 단락)
        const lines = normalized.split("\n");
        const nodes: PMNode[] = lines.map((line) =>
          isBlank(line)
            ? schema.nodes.paragraph.create()
            : schema.nodes.paragraph.create({}, [schema.text(line)])
        );
        const slice = Slice.maxOpen(Fragment.from(nodes));
        view.dispatch(view.state.tr.replaceSelection(slice).scrollIntoView());
        return true;
      },
      // 외부 붙여넣기 정리 (위 handlePaste 미적용 시): MS Word/Google Docs/HWP/임의 사이트 서식 제거
      transformPastedHTML(html) {
        // 에디터 내부 복붙(data-pm-slice 마커)은 ProseMirror가 직렬화한 원본 → 서식 그대로 보존
        if (html.includes("data-pm-slice")) return html;
        let out = html
          .replace(/<!--[\s\S]*?-->/g, "")
          .replace(/<\?xml[\s\S]*?\?>/g, "")
          .replace(/<o:p>[\s\S]*?<\/o:p>/gi, "")
          .replace(/<style[\s\S]*?<\/style>/gi, "")
          .replace(/<script[\s\S]*?<\/script>/gi, "")
          .replace(/<meta[^>]*>/gi, "")
          .replace(/<link[^>]*>/gi, "")
          .replace(/\s+class="[^"]*"/g, "")
          .replace(/\s+style="[^"]*"/g, "")
          .replace(/\s+dir="[^"]*"/g, "")
          .replace(/\s+lang="[^"]*"/g, "")
          .replace(/\s+id="[^"]*"/g, "")
          .replace(/\s+data-[\w-]+="[^"]*"/g, "")
          .replace(/<(div|section|article)[^>]*>/gi, "<p>")
          .replace(/<\/(div|section|article)>/gi, "</p>")
          .replace(/<font[^>]*>/gi, "")
          .replace(/<\/font>/gi, "")
          .replace(/<span>([^<]*)<\/span>/g, "$1");

        const hasBlocks = /<(p|h[1-6]|li|blockquote|hr|table|br)\b/i.test(out);
        if (!hasBlocks) {
          const esc = (s: string) =>
            s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
          const text = out.replace(/<[^>]+>/g, "");
          // 각 줄 = 한 단락
          out = text.split(/\r?\n/)
            .map((l) => l === "" ? "<p></p>" : `<p>${esc(l)}</p>`)
            .join("");
        }
        return out;
      },
      // 순수 텍스트 붙여넣기 (text/plain 만): 각 줄 = 한 단락. 빈 줄 = 빈 단락.
      clipboardTextParser(text, $context) {
        const schema = $context.doc.type.schema;
        const lines = text.split(/\r?\n/);
        const nodes: PMNode[] = lines.map((line) =>
          line === ""
            ? schema.nodes.paragraph.create()
            : schema.nodes.paragraph.create({}, [schema.text(line)])
        );
        return Slice.maxOpen(Fragment.from(nodes));
      },
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

  const uploadFile = useCallback(async (file: File) => {
    if (!editor) return;
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
  }, [editor, imgCount]);

  const onDropImage = useCallback((e: React.DragEvent) => {
    const file = e.dataTransfer.files[0];
    if (!file?.type.startsWith("image/")) return;
    e.preventDefault();
    e.stopPropagation();
    uploadFile(file);
  }, [uploadFile]);

  const onPickImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    uploadFile(file);
  };

  // 하단 그립 드래그 → 본문 영역 높이 조절 (마우스·터치 모두 pointer 이벤트)
  const onResizeStart = (e: React.PointerEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startH = bodyHeight;
    const onMove = (ev: PointerEvent) => {
      setBodyHeight(Math.min(2000, Math.max(200, startH + ev.clientY - startY)));
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
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
        {/* 크기 (기본 17px — wn-content CSS) */}
        <select
          title="글자 크기"
          className="text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded px-1"
          value={(editor.getAttributes("textStyle").fontSize as string | undefined)?.replace(/px$/, "") ?? ""}
          onChange={(e) =>
            e.target.value
              ? editor.chain().focus().setFontSize(`${e.target.value}px`).run()
              : editor.chain().focus().unsetFontSize().run()
          }
        >
          <option value="" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">(14px)</option>
          {FONT_SIZES.map((s) => (
            <option key={s} value={s} className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
              {s}px
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

        {/* 색상 (글자색 + 배경색 통합) */}
        <span className="relative">
          <Btn
            title="글자색 · 배경색"
            active={showColor}
            onClick={() => setShowColor((v) => !v)}
          >
            <span
              className="px-0.5 rounded"
              style={{ color: editor.getAttributes("textStyle").color || undefined, background: hlColor }}
            >
              색
            </span>
          </Btn>
          {showColor && (
            <>
              {/* 외부 클릭 시 닫기 */}
              <span className="fixed inset-0 z-40" onClick={() => setShowColor(false)} />
              <ColorPanel
                onSelectText={(c) => { editor.chain().focus().setColor(c).run(); }}
                onResetText={() => { editor.chain().focus().unsetColor().run(); }}
                onSelectBg={(c) => { setHlColor(c); editor.chain().focus().setHighlight({ color: c }).run(); }}
                onResetBg={() => { editor.chain().focus().unsetHighlight().run(); }}
              />
            </>
          )}
        </span>
        {/* 서식 제거 — 선택 영역의 글꼴/색/크기/굵게 등 모두 초기화 */}
        <Btn
          title="서식 제거 (선택 영역의 모든 서식 초기화)"
          onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
        >
          <span className="line-through opacity-70">서</span>
        </Btn>

        <Divider />
        <Btn title="왼쪽" active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()}>좌</Btn>
        <Btn title="가운데" active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()}>중</Btn>
        <Btn title="오른쪽" active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()}>우</Btn>
        <Btn title="양쪽" active={editor.isActive({ textAlign: "justify" })} onClick={() => editor.chain().focus().setTextAlign("justify").run()}>양</Btn>

        {/* 줄간격 (기본 1.9 — wn-content CSS) */}
        <select
          title="줄 간격"
          className="text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded px-1"
          value={editor.getAttributes("paragraph").lineHeight ?? ""}
          onChange={(e) =>
            e.target.value
              ? editor.chain().focus().setLineHeight(e.target.value).run()
              : editor.chain().focus().unsetLineHeight().run()
          }
        >
          <option value="" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">(1.5)</option>
          {[1.0, 1.3, 1.5, 1.7, 1.9, 2.2, 2.5, 3.0].map((v) => (
            <option key={v} value={String(v)} className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
              {v.toFixed(1)}
            </option>
          ))}
        </select>

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
        <Tooltip text={"화면 전체가 어두워지는 구간 시작\n블록 안에서 배경색·글자색 설정"}>
          <Btn title="어두워짐 시작" onClick={() =>
            editor.chain().focus().insertContent({
              type: "wnEffect",
              attrs: { effectType: "darken-start" },
            }).run()
          }>🌑</Btn>
        </Tooltip>
        <Tooltip text={"어두워짐 구간 종료\n이 위치에서 화면이 원래대로 복구됩니다"}>
          <Btn title="어두워짐 끝" onClick={() =>
            editor.chain().focus().insertContent({
              type: "wnEffect",
              attrs: { effectType: "darken-end" },
            }).run()
          }>🌅</Btn>
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
          title={`이미지 (회차당 ${MAX_IMAGES_PER_CHAPTER}장, 최대 15MB — JPG/PNG/WebP, 자동 압축)`}
          disabled={uploading || imgCount >= MAX_IMAGES_PER_CHAPTER}
          onClick={() => fileRef.current?.click()}
        >
          {uploading ? "⏳" : "🖼"}
        </Btn>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={onPickImage} />

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

      {/* 본문 — 조절 가능한 높이 + 내부 스크롤 + 드래그드롭 */}
      <div
        className="py-2 overflow-y-auto"
        style={{ height: bodyHeight }}
        onDrop={onDropImage}
        onDragOver={(e) => { if (e.dataTransfer.types.includes("Files")) e.preventDefault(); }}
      >
        <EditorContent editor={editor} />
      </div>

      {/* 높이 조절 그립 (디시 스타일) — 드래그하여 본문 영역 크기 조절 */}
      <div
        onPointerDown={onResizeStart}
        title="드래그하여 글쓰기 영역 높이 조절"
        className="flex items-center justify-center h-3.5 cursor-ns-resize select-none touch-none border-t border-black/10 dark:border-white/15 bg-black/[0.03] dark:bg-white/[0.05] hover:bg-black/[0.08] dark:hover:bg-white/[0.1] transition-colors"
      >
        <span className="w-8 h-1 rounded-full bg-black/25 dark:bg-white/30" />
      </div>

      {/* 글자수 카운터 */}
      <div className="flex justify-between items-center px-3 py-1.5 border-t border-black/10 dark:border-white/15 text-xs text-gray-500">
        <span>이미지 {imgCount}/{MAX_IMAGES_PER_CHAPTER} (JPG/PNG/WebP, 최대 15MB, 자동 압축)</span>
        <span className={over ? "text-red-500 font-semibold" : ""}>
          {textLen.toLocaleString()} / {MAX_CHARS.toLocaleString()}자
          {over && " — 초과! 저장 불가"}
        </span>
      </div>
    </div>
  );
}
