'use client';

import { Play } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

interface StartSessionButtonProps {
  sessionId: string;
  status: string;
}

export function StartSessionButton({ sessionId, status }: StartSessionButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  if (status !== "SCHEDULED") return null;

  const handleStart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setLoading(true);
    try {
      const limitInput = window.prompt("أدخل عدد الطلاب المسموح لهم بمسح QR", "1");
      const scanLimit = Number(limitInput);
      if (!Number.isInteger(scanLimit) || scanLimit <= 0) {
        setLoading(false);
        return;
      }
      const res = await fetch(`/api/attendance/sessions/${sessionId}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scanLimit }),
      });
      if (res.ok) {
        router.push(`/attendance/${sessionId}`);
      }
    } catch (error) {
      console.error("Failed to start session:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button 
      onClick={handleStart} 
      disabled={loading}
      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold min-h-10 px-4 py-2"
    >
      <Play className="me-2 h-4 w-4 fill-current" />
      ابدأ الحصة
    </Button>
  );
}
