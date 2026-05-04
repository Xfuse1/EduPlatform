"use client";

import { Check, Copy, Mail, MessageCircle, Send, Share2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function buildPublicPageUrl(slug: string) {
  if (typeof window === "undefined") {
    return {
      host: `${slug}.eduplatform.com`,
      url: `https://${slug}.eduplatform.com`,
    };
  }

  const { hostname, port, protocol } = window.location;
  const portSuffix = port ? `:${port}` : "";

  if (hostname.endsWith(".vercel.app")) {
    const deploymentHost = `${hostname}${portSuffix}`;
    return {
      host: `${deploymentHost}/${slug}`,
      url: `${protocol}//${deploymentHost}/${slug}`,
    };
  }

  const tenantPrefix = `${slug}.`;
  const normalizedHost = hostname.startsWith(tenantPrefix)
    ? hostname.slice(tenantPrefix.length)
    : hostname;
  const host = `${slug}.${normalizedHost}${portSuffix}`;

  return {
    host,
    url: `${protocol}//${host}`,
  };
}

export function TeacherShareButton({
  tenantName,
  tenantSlug,
  hasSubscription = false,
}: {
  tenantName: string;
  tenantSlug: string;
  hasSubscription?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [publicPage, setPublicPage] = useState({
    host: `${tenantSlug}.eduplatform.com`,
    url: `https://${tenantSlug}.eduplatform.com`,
  });

  useEffect(() => {
    setPublicPage(buildPublicPageUrl(tenantSlug));
  }, [tenantSlug]);

  const shareText = useMemo(
    () => `رابط منصة ${tenantName}: ${publicPage.url}`,
    [publicPage.url, tenantName],
  );

  const whatsappUrl = useMemo(
    () => `https://wa.me/?text=${encodeURIComponent(shareText)}`,
    [shareText],
  );
  const telegramUrl = useMemo(
    () => `https://t.me/share/url?url=${encodeURIComponent(publicPage.url)}&text=${encodeURIComponent(`رابط منصة ${tenantName}`)}`,
    [publicPage.url, tenantName],
  );
  const messengerUrl = useMemo(
    () => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(publicPage.url)}`,
    [publicPage.url],
  );
  const emailUrl = useMemo(
    () => `mailto:?subject=${encodeURIComponent(`رابط منصة ${tenantName}`)}&body=${encodeURIComponent(shareText)}`,
    [shareText, tenantName],
  );
  const smsUrl = useMemo(
    () => `sms:?&body=${encodeURIComponent(shareText)}`,
    [shareText],
  );

  async function copyLink() {
    await navigator.clipboard.writeText(publicPage.url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  async function shareLink() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: tenantName,
          text: `رابط منصة ${tenantName}`,
          url: publicPage.url,
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        setShowShareOptions(true);
      }
      return;
    }

    setShowShareOptions(true);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setShowShareOptions(false);
        }}
        className="touch-target inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-3 text-sm font-bold text-sky-700 transition hover:border-sky-300 hover:bg-sky-100 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-200 dark:hover:bg-sky-950/60 sm:px-4"
      >
        <Share2 className="h-5 w-5" />
        <span className="hidden sm:inline">مشاركة المنصة</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>مشاركة رابط المنصة</DialogTitle>
            <DialogDescription>
              أرسل هذا الرابط للطلاب وأولياء الأمور للدخول على صفحة {tenantName}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 p-5 sm:p-6">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-start text-xs font-bold text-slate-500 dark:text-slate-400">رابط المنصة</p>
              {hasSubscription ? (
                <p className="mt-2 break-all text-start font-mono text-sm text-slate-900 dark:text-slate-100" dir="ltr">
                  {publicPage.host}
                </p>
              ) : (
                <p className="mt-2 text-start text-sm text-slate-400 dark:text-slate-500">
                  اشترك في باقة لعرض رابط منصتك
                </p>
              )}
            </div>

            {hasSubscription ? (
              <div className="grid gap-3 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={copyLink}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-primary px-4 text-sm font-bold text-white transition hover:bg-secondary"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "تم النسخ" : "نسخ"}
                </button>

                <button
                  type="button"
                  onClick={shareLink}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900"
                >
                  <Share2 className="h-4 w-4" />
                  مشاركة
                </button>

                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-bold text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200 dark:hover:bg-emerald-950/60"
                >
                  <MessageCircle className="h-4 w-4" />
                  واتساب
                </a>
              </div>
            ) : (
              <a
                href="/payments"
                className="inline-flex w-full min-h-11 items-center justify-center gap-2 rounded-2xl bg-primary px-4 text-sm font-bold text-white transition hover:bg-secondary"
              >
                اشترك الآن لتفعيل المشاركة
              </a>
            )}

            {showShareOptions ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
                <p className="mb-3 text-start text-xs font-bold text-slate-500 dark:text-slate-400">
                  اختر تطبيق المشاركة
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-emerald-50 px-3 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-200"
                  >
                    <MessageCircle className="h-4 w-4" />
                    واتساب
                  </a>
                  <a
                    href={telegramUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-sky-50 px-3 text-xs font-bold text-sky-700 transition hover:bg-sky-100 dark:bg-sky-950/40 dark:text-sky-200"
                  >
                    <Send className="h-4 w-4" />
                    تليجرام
                  </a>
                  <a
                    href={messengerUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-blue-50 px-3 text-xs font-bold text-blue-700 transition hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-200"
                  >
                    <Share2 className="h-4 w-4" />
                    فيسبوك
                  </a>
                  <a
                    href={emailUrl}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-slate-100 px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <Mail className="h-4 w-4" />
                    إيميل
                  </a>
                  <a
                    href={smsUrl}
                    className="col-span-2 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-slate-100 px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 sm:col-span-4"
                  >
                    <MessageCircle className="h-4 w-4" />
                    رسالة SMS
                  </a>
                </div>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
