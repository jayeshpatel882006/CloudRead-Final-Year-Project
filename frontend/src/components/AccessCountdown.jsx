import { useEffect, useState } from "react";
import API from "../services/api";

const AccessCountdown = ({ bookId }) => {
  const [timeLeft, setTimeLeft] = useState("");
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    let interval;

    const fetchAccess = async () => {
      const res = await API.get(`/access/my`);

      const request = (res.data.requests || res.data).find(
        (r) => r.book?._id === bookId && r.status === "approved"
      );

      if (!request) return;

      const endDate = new Date(request.accessEndDate);

      interval = setInterval(() => {
        const now = new Date();
        const diff = endDate - now;

        if (diff <= 0) {
          setExpired(true);
          clearInterval(interval);
        } else {
          const days = Math.floor(diff / (1000 * 60 * 60 * 24));
          const hours = Math.floor(
            (diff / (1000 * 60 * 60)) % 24
          );
          const minutes = Math.floor(
            (diff / (1000 * 60)) % 60
          );
          const seconds = Math.floor(
            (diff / 1000) % 60
          );

          setTimeLeft(
            `${days}d ${hours}h ${minutes}m ${seconds}s`
          );
        }
      }, 1000);
    };

    fetchAccess();

    return () => clearInterval(interval);
  }, [bookId]);

  if (expired) {
    return <div className="countdown expired">⏳ Access Expired</div>;
  }

  return (
    <div className="countdown">
      ⏳ Expires in: <strong>{timeLeft}</strong>
    </div>
  );
};

export default AccessCountdown;