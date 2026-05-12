export type ToastType = "error" | "success" | "info" | "warning";

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
}

type Listener = (msg: ToastMessage) => void;
const listeners = new Set<Listener>();

function emit(type: ToastType, message: string) {
  const msg: ToastMessage = {
    id: typeof crypto !== "undefined" ? crypto.randomUUID() : Math.random().toString(36).slice(2),
    type,
    message,
  };
  listeners.forEach((fn) => fn(msg));
}

export const toast = {
  error:   (message: string) => emit("error",   message),
  success: (message: string) => emit("success", message),
  info:    (message: string) => emit("info",    message),
  warning: (message: string) => emit("warning", message),
};

export function subscribeToast(fn: Listener): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}
