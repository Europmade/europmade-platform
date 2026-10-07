"use client"

import Image from "@tiptap/extension-image"
import Link from "@tiptap/extension-link"
import Placeholder from "@tiptap/extension-placeholder"
import TextAlign from "@tiptap/extension-text-align"
import Underline from "@tiptap/extension-underline"
import { EditorContent, useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import { forwardRef, useEffect, useImperativeHandle } from "react"
import { sanitizeCmsHtml } from "@europmade/utils"

export type CmsRichTextEditorHandle = {
  insertText: (text: string) => void
}

type CmsRichTextEditorProps = {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  disabled?: boolean
  minHeightClass?: string
  onUploadImage?: (file: File) => Promise<string>
}

const MessageLink = Link.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      "data-em-cta": {
        default: null,
        parseHTML: (element) => element.getAttribute("data-em-cta"),
        renderHTML: (attributes) =>
          attributes["data-em-cta"]
            ? { "data-em-cta": attributes["data-em-cta"] }
            : {},
      },
    }
  },
})

function ToolbarButton({
  label,
  active,
  disabled,
  onClick,
}: {
  label: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={`rounded border px-2 py-1 text-[11px] font-semibold disabled:opacity-40 ${
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
export const CmsRichTextEditor = forwardRef<
  CmsRichTextEditorHandle,
  CmsRichTextEditorProps
>(function CmsRichTextEditor(
  {
    value,
    onChange,
    placeholder = "Typ hier je tekst…",
    disabled = false,
    minHeightClass = "min-h-[160px]",
    onUploadImage,
  },
  ref
) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Underline,
      MessageLink.configure({
        openOnClick: false,
        HTMLAttributes: { rel: "noopener noreferrer" },
      }),
      Image.configure({ allowBase64: false }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
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
        class: `${minHeightClass} max-w-none px-3 py-3 text-sm leading-relaxed text-wf-900 outline-none [&_a]:text-wf-900 [&_a]:underline [&_a[data-em-cta]]:inline-block [&_a[data-em-cta]]:rounded [&_a[data-em-cta]]:bg-wf-900 [&_a[data-em-cta]]:px-3 [&_a[data-em-cta]]:py-1.5 [&_a[data-em-cta]]:text-white [&_a[data-em-cta]]:no-underline [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-bold [&_h3]:mb-1 [&_h3]:text-base [&_h3]:font-bold [&_hr]:my-3 [&_hr]:border-wf-300 [&_img]:my-2 [&_img]:h-auto [&_img]:max-w-full [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5`,
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

  useImperativeHandle(
    ref,
    () => ({
      insertText: (text: string) => {
        editor?.chain().focus().insertContent(text).run()
      },
    }),
    [editor]
  )

  if (!editor) return null

  function setLink() {
    if (disabled) return
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

  function addImage() {
    if (disabled || !onUploadImage || !editor) return
    const input = document.createElement("input")
    input.type = "file"
    input.accept = "image/png,image/jpeg,image/webp"
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) return
      onUploadImage(file)
        .then((url) => {
          editor.chain().focus().setImage({ src: url, alt: "" }).run()
        })
        .catch(() => undefined)
    }
    input.click()
  }

  function addButton() {
    if (disabled || !editor) return
    const label = window.prompt("Tekst op de knop", "Bekijk EuropMade")
    if (!label?.trim()) return
    const url = window.prompt("Link van de knop", "https://")
    if (!url?.trim()) return
    const safeLabel = label.trim().replaceAll("<", "")
    const safeUrl = url.trim().replaceAll('"', "")
    editor
      .chain()
      .focus()
      .insertContent(
        `<a data-em-cta="1" href="${safeUrl}">${safeLabel}</a>`
      )
      .run()
  }

  return (
    <div className="rounded-lg border border-wf-400 bg-white">
      <div className="flex flex-wrap gap-1 border-b border-wf-200 bg-wf-50 px-2 py-1.5">
        <ToolbarButton
          label="Tekst"
          disabled={disabled}
          active={editor.isActive("paragraph")}
          onClick={() => editor.chain().focus().setParagraph().run()}
        />
        <ToolbarButton
          label="Kop"
          disabled={disabled}
          active={editor.isActive("heading", { level: 2 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
        />
        <ToolbarButton
          label="Subkop"
          disabled={disabled}
          active={editor.isActive("heading", { level: 3 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
        />
        <ToolbarButton
          label="Vet"
          disabled={disabled}
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        />
        <ToolbarButton
          label="Cursief"
          disabled={disabled}
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        />
        <ToolbarButton
          label="Onderstrepen"
          disabled={disabled}
          active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        />
        <ToolbarButton
          label="Opsomming"
          disabled={disabled}
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        />
        <ToolbarButton
          label="Genummerd"
          disabled={disabled}
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        />
        <ToolbarButton
          label="Citaat"
          disabled={disabled}
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        />
        <ToolbarButton
          label="Link"
          disabled={disabled}
          active={editor.isActive("link")}
          onClick={setLink}
        />
        <ToolbarButton
          label="Link weg"
          disabled={disabled}
          onClick={() => editor.chain().focus().unsetLink().run()}
        />
        <ToolbarButton
          label="Knop"
          disabled={disabled}
          onClick={addButton}
        />
        <ToolbarButton
          label="Scheiding"
          disabled={disabled}
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        />
        <ToolbarButton
          label="Links"
          disabled={disabled}
          active={editor.isActive({ textAlign: "left" })}
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
        />
        <ToolbarButton
          label="Midden"
          disabled={disabled}
          active={editor.isActive({ textAlign: "center" })}
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
        />
        {onUploadImage ? (
          <ToolbarButton label="Afbeelding" disabled={disabled} onClick={addImage} />
        ) : null}
      </div>
      <EditorContent editor={editor} />
    </div>
  )
})
