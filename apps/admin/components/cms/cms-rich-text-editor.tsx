"use client"

import Link from "@tiptap/extension-link"
import Placeholder from "@tiptap/extension-placeholder"
import Underline from "@tiptap/extension-underline"
import { EditorContent, useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import { useEffect } from "react"
import { sanitizeCmsHtml } from "@europmade/utils"

type CmsRichTextEditorProps = {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  disabled?: boolean
}

function ToolbarButton({
  label,
  active,
  onClick,
}: {
  label: string
  active?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className={`rounded border px-2 py-1 text-[11px] font-semibold ${
        active
          ? "border-wf-800 bg-wf-900 text-white"
          : "border-wf-300 bg-white text-wf-800 hover:bg-wf-50"
      }`}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {label}
    </button>
  )
}

/**
 * Visual rich-text editor for CMS page sections.
 * Stores sanitized HTML; no raw HTML editing required by admins.
 */
export function CmsRichTextEditor({
  value,
  onChange,
  placeholder = "Typ hier je tekst…",
  disabled = false,
}: CmsRichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { rel: "noopener noreferrer" },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: value || "",
    editable: !disabled,
    onUpdate: ({ editor: ed }) => {
      const html = sanitizeCmsHtml(ed.getHTML())
      onChange(html === "<p></p>" ? "" : html)
    },
    editorProps: {
      attributes: {
        class:
          "min-h-[160px] max-w-none px-3 py-2 text-sm leading-relaxed text-wf-900 outline-none prose-em [&_a]:underline [&_h2]:text-base [&_h2]:font-bold [&_h3]:text-sm [&_h3]:font-bold [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5",
      },
    },
  })

  useEffect(() => {
    if (!editor) return
    const current = editor.getHTML()
    const next = value || ""
    if (sanitizeCmsHtml(current) !== sanitizeCmsHtml(next)) {
      editor.commands.setContent(next || "", false)
    }
  }, [value, editor])

  useEffect(() => {
    if (!editor) return
    editor.setEditable(!disabled)
  }, [disabled, editor])

  if (!editor) return null

  function setLink() {
    const prev = editor?.getAttributes("link").href as string | undefined
    const url = window.prompt("Link-URL (https://… of /pad)", prev || "https://")
    if (url === null) return
    const trimmed = url.trim()
    if (!trimmed) {
      editor?.chain().focus().extendMarkRange("link").unsetLink().run()
      return
    }
    editor?.chain().focus().extendMarkRange("link").setLink({ href: trimmed }).run()
  }

  return (
    <div className="rounded-lg border border-wf-400 bg-white">
      <div className="flex flex-wrap gap-1 border-b border-wf-200 bg-wf-50 px-2 py-1.5">
        <ToolbarButton
          label="H2"
          active={editor.isActive("heading", { level: 2 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
        />
        <ToolbarButton
          label="H3"
          active={editor.isActive("heading", { level: 3 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
        />
        <ToolbarButton
          label="Vet"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        />
        <ToolbarButton
          label="Cursief"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        />
        <ToolbarButton
          label="Onderstrepen"
          active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        />
        <ToolbarButton
          label="• Lijst"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        />
        <ToolbarButton
          label="1. Lijst"
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        />
        <ToolbarButton
          label="Quote"
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        />
        <ToolbarButton
          label="Link"
          active={editor.isActive("link")}
          onClick={setLink}
        />
        <ToolbarButton
          label="Link weg"
          onClick={() => editor.chain().focus().unsetLink().run()}
        />
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}
