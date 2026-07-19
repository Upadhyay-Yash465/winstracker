"use client";

import { useEffect, useState } from "react";

export default function Clock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Render nothing until mounted to avoid a server/client time mismatch.
  if (!now) return <div className="clock">&nbsp;</div>;

  const time = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const date = now.toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <>
      <div className="clock">{time.replace(/\s?[AP]M$/i, "")}</div>
      <div className="clock-date">{date}</div>
    </>
  );
}
