"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function CheckinPage() {
  const params = useSearchParams();
  const token = params.get("token");
  const [message, setMessage] = useState("جاري التحقق...");

  useEffect(() => {
    if (!token) { setMessage("رمز غير صالح"); return; }
    fetch("/api/attendance/qr-checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(r => r.json())
      .then(data => setMessage(data.success ? "✅ تم تسجيل حضورك بنجاح" : data.error || "حدث خطأ"))
      .catch(() => setMessage("حدث خطأ في الاتصال"));
  }, [token]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-2xl font-bold">{message}</p>
    </div>
  );
}
