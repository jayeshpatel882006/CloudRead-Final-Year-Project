import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./Toaster.css";

/**
 * Centralized ToastContainer wrapper. Mounted once in App.
 * The dark theme is wired through react-toastify's theme prop, but we also
 * listen to the document's data-theme attribute so switching themes
 * restyles already-visible toasts on the fly.
 */
export default function Toaster() {
  const theme =
    typeof document !== "undefined" &&
    document.documentElement.getAttribute("data-theme") === "dark"
      ? "dark"
      : "light";

  return (
    <ToastContainer
      position="top-right"
      autoClose={3200}
      hideProgressBar={false}
      newestOnTop
      closeOnClick
      pauseOnHover
      theme={theme}
      toastClassName="cr-toast"
    />
  );
}