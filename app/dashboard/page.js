//C:\Users\Admin\Desktop\lumen messesg\frontend\app\dashboard\page.js
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, ListTodo } from "lucide-react";
import ChatList from "../../components/ChatList";
import ChatWindow from "../../components/ChatWindow";
import BlockedUsersModal from "../../components/BlockedUsersModal";
import SequenceManagerModal from "../../components/SequenceManagerModal";
import { getSocket, disconnectSocket } from "../../lib/socket";

export default function DashboardPage() {
  const router = useRouter();
  const [activeChatId, setActiveChatId] = useState(null);
  const [blockedModalOpen, setBlockedModalOpen] = useState(false);
  const [sequenceModalOpen, setSequenceModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/login");
      return;
    }
    getSocket();
    setReady(true);
    return () => disconnectSocket();
  }, [router]);

  function logout() {
    localStorage.removeItem("token");
    disconnectSocket();
    router.replace("/login");
  }

  if (!ready) return null;

  return (
    <div className="h-dvh w-full flex overflow-hidden bg-base">
      {/* Sidebar — hidden on mobile once a chat is open */}
      <aside
        className={`w-full sm:w-[340px] shrink-0 border-r border-border bg-surface flex flex-col ${
          activeChatId ? "hidden sm:flex" : "flex"
        }`}
      >
        <ChatList
          key={refreshKey}
          activeChatId={activeChatId}
          onSelectChat={setActiveChatId}
          onOpenBlocked={() => setBlockedModalOpen(true)}
        />
        <div className="px-4 py-3 border-t border-border shrink-0 bg-surface flex flex-col gap-2">
          <button
            onClick={() => setSequenceModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 text-xs font-medium text-text-primary bg-elevated hover:bg-border rounded-lg py-2.5 transition-colors"
          >
            <ListTodo size={14} className="text-accent" />
            Manage Steps
          </button>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 text-xs font-medium text-text-primary bg-elevated hover:bg-border rounded-lg py-2.5 transition-colors"
          >
            <LogOut size={14} className="text-danger" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Conversation pane */}
      <main className={`flex-1 flex flex-col ${activeChatId ? "flex" : "hidden sm:flex"}`}>
        <ChatWindow
          chatId={activeChatId}
          onBack={() => setActiveChatId(null)}
          onChatMutated={() => setRefreshKey((k) => k + 1)}
        />
      </main>

      <BlockedUsersModal open={blockedModalOpen} onClose={() => setBlockedModalOpen(false)} />
      <SequenceManagerModal open={sequenceModalOpen} onClose={() => setSequenceModalOpen(false)} />
    </div>
  );
}