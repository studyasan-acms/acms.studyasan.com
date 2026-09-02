import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { chatService, teacherService, studentService } from '@/services/api';
import { socketService } from '@/services/socket';
import { useAuthStore } from '@/store/authStore';
import type { Chat, Message, Teacher, Student, MessageType, ChatMessagesResponse } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  MessageCircle,
  Search,
  Send,
  Paperclip,
  File,
  Image,
  Video,
  FileText,
  X,
  UserPlus,
  ChevronLeft,
  Loader2,
  Trash2,
  ArrowUpDown,
  CheckCheck,
} from 'lucide-react';
import DeleteConfirmationModal from '@/components/ui/deleteConfirmationModal';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { usePageTitle } from "@/hooks/usePageTitle";

const ChatsPageNew = () => {
  usePageTitle("Messages");
  const { chatId: chatIdParam } = useParams<{ chatId?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const chatId = chatIdParam || searchParams.get('chatId');

  const [chats, setChats] = useState<Chat[]>([]);
  const [loadingChats, setLoadingChats] = useState(true);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);

  // Search & Sort in sidebar
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [chatSortBy, setChatSortBy] = useState<'latest' | 'name' | 'messages'>('latest');

  // Ref for selectedChat to access in socket callbacks
  const selectedChatRef = useRef<Chat | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [canSendMessages, setCanSendMessages] = useState(true);
  const [canSendReason, setCanSendReason] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);

  const [deletingMessageId, setDeletingMessageId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [showContacts, setShowContacts] = useState(false);
  const [contactSearch, setContactSearch] = useState('');
  const [startingChat, setStartingChat] = useState(false);

  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [viewMode, setViewMode] = useState<'chats' | 'messages' | 'contacts'>('chats');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    selectedChatRef.current = selectedChat;
  }, [selectedChat]);

  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
      if (width >= 1024) {
        setViewMode('chats');
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  useEffect(() => {
    if (isMobile || isTablet) {
      if (selectedChat) setViewMode('messages');
      else if (showContacts) setViewMode('contacts');
      else setViewMode('chats');
    }
  }, [selectedChat, showContacts, isMobile, isTablet]);

  // Socket Connection
  useEffect(() => {
    const socket = socketService.connect();

    const handleReceiveMessage = (message: Message) => {
      if (message.sender_id !== user?.id && selectedChatRef.current?.id !== message.chat_id) {
        toast.info(`New message from ${message.sender?.name || 'User'}`);
      }

      // Update messages if looking at this chat
      if (selectedChatRef.current?.id === message.chat_id) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === message.id)) return prev;
          return [...prev, message];
        });

        if (message.sender_id !== user?.id && user?.id) {
          socketService.markMessageSeen({
            messageId: message.id,
            userId: user.id,
            chatId: message.chat_id,
          });
        }
      }

      // Update last message in sidebar
      setChats((prevChats) => {
        const updated = prevChats.map((c) => {
          if (c.id === message.chat_id) {
            return {
              ...c,
              messages: [message],
              updated_at: message.created_at,
            };
          }
          return c;
        });
        return updated.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      });
    };

    const handleMessageDeleted = (data: { messageId: number; chatId: number }) => {
      if (selectedChatRef.current?.id === data.chatId) {
        setMessages((prev) => prev.filter((m) => m.id !== data.messageId));
      }
      setChats((prevChats) =>
        prevChats.map((c) => {
          if (c.id === data.chatId && c.messages && c.messages[0]?.id === data.messageId) {
            return {
              ...c,
              messages: [],
            };
          }
          return c;
        })
      );
    };

    socket?.on('receive_message', handleReceiveMessage);
    socket?.on('message_deleted', handleMessageDeleted);

    return () => {
      socket?.off('receive_message', handleReceiveMessage);
      socket?.off('message_deleted', handleMessageDeleted);
    };
  }, [user?.id]);

  useEffect(() => {
    const load = async () => {
      await loadChats();
      if (user?.role !== 'ADMIN') {
        await loadContacts();
      }
    };
    load();
  }, [user?.role]);

  // Join all chat rooms
  useEffect(() => {
    if (chats.length > 0) {
      chats.forEach((chat) => socketService.joinChat(chat.id));
    }
  }, [chats]);

  // Load chat from URL query
  useEffect(() => {
    if (chatId && chats.length > 0) {
      const chat = chats.find((c) => c.id === parseInt(chatId));
      if (chat) {
        selectChat(chat);
      }
    }
  }, [chatId, chats]);

  // Auto scroll
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadChats = async () => {
    try {
      setLoadingChats(true);
      const response = await chatService.getUserChats();
      setChats(response.data);
    } catch (error: unknown) {
      console.error('Error loading chats:', error instanceof Error ? error.message : error);
      toast.error('Failed to load chats');
    } finally {
      setLoadingChats(false);
    }
  };

  const loadContacts = async () => {
    try {
      setLoadingContacts(true);
      if (user?.role === 'STUDENT') {
        const response = await teacherService.getAll();
        setTeachers(response.data.data);
      } else if (user?.role === 'TEACHER') {
        const response = await studentService.getAll();
        setStudents(response.data.data);
      }
    } catch (error: unknown) {
      console.error('Error loading contacts:', error instanceof Error ? error.message : error);
    } finally {
      setLoadingContacts(false);
    }
  };

  const selectChat = async (chat: Chat) => {
    setSelectedChat(chat);
    navigate(`/dashboard/chats?chatId=${chat.id}`);
    socketService.joinChat(chat.id);
    await loadMessages(chat.id);
  };

  const loadMessages = async (chatIdParam: number) => {
    try {
      setLoadingMessages(true);
      const response: ChatMessagesResponse = await chatService.getChatMessages(chatIdParam);
      setMessages(response.data.messages);
      setCanSendMessages(response.data.can_send ?? true);
      setCanSendReason(response.data.can_send_reason || null);

      if (user?.id) {
        response.data.messages.forEach((msg) => {
          if (msg.sender_id !== user.id) {
            socketService.markMessageSeen({
              messageId: msg.id,
              userId: user.id,
              chatId: chatIdParam,
            });
          }
        });
      }
    } catch (error: unknown) {
      console.error('Error loading messages:', error instanceof Error ? error.message : error);
      toast.error('Failed to load messages');
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedChat || !canSendMessages || (!messageText.trim() && selectedFiles.length === 0)) return;

    setSending(true);
    try {
      const messageData = {
        content: messageText.trim() || undefined,
        messageType: selectedFiles.length > 0 ? getMessageType(selectedFiles[0]) : 'TEXT',
      };

      await chatService.sendMessage(
        selectedChat.id,
        messageData,
        selectedFiles.length > 0 ? selectedFiles : undefined
      );

      setMessageText('');
      setSelectedFiles([]);
    } catch (error: unknown) {
      console.error('Error sending message:', error instanceof Error ? error.message : error);
      const message = error instanceof Error ? error.message : 'Failed to send message';
      toast.error(message);
      await loadMessages(selectedChat.id);
    } finally {
      setSending(false);
    }
  };

  const startNewChat = async (userId: number) => {
    if (startingChat) return;

    setStartingChat(true);
    try {
      const response = await chatService.startChat({ participantIds: [userId] });
      await loadChats();
      setShowContacts(false);
      selectChat(response.data);
      toast.success('Chat started');
    } catch (error: unknown) {
      console.error('Error starting chat:', error instanceof Error ? error.message : error);
      toast.error('Failed to start chat');
    } finally {
      setStartingChat(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const fileList = Array.from(files);
      const validFiles: File[] = [];

      for (const f of fileList) {
        if (f.size > 100 * 1024 * 1024) {
          toast.error(`File "${f.name}" exceeds 100MB limit`);
        } else {
          validFiles.push(f);
        }
      }

      if (validFiles.length > 0) {
        setSelectedFiles((prev) => [...prev, ...validFiles]);
        toast.success(`${validFiles.length} attachment${validFiles.length > 1 ? 's' : ''} added`);
      }
    }
    if (event.target) event.target.value = '';
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const getMessageType = (file: File): MessageType => {
    const type = file.type;
    if (type.startsWith('image/')) return 'IMAGE';
    if (type.startsWith('video/')) return 'VIDEO';
    if (type === 'application/pdf') return 'PDF';
    return 'FILE';
  };

  const getFileIcon = (messageType: string) => {
    switch (messageType) {
      case 'IMAGE':
        return <Image className="h-4 w-4 text-emerald-500" />;
      case 'VIDEO':
        return <Video className="h-4 w-4 text-purple-500" />;
      case 'PDF':
        return <FileText className="h-4 w-4 text-red-500" />;
      default:
        return <File className="h-4 w-4 text-blue-500" />;
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleDeleteMessage = async () => {
    if (!selectedChat || !deletingMessageId) return;

    setIsDeleting(true);
    try {
      await chatService.deleteMessage(selectedChat.id, deletingMessageId);
      setMessages((prev) => prev.filter((m) => m.id !== deletingMessageId));
      setChats((prevChats) =>
        prevChats.map((c) => {
          if (c.id === selectedChat.id && c.messages && c.messages[0]?.id === deletingMessageId) {
            return {
              ...c,
              messages: [],
            };
          }
          return c;
        })
      );
      toast.success('Message deleted successfully');
      setDeletingMessageId(null);
    } catch (error: unknown) {
      console.error('Error deleting message:', error instanceof Error ? error.message : error);
      toast.error('Failed to delete message');
    } finally {
      setIsDeleting(false);
    }
  };

  const getChatDisplayName = (chat: Chat) => {
    if (!chat.participants || chat.participants.length === 0) {
      return `Chat #${chat.id}`;
    }

    if (user?.role === 'ADMIN') {
      const students = chat.participants.filter((p) => p.user?.role === 'STUDENT');
      const teachers = chat.participants.filter((p) => p.user?.role === 'TEACHER');

      if (students.length > 0 && teachers.length > 0) {
        const studentNames = students.map((s) => s.user.name).join(', ');
        const teacherNames = teachers.map((t) => t.user.name).join(', ');
        return `${studentNames} + ${teacherNames}`;
      }
      if (students.length > 0) return students.map((s) => s.user.name).join(', ');
      if (teachers.length > 0) return teachers.map((t) => t.user.name).join(', ');
      return (
        chat.participants
          .map((p) => p.user?.name)
          .filter(Boolean)
          .join(' + ') || `Chat #${chat.id}`
      );
    }

    const otherParticipants = chat.participants.filter((p) => p.user_id !== user?.id);
    if (otherParticipants.length === 1) {
      return otherParticipants[0].user.name;
    }
    if (otherParticipants.length === 0) return "Me (Draft)";
    return `Group Chat (${otherParticipants.length} members)`;
  };

  const getLastMessage = (chat: Chat) => {
    if (!chat.messages || chat.messages.length === 0) return 'No messages yet';
    const lastMessage = chat.messages[0];
    const senderName = lastMessage.sender_id === user?.id ? 'You' : lastMessage.sender.name;

    if (lastMessage.message_type === 'TEXT') {
      return `${senderName}: ${lastMessage.content}`;
    }

    return `${senderName}: Sent a ${lastMessage.message_type.toLowerCase()}`;
  };

  // Filtered & Sorted Chats for Left Sidebar
  const processedChats = useMemo(() => {
    let list = [...chats];

    if (chatSearchQuery.trim()) {
      const query = chatSearchQuery.toLowerCase();
      list = list.filter((chat) => {
        const title = getChatDisplayName(chat).toLowerCase();
        const lastMsg = (chat.messages?.[0]?.content || '').toLowerCase();
        const participantNames = chat.participants.map((p) => p.user?.name?.toLowerCase() || '').join(' ');
        return title.includes(query) || lastMsg.includes(query) || participantNames.includes(query);
      });
    }

    if (chatSortBy === 'latest') {
      list.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    } else if (chatSortBy === 'name') {
      list.sort((a, b) => getChatDisplayName(a).localeCompare(getChatDisplayName(b)));
    } else if (chatSortBy === 'messages') {
      list.sort((a, b) => (b._count?.messages || 0) - (a._count?.messages || 0));
    }

    return list;
  }, [chats, chatSearchQuery, chatSortBy, user?.role]);

  const filteredTeachers = (teachers || []).filter(
    (t) =>
      t.user.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
      t.user.email.toLowerCase().includes(contactSearch.toLowerCase())
  );

  const filteredStudents = (students || []).filter(
    (s) =>
      s.user.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
      s.user.email.toLowerCase().includes(contactSearch.toLowerCase())
  );

  const handleBackToChats = () => {
    setSelectedChat(null);
    setShowContacts(false);
    setViewMode('chats');
    navigate('/dashboard/chats');
  };

  const handleBackFromContacts = () => {
    setShowContacts(false);
    setViewMode('chats');
  };

  const containerHeight = isMobile || isTablet ? 'h-[calc(100vh-6rem)]' : 'h-[calc(100vh-8rem)]';

  return (
    <div className={cn("flex gap-4", "lg:flex-row flex-col md:flex-col", containerHeight)}>
      {/* Left Sidebar - Chat List */}
      <Card
        className={cn(
          "flex-col bg-white rounded-3xl border-slate-200 shadow-sm overflow-hidden",
          "lg:w-88",
          (isMobile || isTablet) && viewMode !== 'chats' ? "hidden" : "flex",
          "w-full md:w-full lg:w-88",
          "h-full"
        )}
      >
        <CardHeader className="pb-3 px-4 pt-4 shrink-0 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-xl bg-saBlue/10 text-saBlue">
                <MessageCircle className="w-5 h-5" />
              </div>
              <CardTitle className="text-lg font-bold text-slate-800">Messages</CardTitle>
            </div>
            {user?.role !== 'ADMIN' && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 px-2.5 rounded-xl text-saBlue hover:bg-saBlue/10 gap-1.5"
                onClick={() => {
                  setShowContacts(true);
                  setViewMode('contacts');
                }}
              >
                <UserPlus className="h-4 w-4" />
                <span className="text-xs font-semibold">New Chat</span>
              </Button>
            )}
          </div>

          {/* Search bar */}
          <div className="relative mt-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Search conversations..."
              value={chatSearchQuery}
              onChange={(e) => setChatSearchQuery(e.target.value)}
              className="pl-8 h-9 text-xs rounded-xl bg-white border-slate-200 focus-visible:ring-saBlue"
            />
          </div>

          {/* Sort bar */}
          <div className="flex items-center justify-between mt-2 pt-1 text-xs text-slate-500">
            <span className="text-[11px] font-medium text-slate-400">
              {processedChats.length} conversation{processedChats.length !== 1 ? 's' : ''}
            </span>
            <div className="flex items-center gap-1">
              <ArrowUpDown className="w-3 h-3 text-slate-400" />
              <select
                value={chatSortBy}
                onChange={(e) => setChatSortBy(e.target.value as any)}
                className="text-xs bg-transparent border-0 font-semibold text-slate-600 focus:outline-none cursor-pointer"
              >
                <option value="latest">Recent</option>
                <option value="name">Name (A-Z)</option>
                <option value="messages">Most Msgs</option>
              </select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 p-0 overflow-hidden">
          <ScrollArea className="h-full">
            {loadingChats ? (
              <div className="flex flex-col items-center justify-center p-8 text-slate-400 gap-2">
                <Loader2 className="animate-spin text-saBlue w-6 h-6" />
                <p className="text-xs">Loading chats...</p>
              </div>
            ) : processedChats.length === 0 ? (
              <div className="p-8 text-center text-slate-400 space-y-2">
                <MessageCircle className="h-10 w-10 text-slate-300 mx-auto" />
                <p className="text-sm font-medium text-slate-600">No conversations found</p>
                <p className="text-xs text-slate-400">
                  {chatSearchQuery ? 'Try changing your search keywords.' : 'Start messaging someone!'}
                </p>
                {user?.role !== 'ADMIN' && !chatSearchQuery && (
                  <Button
                    size="sm"
                    className="mt-2 rounded-xl bg-saBlue hover:bg-saBlue/90 text-xs"
                    onClick={() => {
                      setShowContacts(true);
                      setViewMode('contacts');
                    }}
                  >
                    Start Chat
                  </Button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-slate-100 p-2 space-y-1">
                {processedChats.map((chat) => {
                  const isSelected = selectedChat?.id === chat.id;
                  const displayName = getChatDisplayName(chat);

                  return (
                    <div
                      key={chat.id}
                      className={cn(
                        "p-3 rounded-2xl cursor-pointer transition-all border border-transparent",
                        isSelected
                          ? "bg-saBlue/10 border-saBlue/20 shadow-sm"
                          : "hover:bg-slate-50 hover:border-slate-100"
                      )}
                      onClick={() => selectChat(chat)}
                    >
                      <div className="flex items-start space-x-3">
                        <Avatar className="h-10 w-10 shrink-0 border border-slate-200">
                          <AvatarFallback className={cn("text-xs font-bold", isSelected ? "bg-saBlue text-white" : "bg-slate-100 text-slate-700")}>
                            {displayName.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <p className={cn("font-bold text-sm truncate", isSelected ? "text-saBlue" : "text-slate-800")}>
                              {displayName}
                            </p>

                            <span className="text-[10px] text-slate-400 shrink-0">
                              {new Date(chat.updated_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                            </span>
                          </div>

                          <p className="text-xs text-slate-500 truncate mt-1">
                            {getLastMessage(chat)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Center - Chat Messages */}
      <Card
        className={cn(
          "flex-col bg-white rounded-3xl border-slate-200 shadow-sm overflow-hidden",
          "lg:flex-1",
          (isMobile || isTablet) && viewMode === 'chats' ? "hidden" : "flex",
          "w-full md:w-full lg:flex-1",
          "h-full"
        )}
      >
        {selectedChat ? (
          <>
            {/* Header */}
            <CardHeader className="pb-3 border-b border-slate-100 px-4 py-3 shrink-0 bg-slate-50/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {(isMobile || isTablet) && (
                    <Button variant="ghost" size="icon" onClick={handleBackToChats} className="-ml-2 rounded-xl">
                      <ChevronLeft className="h-5 w-5" />
                    </Button>
                  )}

                  <Avatar className="h-10 w-10 border border-slate-200">
                    <AvatarFallback className="bg-saBlue text-white font-bold">
                      {getChatDisplayName(selectedChat).charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div>
                    <CardTitle className="text-base font-bold text-slate-800">{getChatDisplayName(selectedChat)}</CardTitle>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <span>{selectedChat.participants?.length ?? 0} participants</span>
                      <span>•</span>
                      <span className="text-emerald-600 font-medium flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Active
                      </span>
                    </div>
                  </div>
                </div>

                {user?.role === 'ADMIN' && (
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 font-bold text-[11px]">
                    Admin Mode
                  </Badge>
                )}
              </div>
            </CardHeader>

            {/* Messages Scroll Area */}
            <CardContent className="flex-1 p-0 overflow-hidden flex flex-col relative bg-slate-50/30">
              <ScrollArea className="flex-1 p-4">
                {loadingMessages ? (
                  <div className="flex justify-center p-8">
                    <Loader2 className="animate-spin text-saBlue w-6 h-6" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 space-y-2">
                    <MessageCircle className="w-10 h-10 text-slate-300 mx-auto" />
                    <p className="text-sm font-semibold text-slate-600">No messages yet</p>
                    <p className="text-xs">Type below to start the conversation!</p>
                  </div>
                ) : (
                  <div className="space-y-3 pb-4">
                    {messages.map((message) => {
                      const isOwnMessage = message.sender_id === user?.id;
                      const canDelete = user?.role === 'ADMIN' || isOwnMessage;

                      return (
                        <div
                          key={message.id}
                          className={cn(
                            "group/msg flex items-end gap-1.5",
                            isOwnMessage ? "justify-end" : "justify-start"
                          )}
                        >
                          {/* Delete button for own message */}
                          {isOwnMessage && canDelete && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 opacity-0 group-hover/msg:opacity-100 transition-opacity text-slate-400 hover:text-red-500 hover:bg-red-50 shrink-0 rounded-lg"
                              title="Delete message"
                              onClick={() => setDeletingMessageId(message.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}

                          <div
                            className={cn(
                              "flex space-x-2 max-w-[85%] md:max-w-[70%]",
                              isOwnMessage ? "flex-row-reverse space-x-reverse" : ""
                            )}
                          >
                            {!isOwnMessage && (
                              <Avatar className="h-7 w-7 shrink-0 mt-0.5 border border-slate-200">
                                <AvatarFallback className="text-[10px] font-bold bg-slate-100 text-slate-700">
                                  {message.sender?.name?.charAt(0).toUpperCase() || '?'}
                                </AvatarFallback>
                              </Avatar>
                            )}

                            <div
                              className={cn(
                                "rounded-2xl p-3 shadow-sm",
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
                                  {message.message_type === 'IMAGE' ? (
                                    <img
                                      src={message.attachment_url}
                                      alt="Attachment"
                                      className="max-w-full h-auto rounded-xl cursor-pointer max-h-64 object-cover hover:opacity-95 transition-opacity"
                                      onClick={() => window.open(message.attachment_url!, '_blank')}
                                    />
                                  ) : (
                                    <div
                                      className={cn(
                                        "flex items-center space-x-2 p-2.5 rounded-xl cursor-pointer transition-colors",
                                        isOwnMessage
                                          ? "bg-white/10 hover:bg-white/20 text-white"
                                          : "bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200"
                                      )}
                                      onClick={() => window.open(message.attachment_url!, '_blank')}
                                    >
                                      {getFileIcon(message.message_type)}
                                      <span className="text-xs font-semibold truncate max-w-[180px]">
                                        {message.attachment_url.split('/').pop()}
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
                                <span>{formatTime(message.created_at)}</span>
                                {isOwnMessage && <CheckCheck className="w-3 h-3 text-blue-100" />}
                              </div>
                            </div>
                          </div>

                          {/* Delete button for other messages (admin only) */}
                          {!isOwnMessage && canDelete && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 opacity-0 group-hover/msg:opacity-100 transition-opacity text-slate-400 hover:text-red-500 hover:bg-red-50 shrink-0 rounded-lg"
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

              {/* Bottom Input Area */}
              <div className="p-3 border-t border-slate-200 bg-white mt-auto">
                {/* Multiple Attachments Preview Tray */}
                {selectedFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2 p-2 bg-slate-50 rounded-2xl border border-slate-200 max-h-36 overflow-y-auto">
                    {selectedFiles.map((file, idx) => {
                      const isImg = file.type.startsWith('image/');
                      return (
                        <div
                          key={idx}
                          className="flex items-center gap-2 p-1.5 pr-2 bg-white rounded-xl border border-slate-200 shadow-2xs text-xs"
                        >
                          {isImg ? (
                            <img
                              src={URL.createObjectURL(file)}
                              alt="preview"
                              className="w-8 h-8 object-cover rounded-lg border border-slate-100"
                            />
                          ) : (
                            <div className="p-1 bg-slate-100 rounded-lg">
                              {getFileIcon(getMessageType(file))}
                            </div>
                          )}
                          <div className="max-w-[120px] truncate">
                            <p className="font-semibold text-slate-700 truncate">{file.name}</p>
                            <p className="text-[10px] text-slate-400">{(file.size / 1024).toFixed(0)} KB</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeSelectedFile(idx)}
                            className="p-1 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50"
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
                      placeholder="Type a message..."
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                      disabled={sending || !canSendMessages}
                      className="pr-10 h-11 rounded-2xl border-slate-200 focus-visible:ring-saBlue bg-slate-50/50"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 w-8 text-slate-500 hover:text-saBlue hover:bg-saBlue/10 rounded-xl"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={sending || !canSendMessages}
                      title="Attach multiple files/photos"
                    >
                      <Paperclip className="h-4 w-4" />
                    </Button>
                  </div>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept="image/*,video/*,.pdf,.doc,.docx,.txt"
                    multiple
                    className="hidden"
                  />

                  <Button
                    onClick={handleSendMessage}
                    disabled={sending || !canSendMessages || (!messageText.trim() && selectedFiles.length === 0)}
                    size="icon"
                    className="h-11 w-11 rounded-2xl bg-saBlue hover:bg-saBlue/90 text-white shadow-md shadow-saBlue/20"
                  >
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>

                {!canSendMessages && (
                  <p className="text-xs text-red-500 mt-2 font-medium">
                    {canSendReason || 'You can no longer send messages in this chat.'}
                  </p>
                )}
              </div>
            </CardContent>
          </>
        ) : (
          <CardContent className="flex-1 flex items-center justify-center bg-slate-50/50">
            <div className="text-center p-6 space-y-3">
              <div className="w-16 h-16 rounded-3xl bg-blue-50 text-saBlue flex items-center justify-center mx-auto shadow-inner">
                <MessageCircle className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Select a Conversation</h3>
              <p className="text-slate-500 text-sm max-w-xs mx-auto">
                Choose a conversation from the list to start messaging or view chat history.
              </p>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Right Sidebar - Contacts */}
      {showContacts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-md h-[80vh] flex flex-col shadow-2xl rounded-3xl border-slate-200 overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between py-4 px-6 border-b border-slate-100 bg-slate-50">
              <CardTitle className="text-base font-bold text-slate-800">
                Select {user?.role === 'STUDENT' ? 'Teacher' : 'Student'} to Chat
              </CardTitle>
              <Button size="icon" variant="ghost" onClick={handleBackFromContacts} className="rounded-xl">
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <div className="p-4 border-b border-slate-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search contacts..."
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                  className="pl-9 h-10 rounded-xl border-slate-200"
                />
              </div>
            </div>
            <CardContent className="flex-1 overflow-hidden p-0">
              <ScrollArea className="h-full">
                {loadingContacts ? (
                  <div className="flex justify-center p-8">
                    <Loader2 className="animate-spin text-saBlue w-6 h-6" />
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 p-2">
                    {user?.role === 'STUDENT' ? (
                      filteredTeachers.map((teacher) => (
                        <div
                          key={teacher.id}
                          className="p-3 hover:bg-slate-50 rounded-2xl transition-colors flex items-center justify-between cursor-pointer"
                          onClick={() => startNewChat(teacher.user.id)}
                        >
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-10 w-10 border border-slate-200">
                              <AvatarFallback className="bg-saBlue/10 text-saBlue font-bold">
                                {teacher.user.name[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-bold text-sm text-slate-800">{teacher.user.name}</p>
                              <p className="text-xs text-slate-400">{teacher.user.email}</p>
                            </div>
                          </div>
                          <Button size="sm" variant="ghost" className="rounded-xl text-saBlue hover:bg-saBlue/10">
                            <MessageCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      ))
                    ) : (
                      filteredStudents.map((student) => (
                        <div
                          key={student.id}
                          className="p-3 hover:bg-slate-50 rounded-2xl transition-colors flex items-center justify-between cursor-pointer"
                          onClick={() => startNewChat(student.user.id)}
                        >
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-10 w-10 border border-slate-200">
                              <AvatarFallback className="bg-emerald-50 text-emerald-600 font-bold">
                                {student.user.name[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-bold text-sm text-slate-800">{student.user.name}</p>
                              <p className="text-xs text-slate-400">{student.user.email}</p>
                            </div>
                          </div>
                          <Button size="sm" variant="ghost" className="rounded-xl text-saBlue hover:bg-saBlue/10">
                            <MessageCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      ))
                    )}
                    {((user?.role === 'STUDENT' && filteredTeachers.length === 0) ||
                      (user?.role !== 'STUDENT' && filteredStudents.length === 0)) && (
                      <div className="p-8 text-center text-slate-400 text-sm font-medium">No contacts found</div>
                    )}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Delete Message Confirmation Modal */}
      <DeleteConfirmationModal
        open={deletingMessageId !== null}
        title="Delete Message"
        message="Are you sure you want to delete this message? It will be removed for all participants."
        confirmText={isDeleting ? "Deleting..." : "Delete"}
        onClose={() => !isDeleting && setDeletingMessageId(null)}
        onCancel={() => !isDeleting && setDeletingMessageId(null)}
        onConfirm={handleDeleteMessage}
      />
    </div>
  );
};

export default ChatsPageNew;
