import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Info, X, XCircle } from "lucide-react";

const ToastContext = createContext(null);
const TOAST_EVENT = "careertrack:toast";

const icons = {
  success: CheckCircle2,
  error: XCircle,
  info: Info
};

export const toast = {
  show(message, type = "info") {
    window.dispatchEvent(
      new CustomEvent(TOAST_EVENT, {
        detail: { message, type }
      })
    );
  },
  success(message) {
    this.show(message, "success");
  },
  error(message) {
    this.show(message, "error");
  },
  info(message) {
    this.show(message, "info");
  }
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handleToast = (event) => {
      const id = crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;
      const nextToast = {
        id,
        type: event.detail?.type || "info",
        message: event.detail?.message || "Done"
      };

      setToasts((current) => [...current, nextToast]);
      window.setTimeout(() => {
        setToasts((current) => current.filter((item) => item.id !== id));
      }, 3000);
    };

    window.addEventListener(TOAST_EVENT, handleToast);
    return () => window.removeEventListener(TOAST_EVENT, handleToast);
  }, []);

  const value = useMemo(
    () => ({
      removeToast(id) {
        setToasts((current) => current.filter((item) => item.id !== id));
      }
    }),
    []
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map((item) => {
          const Icon = icons[item.type] || Info;

          return (
            <article className={`app-toast app-toast-${item.type}`} key={item.id}>
              <Icon size={18} />
              <p>{item.message}</p>
              <button
                className="icon-button ghost-button"
                type="button"
                onClick={() => value.removeToast(item.id)}
                aria-label="Dismiss notification"
              >
                <X size={16} />
              </button>
            </article>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);
