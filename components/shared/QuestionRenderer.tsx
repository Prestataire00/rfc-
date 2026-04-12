"use client";

import { Star } from "lucide-react";

export type QuestionItem =
  | {
      id: string;
      type: "note" | "texte" | "oui_non" | "choix" | "echelle";
      label: string;
      required: boolean;
      options?: string[];
      echelleMin?: number;
      echelleMax?: number;
      echelleLabelMin?: string;
      echelleLabelMax?: string;
    }
  | { type: "section"; id: string; label: string };

type Props = {
  question: QuestionItem;
  value?: string | number | boolean | null;
  onChange?: (value: string | number | boolean) => void;
  disabled?: boolean;
  className?: string;
};

export function QuestionRenderer({ question, value, onChange, disabled = false, className = "" }: Props) {
  if (question.type === "section") {
    return (
      <div className={`pt-4 pb-2 ${className}`}>
        <h3 className="text-base font-bold text-gray-900 border-b border-gray-200 pb-2">
          {question.label}
        </h3>
      </div>
    );
  }

  const required = "required" in question && question.required;

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-sm font-medium text-gray-900">
        {question.label}
        {required && <span className="text-red-600 ml-1">*</span>}
      </label>

      {question.type === "note" && (
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4, 5].map((n) => {
            const active = typeof value === "number" && value >= n;
            return (
              <button
                key={n}
                type="button"
                disabled={disabled}
                onClick={() => !disabled && onChange?.(n)}
                className={`transition-transform hover:scale-110 disabled:cursor-default disabled:hover:scale-100`}
              >
                <Star
                  className={`h-8 w-8 ${active ? "text-amber-400 fill-amber-400" : "text-gray-300"}`}
                />
              </button>
            );
          })}
          {typeof value === "number" && value > 0 && (
            <span className="ml-2 text-sm text-gray-600">{value} / 5</span>
          )}
        </div>
      )}

      {question.type === "echelle" && (() => {
        const min = question.echelleMin ?? 0;
        const max = question.echelleMax ?? 10;
        const curr = typeof value === "number" ? value : -1;
        return (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {Array.from({ length: max - min + 1 }, (_, i) => min + i).map((n) => {
                const active = curr === n;
                return (
                  <button
                    key={n}
                    type="button"
                    disabled={disabled}
                    onClick={() => !disabled && onChange?.(n)}
                    className={`h-10 w-10 rounded-md border text-sm font-medium transition-colors ${
                      active
                        ? "bg-red-600 text-white border-red-600"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                    } disabled:cursor-default`}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
            {(question.echelleLabelMin || question.echelleLabelMax) && (
              <div className="flex justify-between text-xs text-gray-500">
                <span>{question.echelleLabelMin}</span>
                <span>{question.echelleLabelMax}</span>
              </div>
            )}
          </div>
        );
      })()}

      {question.type === "texte" && (
        <textarea
          value={(value as string) ?? ""}
          onChange={(e) => onChange?.(e.target.value)}
          disabled={disabled}
          rows={3}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white text-gray-900 focus:outline-none focus:border-red-500 disabled:bg-gray-50"
          placeholder={disabled ? "" : "Votre reponse..."}
        />
      )}

      {question.type === "oui_non" && (
        <div className="flex gap-2">
          {["Oui", "Non"].map((opt) => {
            const active = value === opt;
            return (
              <button
                key={opt}
                type="button"
                disabled={disabled}
                onClick={() => !disabled && onChange?.(opt)}
                className={`px-4 py-2 rounded-md border text-sm font-medium transition-colors ${
                  active
                    ? "bg-red-600 text-white border-red-600"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                } disabled:cursor-default`}
              >
                {opt}
              </button>
            );
          })}
        </div>
      )}

      {question.type === "choix" && question.options && (
        <div className="space-y-1.5">
          {question.options.map((opt, i) => {
            const active = value === opt;
            return (
              <button
                key={i}
                type="button"
                disabled={disabled}
                onClick={() => !disabled && onChange?.(opt)}
                className={`w-full text-left px-4 py-2 rounded-md border text-sm transition-colors ${
                  active
                    ? "bg-red-50 text-red-700 border-red-500"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                } disabled:cursor-default`}
              >
                {opt}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
