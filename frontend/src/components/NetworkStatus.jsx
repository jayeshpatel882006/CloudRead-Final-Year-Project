import { useEffect, useState } from "react";
import { WifiOff, Wifi } from "lucide-react";
import "./NetworkStatus.css";

/**
 * NetworkStatus — listens for the browser's online/offline events and shows
 * a small toast at the bottom of the screen when connectivity changes.
 */
export default function NetworkStatus() {
  const [online, setOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      setShow(true);
      const id = setTimeout(() => setShow(false), 3500);
      return () => clearTimeout(id);
    };
    const handleOffline = () => {
      setOnline(false);
      setShow(true);
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <div
      className={`cr-net ${online ? "cr-net--online" : "cr-net--offline"} ${
        show ? "cr-net--visible" : ""
      }`}
      role="status"
      aria-live="polite"
    >
      {online ? <Wifi size={14} /> : <WifiOff size={14} />}
      <span>{online ? "Back online" : "You're offline"}</span>
    </div>
  );
}