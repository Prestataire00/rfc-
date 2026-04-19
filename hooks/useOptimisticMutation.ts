"use client";

import { useState } from "react";
import { notify } from "@/lib/toast";

export function useOptimisticMutation<T>(initialValue: T) {
  const [value, setValue] = useState(initialValue);
  const [pending, setPending] = useState(false);

  async function mutate(
    optimisticValue: T,
    executor: () => Promise<T>,
    messages?: { success?: string; error?: string }
  ) {
    const previous = value;
    setValue(optimisticValue);
    setPending(true);
    try {
      const confirmed = await executor();
      setValue(confirmed);
      if (messages?.success) notify.success(messages.success);
    } catch {
      setValue(previous);
      notify.error(messages?.error ?? "Erreur, modification annulee");
    } finally {
      setPending(false);
    }
  }

  return { value, pending, mutate, setValue };
}
