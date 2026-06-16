"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ChevronLeft, Send, CheckCircle2, Loader2, Mail } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/hooks/useI18n";

export default function ContactPage() {
  const { t } = useI18n();
  const [formData, setFormData] = useState({ name: "", email: "", message: "" });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) return;

    setStatus("loading");
    try {
      // Strictly inserting ONLY form data
      const { error } = await supabase
        .from("contact_messages")
        .insert([
          {
            name: formData.name,
            email: formData.email,
            message: formData.message
          },
        ]);

      if (error) throw error;

      setStatus("success");
      setShowSuccessPopup(true);
      setFormData({ name: "", email: "", message: "" });
    } catch (error) {
      console.error("Database insert error:", error);
      setStatus("error");
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#F2F2F7] text-[#1C1C1E] font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <header className="pt-safe pb-4 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 sticky top-0 z-50">
        <div className="px-6 flex items-center mt-14 mb-2">
          <Link href="/" className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all text-slate-900 active:scale-95 shadow-sm">
            <ChevronLeft className="h-5 w-5" />
            <span className="text-[11px] font-black uppercase tracking-widest">{t('privacy.back_button')}</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 p-6 flex flex-col max-w-lg mx-auto w-full mt-4">
        <div className="bg-white rounded-[32px] p-6 shadow-xl shadow-slate-200/50 space-y-6">
          <div className="space-y-2">
            <h1 className="text-xl font-black tracking-tight text-slate-900">{t('contact.title')}</h1>
            <p className="text-xs font-medium text-slate-500 leading-relaxed">
              {t('contact.subtitle')}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="name" className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">{t('contact.form_name')}</label>
              <input
                type="text"
                id="name"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                placeholder="John Doe"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">{t('contact.form_email')}</label>
              <input
                type="email"
                id="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="john@example.com"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="message" className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">{t('contact.form_message')}</label>
              <textarea
                id="message"
                name="message"
                required
                rows={5}
                value={formData.message}
                onChange={handleChange}
                placeholder={t('contact.form_message_placeholder')}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
              />
            </div>

            {status === "error" && (
              <p className="text-[10px] font-bold text-red-500 text-center">{t('contact.error_message')}</p>
            )}

            <button
              type="submit"
              disabled={status === "loading"}
              className="w-full bg-slate-900 hover:bg-black text-white rounded-2xl px-4 py-3.5 text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === "loading" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('contact.sending')}
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  {t('contact.send_button')}
                </>
              )}
            </button>
          </form>
        </div>
      </main>

      {/* Success Popup */}
      {showSuccessPopup && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
            onClick={() => setShowSuccessPopup(false)}
          ></div>
          <div className="relative w-full max-w-sm bg-white rounded-[32px] p-8 shadow-2xl animate-in zoom-in duration-300 text-center space-y-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-50 text-emerald-600 mx-auto">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-black tracking-tight text-slate-900">{t('contact.success_title')}</h2>
              <p className="text-xs font-medium text-slate-500 leading-relaxed">
                {t('contact.success_description')}
              </p>
            </div>
            <button 
              onClick={() => setShowSuccessPopup(false)}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-2xl px-4 py-3 text-[11px] font-black uppercase tracking-widest transition-colors"
            >
              {t('preview_modal.close')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
