"use client"

import React, { useState, useEffect, useRef } from "react"
import { useSession } from "@/modules/auth/hooks/useSession"
import { createBrowserClient } from "@supabase/ssr"


import { Search, Send, Plus, User, MoreVertical, X, MessageSquare, ArrowRight } from "lucide-react"
import { cn, getInitials } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { showToast } from "@/components/ui/Toast"

// --- Types ---

interface Message {
  id: string
  text: string
  senderId: string
  createdAt: Date
}

interface Conversation {
  id: string
  participant: {
    id: string
    name: string
    role: "المدرس" | "ولي أمر" | "طالب"
    avatar?: string
  }
  lastMessage: string
  lastMessageTime: Date
  unreadCount: number
  messages: Message[]
}

interface Contact {
  id: string
  name: string
  role: "المدرس" | "ولي أمر" | "طالب"
}

// --- Real API Data Instead of Mocks ---

export default function MessagesPage() {
  const { data: session } = useSession()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [isMobileView, setIsMobileView] = useState(false)
  const [isNewModalOpen, setIsNewModalOpen] = useState(false)
  const [searchContact, setSearchContact] = useState("")
  const [newMessageText, setNewMessageText] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    if (!activeId) return
    const channel = supabase
      .channel(`messages-${activeId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "Message",
      }, (payload) => {
        const newMsg = payload.new as any
        
        // تجاهل الرسائل اللي أنا بعتها (عشان مش تتضاف مرتين)
        if (newMsg.senderId === (session?.user as any)?.id) return

        setConversations(prev => prev.map(c =>
          c.id === activeId ? {
            ...c,
            messages: [...c.messages, {
              id: newMsg.id,
              text: newMsg.text,
              senderId: newMsg.senderId,
              createdAt: new Date(newMsg.createdAt),
            }],
            lastMessage: newMsg.text,
            lastMessageTime: new Date(newMsg.createdAt),
          } : c
        ))
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [activeId])


  const activeConversation = conversations.find(c => c.id === activeId)
  
  useEffect(() => {
    Promise.all([
      fetch('/api/conversations').then(r => r.json()),
      fetch('/api/contacts').then(r => r.json())
    ]).then(([convosData, contactsData]) => {
      // API returns createdAt as string, convert to Date
      const parsedConvos = Array.isArray(convosData) ? convosData.map((c: any) => ({
        ...c,
        lastMessageTime: new Date(c.lastMessageTime),
        messages: c.messages.map((m: any) => ({...m, createdAt: new Date(m.createdAt)}))
      })) : [];
      setConversations(parsedConvos);
      setContacts(Array.isArray(contactsData) ? contactsData : []);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      showToast.error("فشل في تحميل الرسائل");
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    const handleResize = () => setIsMobileView(window.innerWidth < 768)
    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [activeId, activeConversation?.messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const handleSendMessage = async () => {
    if (!newMessageText.trim() || !activeId || !activeConversation) return

    const newMsg: Message = {
      id: Math.random().toString(36).substr(2, 9),
      text: newMessageText,
      senderId: "me",
      createdAt: new Date(),
    }

    // Optimistic UI update
    setConversations(prev => prev.map(c => {
      if (c.id === activeId) {
        return {
          ...c,
          messages: [...c.messages, newMsg],
          lastMessage: newMessageText,
          lastMessageTime: new Date(),
        }
      }
      return c
    }))

    const textToSend = newMessageText;
    setNewMessageText("");

    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiverId: activeConversation.participant.id, text: textToSend })
      });
    } catch (err) {
      console.error(err);
      showToast.error("فشل في إرسال الرسالة");
    }
  }

  const handleSelectConversation = (contactId: string | null) => {
    setActiveId(contactId);
    if (!contactId) return;
    fetch('/api/conversations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contactId })
    }).then(() => {
      setConversations(prev => prev.map(c =>
        c.id === contactId ? { ...c, unreadCount: 0 } : c
      ));
    });
  };

  const handleCreateConversation = (contact: Contact) => {
    const existing = conversations.find(c => c.participant.id === contact.id)
    if (existing) {
      handleSelectConversation(existing.id)
    } else {
      const newConv: Conversation = {
        id: Math.random().toString(36).substr(2, 9),
        participant: contact,
        lastMessage: "",
        lastMessageTime: new Date(),
        unreadCount: 0,
        messages: [],
      }
      setConversations([newConv, ...conversations])
      handleSelectConversation(newConv.id)
    }
    setIsNewModalOpen(false)
  }

  const formatMessageTime = (date: Date) => {
    if (!date) return "";
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    if (diff < 1000 * 60 * 60 * 24) {
      return date.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })
    }
    if (diff < 1000 * 60 * 60 * 24 * 2) {
      return "أمس"
    }
    return date.toLocaleDateString("ar-EG", { month: "short", day: "numeric" })
  }

  const filteredContacts = contacts.filter(c => 
    c.name.toLowerCase().includes(searchContact.toLowerCase())
  )

  return (
    <div className="flex h-[calc(100vh-140px)] bg-slate-50 dark:bg-slate-900 overflow-hidden rounded-[24px] border border-slate-200 dark:border-slate-800 shadow-sm" dir="rtl">
      {/* Sidebar - Conversation List */}
      <div className={cn(
        "w-full md:w-1/3 lg:w-1/4 border-l border-slate-200 dark:border-slate-800 flex flex-col bg-white dark:bg-slate-950 transition-all",
        isMobileView && activeId ? "hidden" : "flex"
      )}>
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">الرسائل</h1>
            <Button variant="ghost" className="rounded-full h-8 w-8 p-0" onClick={() => setIsNewModalOpen(true)}>
              <Plus className="h-5 w-5 text-primary" />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input placeholder="بحث في المحادثات..." className="pr-9 h-9 rounded-xl bg-slate-50 border-none text-sm" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
             <div className="flex flex-col items-center justify-center p-10 text-center opacity-40 mt-10 space-y-3">
                <div className="h-6 w-6 border-2 border-primary border-t-transparent animate-spin rounded-full"></div>
                <p className="text-sm font-medium">جاري التحميل...</p>
             </div>
          ) : conversations.length > 0 ? (
            <div className="divide-y divide-slate-50 dark:divide-slate-900">
              {conversations.map((c) => (
                <div
                  key={c.id}
                  onClick={() => handleSelectConversation(c.id)}
                  className={cn(
                    "p-4 flex gap-3 cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-900/50 relative",
                    activeId === c.id && "bg-primary/5 dark:bg-sky-400/5"
                  )}
                >
                  <div className="relative">
                    <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-500">
                      {getInitials(c.participant.name)}
                    </div>
                    {c.unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 h-5 w-5 bg-primary text-white text-[10px] font-bold flex items-center justify-center rounded-full ring-2 ring-white dark:ring-slate-900">
                        {c.unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <div className="flex justify-between items-center mb-0.5">
                      <p className="font-bold text-sm text-slate-900 dark:text-white truncate">{c.participant.name}</p>
                      <span className="text-[10px] text-slate-400 shrink-0">{formatMessageTime(c.lastMessageTime)}</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate leading-relaxed">{c.lastMessage}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-10 text-center opacity-40 mt-10">
              <MessageSquare className="h-12 w-12 mb-2" />
              <p className="text-sm font-medium">لا توجد رسائل بعد</p>
            </div>
          )}
        </div>
      </div>

      {/* Main - Chat Window */}
      <div className={cn(
        "flex-1 flex flex-col bg-white dark:bg-slate-950 transition-all",
        isMobileView && !activeId ? "hidden" : "flex"
      )}>
        {activeConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-950 z-10">
              <div className="flex items-center gap-3">
                {isMobileView && (
                  <Button variant="ghost" className="p-0 h-8 w-8" onClick={() => handleSelectConversation(null)}>
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                )}
                <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-500">
                  {getInitials(activeConversation.participant.name)}
                </div>
                <div>
                  <h2 className="font-bold text-slate-900 dark:text-white leading-tight">{activeConversation.participant.name}</h2>
                  <p className="text-[11px] text-slate-400 font-medium">{activeConversation.participant.role}</p>
                </div>
              </div>
              <Button variant="ghost" className="h-8 w-8 p-0 rounded-full">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30 dark:bg-slate-900/10">
              {activeConversation.messages.map((m, idx) => {
                const isMe = m.senderId === "me"
                const showDate = idx === 0 || 
                  new Date(m.createdAt).toDateString() !== new Date(activeConversation.messages[idx-1].createdAt).toDateString()

                return (
                  <React.Fragment key={m.id}>
                    {showDate && (
                      <div className="flex justify-center">
                        <span className="text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-500 px-3 py-1 rounded-full font-bold">
                          {new Date(m.createdAt).toLocaleDateString("ar-EG", { weekday: 'long', year: idx > 0 ? 'numeric' : undefined, month: 'long', day: 'numeric' })}
                        </span>
                      </div>
                    )}
                    <div className={cn("flex", isMe ? "justify-start" : "justify-end")}>
                      <div className={cn(
                        "max-w-[75%] px-4 py-2.5 rounded-[18px] text-sm leading-relaxed relative",
                        isMe 
                          ? "bg-primary text-white rounded-br-none" 
                          : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-bl-none shadow-sm"
                      )}>
                        <p>{m.text}</p>
                        <span className={cn(
                          "text-[9px] mt-1 block",
                          isMe ? "text-white/60" : "text-slate-400"
                        )}>
                          {m.createdAt.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </div>
                  </React.Fragment>
                )
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950">
              <div className="flex items-end gap-2 bg-slate-50 dark:bg-slate-900 p-2 rounded-2xl">
                <Textarea 
                  placeholder="اكتب رسالة... (يُرد خلال 24 ساعة)" 
                  className="bg-transparent border-none focus-visible:ring-0 min-h-[44px] max-h-[120px] resize-none h-11 text-sm pt-2"
                  value={newMessageText}
                  onChange={(e) => setNewMessageText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      handleSendMessage()
                    }
                  }}
                />
                <Button 
                  className="h-10 w-10 p-0 rounded-xl bg-primary hover:bg-primary/90 shadow-none"
                  onClick={handleSendMessage}
                  disabled={!newMessageText.trim()}
                >
                  <Send className="h-4 w-4 rotate-180" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-10 animate-in fade-in duration-500">
            <div className="h-24 w-24 bg-primary/10 flex items-center justify-center rounded-full mb-6">
              <MessageSquare className="h-12 w-12 text-primary opacity-50" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">اختر محادثة للبدء</h3>
            <p className="text-slate-500 max-w-xs mx-auto leading-relaxed">تواصل مع أولياء الأمور أو المدرسين بسهولة وبشكل خاص وآمن داخل المنصة.</p>
          </div>
        )}
      </div>

      {/* New Conversation Modal */}
      <Dialog open={isNewModalOpen} onOpenChange={setIsNewModalOpen}>
        <DialogContent className="sm:max-w-[450px]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right">محادثة جديدة</DialogTitle>
            <DialogDescription className="text-right">
              اختر الشخص الذي تود مراسلته من القائمة أدناه
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="ابحث بالاسم..." 
                className="pr-10 h-10 rounded-xl"
                value={searchContact}
                onChange={(e) => setSearchContact(e.target.value)}
              />
            </div>
            <div className="max-h-[300px] overflow-y-auto space-y-2">
              {filteredContacts.length > 0 ? (
                filteredContacts.map((contact) => (
                  <div
                    key={contact.id}
                    onClick={() => handleCreateConversation(contact)}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer transition-colors"
                  >
                    <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-500">
                      {getInitials(contact.name)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{contact.name}</p>
                      <p className="text-xs text-slate-500">{contact.role}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-sm text-slate-500 py-4 font-bold">عفواً، لا توجد نتائج</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
