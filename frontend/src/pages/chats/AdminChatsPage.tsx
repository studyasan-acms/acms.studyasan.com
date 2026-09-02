import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  MessageSquare,
  Users,
  Calendar,
  Search,
  RefreshCw,
  ArrowUpDown,
  Send,
  Paperclip,
  X,
  Trash2,
  Image,
  Video,
  FileText,
  File,
  Loader2,
  ExternalLink,
  MessageCircle,
  GraduationCap,
  Sparkles,
  Layers,
  CheckCheck,
  CheckCircle2,
  AlertCircle,
  RotateCw,
} from "lucide-react";
import { chatService } from "@/services/api";
import { socketService } from "@/services/socket";
import { useAuthStore } from "@/store/authStore";
import type { Chat, User, Message, MessageType } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import DeleteConfirmationModal from "@/components/ui/deleteConfirmationModal";
import { usePageTitle } from "@/hooks/usePageTitle";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface ChatAttachmentItem {
  id: string;
  file: File;
  previewUrl: string;
  uploadedUrl?: string;
  status: 'uploading' | 'ready' | 'error';
  errorMessage?: string;
  messageType: MessageType;
}

export default function AdminChatsPage() {
  usePageTitle("Support Chats");
  const { user } = useAuthStore();

  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"ALL" | "TEACHER" | "STUDENT">("ALL");
  const [sortField, setSortField] = useState<"updated_at" | "created_at" | "message_count">("updated_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Search, Filters & Sorting
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"latest" | "oldest" | "messages" | "name">("latest");
  const [activityFilter, setActivityFilter] = useState<"all" | "today" | "week">("all");
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Active Chat Popup Modal for Admin
  const [activeChatModal, setActiveChatModal] = useState<Chat | null>(null);
  const [modalMessages, setModalMessages] = useState<Message[]>([]);
  const [loadingModalMessages, setLoadingModalMessages] = useState(false);
  const [modalMessageText, setModalMessageText] = useState("");
  const [modalSelectedAttachments, setModalSelectedAttachments] = useState<ChatAttachmentItem[]>([]);
  const [sendingModalMessage, setSendingModalMessage] = useState(false);

  // Delete Message Modal
  const [deletingMessageId, setDeletingMessageId] = useState<number | null>(null);
  const [isDeletingMessage, setIsDeletingMessage] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const modalFileInputRef = useRef<HTMLInputElement>(null);
  const activeChatModalRef = useRef<Chat | null>(null);

  useEffect(() => {
    activeChatModalRef.current = activeChatModal;
  }, [activeChatModal]);

  // Fetch all chats
  const fetchAllChats = useCallback(async () => {
    try {
      setLoading(true);
      const response = await chatService.getAllChats();
      setChats(response.data || []);
    } catch (error) {
      console.error("Error fetching chats:", error);
      toast.error("Failed to load chats");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllChats();
  }, [fetchAllChats]);

  // Socket Connection for Real-Time Chat sync
  useEffect(() => {
    const socket = socketService.connect();

    const handleReceiveMessage = (message: Message) => {
      // If modal is open for this chat, append message
      if (activeChatModalRef.current?.id === message.chat_id) {
        setModalMessages((prev) => {
          if (prev.some((m) => m.id === message.id)) return prev;
          return [...prev, message];
        });
      }

      // Update sidebar/table chats last message & timestamp
      setChats((prevChats) => {
        return prevChats.map((c) => {
          if (c.id === message.chat_id) {
            return {
              ...c,
              messages: [message],
              updated_at: message.created_at,
              _count: {
                messages: (c._count?.messages || 0) + 1,
              },
            };
          }
          return c;
        });
      });
    };

    const handleMessageDeleted = (data: { messageId: number; chatId: number }) => {
      if (activeChatModalRef.current?.id === data.chatId) {
        setModalMessages((prev) => prev.filter((m) => m.id !== data.messageId));
      }
      setChats((prevChats) =>
        prevChats.map((c) => {
          if (c.id === data.chatId) {
            return {
              ...c,
              messages: c.messages && c.messages[0]?.id === data.messageId ? [] : c.messages,
              _count: {
                messages: Math.max(0, (c._count?.messages || 1) - 1),
              },
            };
          }
          return c;
        })
      );
    };

    socket?.on("receive_message", handleReceiveMessage);
    socket?.on("message_deleted", handleMessageDeleted);

    return () => {
      socket?.off("receive_message", handleReceiveMessage);
      socket?.off("message_deleted", handleMessageDeleted);
    };
  }, []);

  // Join all chat rooms on socket
  useEffect(() => {
    if (chats.length > 0) {
      chats.forEach((chat) => socketService.joinChat(chat.id));
    }
  }, [chats]);

  // Auto-scroll modal message stream
  useEffect(() => {
    if (activeChatModal) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [modalMessages, activeChatModal]);

  // Helper functions
  const getParticipantRoles = (chat: Chat): { students: User[]; teachers: User[] } => {
    const students = chat.participants
      .filter((p) => p.user?.role === "STUDENT")
      .map((p) => p.user);
    const teachers = chat.participants
      .filter((p) => p.user?.role === "TEACHER")
      .map((p) => p.user);
    return { students, teachers };
  };

  const getChatTitle = (chat: Chat): string => {
    const { students, teachers } = getParticipantRoles(chat);
    if (students.length > 0 && teachers.length > 0) {
      const studentNames = students.map((s) => s.name).join(", ");
      const teacherNames = teachers.map((t) => t.name).join(", ");
      return `${studentNames} + ${teacherNames}`;
    }
    if (students.length > 0) return students.map((s) => s.name).join(", ");
    if (teachers.length > 0) return teachers.map((t) => t.name).join(", ");
    return (
      chat.participants
        .map((p) => p.user?.name)
        .filter(Boolean)
        .join(" + ") || `Chat #${chat.id}`
    );
  };

  const getMessageType = (file: File): MessageType => {
    const type = file.type;
    if (type.startsWith("image/")) return "IMAGE";
    if (type.startsWith("video/")) return "VIDEO";
    if (type === "application/pdf") return "PDF";
    return "FILE";
  };

  const getFileIcon = (messageType: string) => {
    switch (messageType) {
      case "IMAGE":
        return <Image className="h-4 w-4 text-emerald-500" />;
      case "VIDEO":
        return <Video className="h-4 w-4 text-purple-500" />;
      case "PDF":
        return <FileText className="h-4 w-4 text-red-500" />;
      default:
        return <File className="h-4 w-4 text-blue-500" />;
    }
  };

  // Open Chat in Modal
  const handleOpenChatModal = async (chat: Chat) => {
    setActiveChatModal(chat);
    setModalMessages([]);
    setModalMessageText("");
    setModalSelectedAttachments([]);
    socketService.joinChat(chat.id);

    try {
      setLoadingModalMessages(true);
      const res = await chatService.getChatMessages(chat.id);
      setModalMessages(res.data.messages || []);
    } catch (err) {
      console.error("Failed to load chat messages:", err);
      toast.error("Failed to load conversation messages");
    } finally {
      setLoadingModalMessages(false);
    }
  };

  const uploadModalAttachmentItem = async (item: ChatAttachmentItem) => {
    try {
      const res = await chatService.uploadAttachment(item.file);
      const uploaded = res.data?.attachments?.[0];
      if (uploaded && uploaded.url) {
        setModalSelectedAttachments((prev) =>
          prev.map((a) =>
            a.id === item.id
              ? {
                  ...a,
                  status: 'ready',
                  uploadedUrl: uploaded.url,
                  messageType: (uploaded.messageType as MessageType) || a.messageType,
                }
              : a
          )
        );
      } else {
        throw new Error('Upload returned no URL');
      }
    } catch (err) {
      console.error('Failed to upload modal attachment:', err);
      setModalSelectedAttachments((prev) =>
        prev.map((a) =>
          a.id === item.id
            ? { ...a, status: 'error', errorMessage: 'Upload failed' }
            : a
        )
      );
    }
  };

  // Send message from Modal
  const handleSendModalMessage = async () => {
    if (!activeChatModal || (!modalMessageText.trim() && modalSelectedAttachments.length === 0)) return;

    // Check if still uploading
    const isStillUploading = modalSelectedAttachments.some((a) => a.status === 'uploading');
    if (isStillUploading) {
      toast.info('Please wait for attachments to finish uploading...');
      return;
    }

    const failedItems = modalSelectedAttachments.filter((a) => a.status === 'error');
    if (failedItems.length > 0) {
      toast.error('Please remove or retry failed attachments before sending.');
      return;
    }

    setSendingModalMessage(true);
    try {
      const readyAttachments = modalSelectedAttachments
        .filter((a) => a.status === 'ready' && a.uploadedUrl)
        .map((a) => ({ url: a.uploadedUrl!, messageType: a.messageType }));

      if (readyAttachments.length > 0) {
        await chatService.sendMessage(activeChatModal.id, {
          content: modalMessageText.trim() || undefined,
          attachments: readyAttachments,
        });
      } else {
        await chatService.sendMessage(activeChatModal.id, {
          content: modalMessageText.trim() || undefined,
          messageType: 'TEXT',
        });
      }

      // Cleanup object URLs
      modalSelectedAttachments.forEach((a) => {
        if (a.previewUrl) URL.revokeObjectURL(a.previewUrl);
      });

      setModalMessageText("");
      setModalSelectedAttachments([]);
    } catch (error) {
      console.error("Error sending admin message:", error);
      toast.error("Failed to send message");
    } finally {
      setSendingModalMessage(false);
    }
  };

  // Delete message handler
  const handleDeleteMessageConfirm = async () => {
    if (!activeChatModal || !deletingMessageId) return;

    setIsDeletingMessage(true);
    try {
      await chatService.deleteMessage(activeChatModal.id, deletingMessageId);
      setModalMessages((prev) => prev.filter((m) => m.id !== deletingMessageId));
      setChats((prevChats) =>
        prevChats.map((c) => {
          if (c.id === activeChatModal.id && c.messages && c.messages[0]?.id === deletingMessageId) {
            return { ...c, messages: [] };
          }
          return c;
        })
      );
      toast.success("Message deleted");
      setDeletingMessageId(null);
    } catch (err) {
      console.error("Failed to delete message:", err);
      toast.error("Failed to delete message");
    } finally {
      setIsDeletingMessage(false);
    }
  };

  // File selection for Modal
  const handleModalFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const fileList = Array.from(files);
      const newItems: ChatAttachmentItem[] = [];

      for (const f of fileList) {
        if (f.size > 100 * 1024 * 1024) {
          toast.error(`File "${f.name}" exceeds 100MB limit`);
          continue;
        }
        const item: ChatAttachmentItem = {
          id: Math.random().toString(36).substring(2, 9),
          file: f,
          previewUrl: URL.createObjectURL(f),
          status: 'uploading',
          messageType: getMessageType(f),
        };
        newItems.push(item);
      }

      if (newItems.length > 0) {
        setModalSelectedAttachments((prev) => [...prev, ...newItems]);
        newItems.forEach((item) => uploadModalAttachmentItem(item));
        toast.info(`Uploading ${newItems.length} attachment${newItems.length > 1 ? 's' : ''}...`);
      }
    }
    if (e.target) e.target.value = "";
  };

  const removeModalAttachment = (id: string) => {
    setModalSelectedAttachments((prev) => {
      const target = prev.find((a) => a.id === id);
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((a) => a.id !== id);
    });
  };

  const retryModalAttachmentUpload = (id: string) => {
    const item = modalSelectedAttachments.find((a) => a.id === id);
    if (item) {
      setModalSelectedAttachments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: 'uploading', errorMessage: undefined } : a))
      );
      uploadModalAttachmentItem(item);
    }
  };

  // Filtered & Sorted Chats
  const filteredAndSortedChats = useMemo(() => {
    let list = [...chats];

    // Filter by activity date
    if (activityFilter === "today") {
      const today = new Date().toDateString();
      list = list.filter((c) => {
        const lastMsg = c.messages?.[0];
        return lastMsg && new Date(lastMsg.created_at).toDateString() === today;
      });
    } else if (activityFilter === "week") {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      list = list.filter((c) => {
        const lastMsg = c.messages?.[0];
        return lastMsg && new Date(lastMsg.created_at) >= oneWeekAgo;
      });
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      list = list.filter((chat) => {
        const title = getChatTitle(chat).toLowerCase();
        const participantMatch = chat.participants.some(
          (p) =>
            p.user?.name?.toLowerCase().includes(query) ||
            p.user?.email?.toLowerCase().includes(query)
        );
        const lastMsgContent = (chat.messages?.[0]?.content || "").toLowerCase();
        return title.includes(query) || participantMatch || lastMsgContent.includes(query);
      });
    }

    // Sort
    if (sortBy === "latest") {
      list.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    } else if (sortBy === "oldest") {
      list.sort((a, b) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime());
    } else if (sortBy === "messages") {
      list.sort((a, b) => (b._count?.messages || 0) - (a._count?.messages || 0));
    } else if (sortBy === "name") {
      list.sort((a, b) => getChatTitle(a).localeCompare(getChatTitle(b)));
    }

    return list;
  }, [chats, searchQuery, sortBy, activityFilter]);

  // Pagination
  const totalCount = filteredAndSortedChats.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const paginatedChats = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredAndSortedChats.slice(start, start + pageSize);
  }, [filteredAndSortedChats, page, pageSize]);

  const activeTodayCount = chats.filter((chat) => {
    const lastMessage = chat.messages?.[0];
    if (!lastMessage) return false;
    const messageDate = new Date(lastMessage.created_at);
    return messageDate.toDateString() === new Date().toDateString();
  }).length;

  const totalMessagesCount = chats.reduce((sum, chat) => sum + (chat._count?.messages || 0), 0);

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-0.5">
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Academic & Support Chats</h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Monitor, view and send messages directly between students and teachers
          </p>
        </div>

        <Button
          variant="outline"
          onClick={fetchAllChats}
          disabled={loading}
          className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 gap-2 h-10 px-4 font-bold text-xs uppercase tracking-wider self-start sm:self-auto"
        >
          <RefreshCw className={cn("w-4 h-4", loading ? "animate-spin text-saBlue" : "")} />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Conversations</p>
            <p className="text-xl font-black text-slate-900 mt-0.5">{chats.length}</p>
          </div>
          <div className="h-8 w-8 rounded-lg bg-saBlue/10 flex items-center justify-center text-saBlue shrink-0">
            <MessageCircle className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Active Today</p>
            <p className="text-xl font-black text-saVividOrange mt-0.5">{activeTodayCount}</p>
          </div>
          <div className="h-8 w-8 rounded-lg bg-saVividOrange/10 flex items-center justify-center text-saVividOrange shrink-0">
            <Calendar className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Messages</p>
            <p className="text-xl font-black text-saBlue mt-0.5">{totalMessagesCount}</p>
          </div>
          <div className="h-8 w-8 rounded-lg bg-saBlue/10 flex items-center justify-center text-saBlue shrink-0">
            <Layers className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex-1 flex flex-col sm:flex-row gap-3 w-full">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search by participant name, email or message..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="pl-9 h-11 rounded-xl border-slate-200 focus-visible:ring-saBlue bg-white"
            />
          </div>

          {/* Activity Filter */}
          <div className="flex items-center gap-2">
            <select
              value={activityFilter}
              onChange={(e) => {
                setActivityFilter(e.target.value as any);
                setPage(1);
              }}
              className="h-11 px-3 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-saBlue/20"
            >
              <option value="all">All Conversations</option>
              <option value="today">Active Today</option>
              <option value="week">Active This Week</option>
            </select>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value as any);
                setPage(1);
              }}
              className="h-11 px-3 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-saBlue/20"
            >
              <option value="latest">Recent Activity</option>
              <option value="oldest">Oldest Activity</option>
              <option value="messages">Most Messages</option>
              <option value="name">Name (A-Z)</option>
            </select>
          </div>
        </div>

        {(searchQuery || activityFilter !== "all" || sortBy !== "latest") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchQuery("");
              setActivityFilter("all");
              setSortBy("latest");
              setPage(1);
            }}
            className="rounded-xl text-slate-500 hover:text-slate-800 h-10 px-3 shrink-0"
          >
            Reset Filters
          </Button>
        )}
      </div>

      {/* Tabular Format */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-saBlue mx-auto mb-3" />
            <p className="text-slate-500 font-medium text-sm">Loading conversations...</p>
          </div>
        ) : paginatedChats.length === 0 ? (
          <div className="py-20 px-4 text-center max-w-md mx-auto space-y-3">
            <div className="w-16 h-16 rounded-3xl bg-blue-50 text-saBlue flex items-center justify-center mx-auto shadow-inner">
              <MessageSquare className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">No Chats Found</h3>
              <p className="text-sm text-slate-500 mt-1">
                {searchQuery || activityFilter !== "all"
                  ? "Try changing your search query or filter parameters."
                  : "No conversations are currently active."}
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[12px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-4 px-6">Chat Title ({`Student + Teacher`})</th>
                  <th className="py-4 px-6">Student</th>
                  <th className="py-4 px-6">Teacher</th>
                  <th className="py-4 px-6">Last Message</th>
                  <th className="py-4 px-6 text-center">Messages</th>
                  <th className="py-4 px-6">Last Active</th>
                  <th className="py-4 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {paginatedChats.map((chat) => {
                  const { students, teachers } = getParticipantRoles(chat);
                  const lastMessage = chat.messages?.[0];
                  const title = getChatTitle(chat);
                  const studentName = students.map((s) => s.name).join(", ") || "—";
                  const teacherName = teachers.map((t) => t.name).join(", ") || "—";

                  return (
                    <tr
                      key={chat.id}
                      className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                      onClick={() => handleOpenChatModal(chat)}
                    >
                      {/* Chat Title */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-saBlue/10 to-sky-100 text-saBlue flex items-center justify-center font-bold text-xs shrink-0 group-hover:scale-105 transition-transform border border-sky-100">
                            <MessageSquare className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 group-hover:text-saBlue transition-colors">
                              {title}
                            </p>
                            <p className="text-xs text-slate-400">ID #{chat.id}</p>
                          </div>
                        </div>
                      </td>

                      {/* Student */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6 border border-slate-200">
                            <AvatarFallback className="text-[10px] font-bold bg-blue-50 text-blue-600">
                              {studentName.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-slate-800 text-xs">{studentName}</span>
                        </div>
                      </td>

                      {/* Teacher */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6 border border-slate-200">
                            <AvatarFallback className="text-[10px] font-bold bg-emerald-50 text-emerald-600">
                              {teacherName.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-slate-800 text-xs">{teacherName}</span>
                        </div>
                      </td>

                      {/* Last Message Preview */}
                      <td className="py-4 px-6 max-w-xs">
                        {lastMessage ? (
                          <div className="truncate">
                            <span className="font-bold text-slate-700 text-xs mr-1">
                              {lastMessage.sender.name}:
                            </span>
                            <span className="text-slate-500 text-xs">
                              {lastMessage.content || `[${lastMessage.message_type}]`}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs italic">No messages</span>
                        )}
                      </td>

                      {/* Messages count */}
                      <td className="py-4 px-6 text-center">
                        <Badge variant="secondary" className="bg-slate-100 text-slate-700 font-bold text-xs px-2.5 py-0.5">
                          {chat._count?.messages || 0}
                        </Badge>
                      </td>

                      {/* Last active */}
                      <td className="py-4 px-6">
                        <span className="text-xs text-slate-500">
                          {format(new Date(chat.updated_at), "MMM d, h:mm a")}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-4 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="sm"
                          onClick={() => handleOpenChatModal(chat)}
                          className="bg-saBlue/10 hover:bg-saBlue text-saBlue hover:text-white rounded-xl h-8 px-3 text-xs font-semibold shadow-none transition-all gap-1.5"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Open Chat</span>
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-sm text-slate-500 bg-slate-50/50">
            <span>
              Page {page} of {totalPages} ({totalCount} total conversations)
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg h-8 px-3"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-lg h-8 px-3"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ======================================================= */}
      {/* ADMIN CHAT POPUP MODAL (Open chat directly on modal)  */}
      {/* ======================================================= */}
      {activeChatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl h-[88vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-saBlue/10 text-saBlue flex items-center justify-center font-bold">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 truncate">
                      {getChatTitle(activeChatModal)}
                    </h2>
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-bold">
                      Admin
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-400">
                    {activeChatModal.participants?.length || 2} participants • Chat ID #{activeChatModal.id}
                  </p>
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setActiveChatModal(null)}
                className="rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200/60"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Modal Messages Stream */}
            <div className="flex-1 overflow-hidden p-4 bg-slate-50/30 flex flex-col">
              <ScrollArea className="flex-1 pr-2">
                {loadingModalMessages ? (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-2">
                    <Loader2 className="w-8 h-8 animate-spin text-saBlue" />
                    <p className="text-xs font-medium">Loading conversation...</p>
                  </div>
                ) : modalMessages.length === 0 ? (
                  <div className="text-center py-20 text-slate-400 space-y-2">
                    <MessageSquare className="w-12 h-12 text-slate-300 mx-auto" />
                    <p className="text-sm font-semibold text-slate-700">No messages in this chat yet</p>
                    <p className="text-xs">Type below to send an admin message to the participants.</p>
                  </div>
                ) : (
                  <div className="space-y-3 pb-2">
                    {modalMessages.map((message) => {
                      const isOwnMessage = message.sender_id === user?.id;

                      return (
                        <div
                          key={message.id}
                          className={cn(
                            "group/adminMsg flex items-end gap-1.5",
                            isOwnMessage ? "justify-end" : "justify-start"
                          )}
                        >
                          {/* Delete icon on hover (Admin can delete any message) */}
                          {isOwnMessage && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 opacity-0 group-hover/adminMsg:opacity-100 transition-opacity text-slate-400 hover:text-red-500 hover:bg-red-50 shrink-0 rounded-lg"
                              title="Delete message"
                              onClick={() => setDeletingMessageId(message.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}

                          <div
                            className={cn(
                              "flex space-x-2 max-w-[85%] md:max-w-[75%]",
                              isOwnMessage ? "flex-row-reverse space-x-reverse" : ""
                            )}
                          >
                            {!isOwnMessage && (
                              <Avatar className="h-7 w-7 shrink-0 mt-0.5 border border-slate-200">
                                <AvatarFallback className="text-[10px] font-bold bg-slate-100 text-slate-700">
                                  {message.sender?.name?.charAt(0).toUpperCase() || "?"}
                                </AvatarFallback>
                              </Avatar>
                            )}

                            <div
                              className={cn(
                                "rounded-2xl p-3 shadow-xs",
                                isOwnMessage
                                  ? "bg-saBlue text-white rounded-br-xs"
                                  : "bg-white border border-slate-200 text-slate-800 rounded-bl-xs"
                              )}
                            >
                              {!isOwnMessage && message.sender && (
                                <div className="text-[11px] font-bold mb-1 text-saBlue">
                                  {message.sender.name}
                                </div>
                              )}

                              {message.content && (
                                <div className="text-sm whitespace-pre-wrap leading-relaxed">
                                  {message.content}
                                </div>
                              )}

                              {message.attachment_url && (
                                <div className={cn("rounded-xl overflow-hidden", message.content ? "mt-2" : "")}>
                                  {message.message_type === "IMAGE" ? (
                                    <img
                                      src={message.attachment_url}
                                      alt="Attachment"
                                      className="max-w-full h-auto rounded-xl cursor-pointer max-h-64 object-cover hover:opacity-95 transition-opacity"
                                      onClick={() => window.open(message.attachment_url!, "_blank")}
                                    />
                                  ) : (
                                    <div
                                      className={cn(
                                        "flex items-center space-x-2 p-2.5 rounded-xl cursor-pointer transition-colors",
                                        isOwnMessage
                                          ? "bg-white/10 hover:bg-white/20 text-white"
                                          : "bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200"
                                      )}
                                      onClick={() => window.open(message.attachment_url!, "_blank")}
                                    >
                                      {getFileIcon(message.message_type)}
                                      <span className="text-xs font-semibold truncate max-w-[180px]">
                                        {message.attachment_url.split("/").pop()}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )}

                              <div
                                className={cn(
                                  "text-[10px] text-right mt-1 font-medium flex items-center justify-end gap-1",
                                  isOwnMessage ? "text-blue-100" : "text-slate-400"
                                )}
                              >
                                <span>{format(new Date(message.created_at), "h:mm a")}</span>
                                {isOwnMessage && <CheckCheck className="w-3 h-3 text-blue-100" />}
                              </div>
                            </div>
                          </div>

                          {/* Delete button for other participant messages */}
                          {!isOwnMessage && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 opacity-0 group-hover/adminMsg:opacity-100 transition-opacity text-slate-400 hover:text-red-500 hover:bg-red-50 shrink-0 rounded-lg"
                              title="Delete message (Admin)"
                              onClick={() => setDeletingMessageId(message.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* Modal Bottom Input Tray with Multiple Attachments support */}
            <div className="p-4 border-t border-slate-200 bg-white shrink-0">
              {/* Multiple Attachments Preview Tray with Instant Status */}
              {modalSelectedAttachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2 p-2 bg-slate-50 rounded-2xl border border-slate-200 max-h-36 overflow-y-auto">
                  {modalSelectedAttachments.map((item) => {
                    const isImg = item.file.type.startsWith("image/");
                    return (
                      <div
                        key={item.id}
                        className={cn(
                          "relative flex items-center gap-2 p-1.5 pr-2 rounded-xl border transition-all text-xs",
                          item.status === 'uploading' && "bg-blue-50/50 border-blue-200 shadow-xs",
                          item.status === 'ready' && "bg-white border-emerald-200 shadow-2xs",
                          item.status === 'error' && "bg-rose-50 border-rose-200"
                        )}
                      >
                        <div className="relative w-8 h-8 rounded-lg overflow-hidden shrink-0">
                          {isImg ? (
                            <img
                              src={item.previewUrl}
                              alt="preview"
                              className="w-full h-full object-cover border border-slate-100 rounded-lg"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-slate-100 rounded-lg">
                              {getFileIcon(item.messageType)}
                            </div>
                          )}
                          {item.status === 'uploading' && (
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[1px]">
                              <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                            </div>
                          )}
                        </div>

                        <div className="max-w-[130px] truncate min-w-0">
                          <p className="font-semibold text-slate-700 truncate leading-tight">{item.file.name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] text-slate-400">{(item.file.size / 1024).toFixed(0)} KB</span>
                            {item.status === 'uploading' && (
                              <span className="text-[10px] font-bold text-saBlue animate-pulse flex items-center gap-0.5">
                                Uploading...
                              </span>
                            )}
                            {item.status === 'ready' && (
                              <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5">
                                <CheckCircle2 className="w-2.5 h-2.5" /> Ready
                              </span>
                            )}
                            {item.status === 'error' && (
                              <button
                                type="button"
                                onClick={() => retryModalAttachmentUpload(item.id)}
                                className="text-[10px] font-bold text-rose-600 hover:underline flex items-center gap-0.5"
                                title="Retry upload"
                              >
                                <RotateCw className="w-2.5 h-2.5" /> Retry
                              </button>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeModalAttachment(item.id)}
                          className="p-1 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors ml-0.5"
                          title="Remove attachment"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex items-center space-x-2">
                <div className="flex-1 relative">
                  <Input
                    placeholder="Send a message as Admin..."
                    value={modalMessageText}
                    onChange={(e) => setModalMessageText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendModalMessage()}
                    disabled={sendingModalMessage}
                    className="pr-10 h-11 rounded-2xl border-slate-200 focus-visible:ring-saBlue bg-slate-50/50"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 w-8 text-slate-500 hover:text-saBlue hover:bg-saBlue/10 rounded-xl"
                    onClick={() => modalFileInputRef.current?.click()}
                    disabled={sendingModalMessage}
                    title="Attach photos / files"
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>
                </div>

                <input
                  type="file"
                  ref={modalFileInputRef}
                  onChange={handleModalFileSelect}
                  accept="image/*,video/*,.pdf,.doc,.docx,.txt"
                  multiple
                  className="hidden"
                />

                <Button
                  onClick={handleSendModalMessage}
                  disabled={
                    sendingModalMessage ||
                    (!modalMessageText.trim() && modalSelectedAttachments.length === 0) ||
                    modalSelectedAttachments.some((a) => a.status === 'uploading')
                  }
                  size="icon"
                  className="h-11 w-11 rounded-2xl bg-saBlue hover:bg-saBlue/90 text-white shadow-md shadow-saBlue/20 shrink-0"
                  title={
                    modalSelectedAttachments.some((a) => a.status === 'uploading')
                      ? 'Uploading attachments...'
                      : 'Send message'
                  }
                >
                  {sendingModalMessage || modalSelectedAttachments.some((a) => a.status === 'uploading') ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Message Confirmation Modal */}
      <DeleteConfirmationModal
        open={deletingMessageId !== null}
        title="Delete Message"
        message="Are you sure you want to delete this message? It will be removed for all participants."
        confirmText={isDeletingMessage ? "Deleting..." : "Delete"}
        onClose={() => !isDeletingMessage && setDeletingMessageId(null)}
        onCancel={() => !isDeletingMessage && setDeletingMessageId(null)}
        onConfirm={handleDeleteMessageConfirm}
      />
    </div>
  );
}
