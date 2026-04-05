"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type Status = "idle" | "loading" | "phone-required" | "success" | "error";

export default function CheckinPage() {
  const params = useSearchParams();
  const token = params.get("token");

  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("");
  const [phone, setPhone] = useState("");

  const doCheckin = async (phoneNumber?: string) => {
    if (!token) { setStatus("error"); setMessage("رمز غير صالح"); return; }

    setStatus("loading");
    try {
      const res = await fetch("/api/attendance/qr-checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, phone: phoneNumber }),
      });
      const data = await res.json();

      if (data.success) {
        setStatus("success");
        setMessage(
          data.isGuest 
            ? `✅ تم تسجيل حضور ${data.studentName} كزائر`
            : `✅ تم تسجيل حضور ${data.studentName} بنجاح`
        );
      } else if (data.code === "PHONE_REQUIRED") {
        setStatus("phone-required");
      } else {
        setStatus("error");
        setMessage(data.error || "حدث خطأ");
      }
    } catch {
      setStatus("error");
      setMessage("حدث خطأ في الاتصال");
    }
  };

  useEffect(() => { doCheckin(); }, [token]);

  if (status === "loading") {
    return <Screen><p className="text-xl animate-pulse">جاري التحقق...</p></Screen>;
  }

  if (status === "phone-required") {
    return (
      <Screen>
        <div className="flex flex-col items-center gap-4 w-full max-w-sm">
          <p className="text-xl font-bold">أدخل رقم موبايلك لتسجيل الحضور</p>
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="01xxxxxxxxx"
            className="w-full border rounded-xl p-3 text-center text-lg"
          />
          <button
            onClick={() => doCheckin(phone)}
            disabled={phone.length < 11}
            className="w-full bg-blue-600 text-white rounded-xl p-3 text-lg font-bold disabled:opacity-50"
          >
            تسجيل الحضور
          </button>
        </div>
      </Screen>
    );
  }

  return <Screen><p className="text-2xl font-bold text-center">{message}</p></Screen>;
}

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      {children}
    </div>
  );
}
