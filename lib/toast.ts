import { toast } from "sonner";

export const notify = {
  success(message: string, description?: string) {
    toast.success(message, { description });
  },
  error(message: string, description?: string) {
    toast.error(message, { description });
  },
  info(message: string, description?: string) {
    toast.info(message, { description });
  },
  loading(message: string) {
    return toast.loading(message);
  },
  promise<T>(
    promise: Promise<T>,
    messages: { loading: string; success: string; error: string }
  ) {
    return toast.promise(promise, messages);
  },
  dismiss(id?: string | number) {
    toast.dismiss(id);
  },
};
