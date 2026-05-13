"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import { Bold, Italic, Underline as UnderlineIcon, Palette } from "lucide-react";
import { useCallback, useEffect } from "react";

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
  /** Si true, affiche la toolbar (gras/italique/souligné/couleur). Default true. */
  withToolbar?: boolean;
}

const COLORS: { label: string; value: string }[] = [
  { label: "Noir", value: "#e5e7eb" }, // adapté au thème dark
  { label: "Rouge", value: "#dc2626" },
  { label: "Bleu", value: "#3b82f6" },
  { label: "Vert", value: "#16a34a" },
  { label: "Orange", value: "#ea580c" },
  { label: "Violet", value: "#9333ea" },
];

function ToolbarButton({
  active,
  onClick,
  title,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded transition-colors ${
        active ? "bg-blue-600 text-white" : "text-gray-300 hover:bg-gray-700"
      }`}
    >
      {children}
    </button>
  );
}

function ColorPicker({ editor }: { editor: Editor }) {
  const currentColor = editor.getAttributes("textStyle").color as string | undefined;
  return (
    <div className="relative group">
      <button
        type="button"
        title="Couleur du texte"
        className="p-1.5 rounded text-gray-300 hover:bg-gray-700 inline-flex items-center gap-1"
      >
        <Palette className="h-3.5 w-3.5" />
        <span
          className="inline-block h-2 w-2 rounded-full border border-gray-500"
          style={{ background: currentColor ?? "#e5e7eb" }}
        />
      </button>
      <div className="absolute left-0 top-full mt-1 hidden group-hover:flex flex-wrap gap-1 p-1.5 bg-gray-800 border border-gray-700 rounded shadow-lg z-10 w-32">
        {COLORS.map((c) => (
          <button
            key={c.value}
            type="button"
            onClick={() => editor.chain().focus().setColor(c.value).run()}
            title={c.label}
            className="h-5 w-5 rounded-full border-2 border-gray-600 hover:border-white"
            style={{ background: c.value }}
          />
        ))}
        <button
          type="button"
          onClick={() => editor.chain().focus().unsetColor().run()}
          title="Réinitialiser"
          className="h-5 w-5 rounded-full border-2 border-gray-600 hover:border-white text-[10px] text-gray-300"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

/**
 * Éditeur rich text léger basé sur TipTap.
 *
 * Format de sortie : HTML simple (b, i, u, span style="color:..."). Sanitization
 * obligatoire côté serveur avant insert BD (isomorphic-dompurify).
 *
 * Réutilisable partout : commentaires de tâche, description longue projet, etc.
 */
export function RichEditor({
  value,
  onChange,
  placeholder,
  minHeight = 100,
  withToolbar = true,
}: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // On retire les extensions qu'on n'expose pas dans la toolbar pour
        // garder le HTML produit léger et prévisible.
        heading: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
      }),
      Underline,
      TextStyle,
      Color,
    ],
    content: value,
    immediatelyRender: false, // SSR-safe
    editorProps: {
      attributes: {
        class:
          "prose prose-invert prose-sm max-w-none focus:outline-none p-2",
      },
    },
    onUpdate: ({ editor: e }) => {
      onChange(e.getHTML());
    },
  });

  // Sync value externe (par exemple après un reset post-submit).
  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() !== value) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [value, editor]);

  const toggleBold = useCallback(() => editor?.chain().focus().toggleBold().run(), [editor]);
  const toggleItalic = useCallback(() => editor?.chain().focus().toggleItalic().run(), [editor]);
  const toggleUnderline = useCallback(() => editor?.chain().focus().toggleUnderline().run(), [editor]);

  if (!editor) {
    return (
      <div
        className="border border-gray-700 bg-gray-800 rounded p-2 text-sm text-gray-500"
        style={{ minHeight }}
      >
        Chargement de l&apos;éditeur…
      </div>
    );
  }

  return (
    <div className="border border-gray-700 bg-gray-800 rounded overflow-hidden">
      {withToolbar && (
        <div className="flex items-center gap-1 p-1 border-b border-gray-700 bg-gray-900">
          <ToolbarButton
            active={editor.isActive("bold")}
            onClick={toggleBold}
            title="Gras (Ctrl+B)"
          >
            <Bold className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive("italic")}
            onClick={toggleItalic}
            title="Italique (Ctrl+I)"
          >
            <Italic className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive("underline")}
            onClick={toggleUnderline}
            title="Souligné (Ctrl+U)"
          >
            <UnderlineIcon className="h-3.5 w-3.5" />
          </ToolbarButton>
          <span className="h-4 w-px bg-gray-700 mx-1" />
          <ColorPicker editor={editor} />
        </div>
      )}
      <div style={{ minHeight }} className="text-sm">
        <EditorContent
          editor={editor}
          placeholder={placeholder}
        />
      </div>
    </div>
  );
}
