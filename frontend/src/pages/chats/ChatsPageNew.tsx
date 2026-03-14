import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { chatService, teacherService, studentService } from '@/services/api';
import { socketService } from '@/services/socket';
import { useAuthStore } from '@/store/authStore';
import type { Chat, Message, Teacher, Student, ChatMessagesResponse, MessageType } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, Search, Send, Paperclip, File, Image, Video, FileText, X, UserPlus, ChevronLeft, Loader2 } from 'lucide-react';
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

  // Ref for selectedChat to access in socket callbacks
  const selectedChatRef = useRef<Chat | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);

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
      // On desktop, we always show lists, so viewMode doesn't restrict visibility as hard
      // but on resize we might want to reset
      if (width >= 1024) {
        setViewMode('chats');
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  useEffect(() => {
    // If on mobile/tablet, switch view based on state
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
      // Update messages if looking at this chat
      if (selectedChatRef.current?.id === message.chat_id) {
        setMessages(prev => [...prev, message]);
      }

      // Update last message in sidebar
      setChats(prevChats => {
        const updated = prevChats.map(c => {
          if (c.id === message.chat_id) {
            return {
              ...c,
              messages: [message],
              updated_at: message.created_at
            };
          }
          return c;
        });
        return updated.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      });
    };

    socket?.on('receive_message', handleReceiveMessage);

    return () => {
      socket?.off('receive_message', handleReceiveMessage);
      // Do not disconnect socketService globally here as it might be used elsewhere, 
      // but for this implementation we can leave it connected. 
      // Or disconnect if we want to save resources.
      // socketService.disconnect();
    };
  }, []);

  useEffect(() => {
    const load = async () => {
      await loadChats();
      if (user?.role !== 'ADMIN') {
        await loadContacts();
      }
    };
    load();
  }, [user?.role]);

  // Join/Leave rooms based on chats list (for notifications) and selected chat
  useEffect(() => {
    // Join all chat rooms to receive updates/notifications in sidebar
    chats.forEach(chat => socketService.joinChat(chat.id));

    return () => {
      // Ideally we leave when component unmounts or chats change widely
      // chats.forEach(chat => socketService.leaveChat(chat.id));
    };
  }, [chats]);

  useEffect(() => {
    if (chatId && !loadingChats) {
      const run = async () => {
        const chat = chats.find(c => c.id === parseInt(chatId));
        if (chat) {
          await selectChat(chat, false); // Don't double navigate
        } else if (user?.role === 'ADMIN') {
          // If admin and chat not in list (shouldn't happen if using getAllChats, but safe fallback)
          await loadMessagesDirectly(parseInt(chatId));
        }
      };
      run();
    }
  }, [chatId, chats, loadingChats, user?.role]);

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

  const loadChats = async () => {
    try {
      setLoadingChats(true);
      // Admin gets ALL chats, others get their chats
      let response;
      if (user?.role === 'ADMIN') {
        response = await chatService.getAllChats();
      } else {
        response = await chatService.getUserChats();
      }
      setChats(response.data);
    } catch (error: unknown) {
      console.error('Error loading chats:', error instanceof Error ? error.message : error);
      toast.error('Failed to load chats');
    } finally {
      setLoadingChats(false);
    }
  };

  const loadMessagesDirectly = async (chatIdParam: number) => {
    setLoadingMessages(true);
    // Create detailed placeholder
    const chatPlaceholder = {
      id: chatIdParam,
      participants: [],
      messages: [],
      _count: { messages: 0 },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as Chat;

    setSelectedChat(chatPlaceholder);

    try {
      const response: ChatMessagesResponse = await chatService.getChatMessages(chatIdParam, { limit: 100 });
      setMessages(response.data.messages);
      // Update participants if returned
      // (The response typically doesn't include chat metadata, only messages/pagination)
      // So we might want to fetch chat details if possible.
      // But for now, we just show messages.
    } catch (error: unknown) {
      console.error('Error loading messages:', error instanceof Error ? error.message : error);
      toast.error('Failed to load messages');
    } finally {
      setLoadingMessages(false);
    }
  };

  const loadContacts = async () => {
    setLoadingContacts(true);
    try {
      if (user?.role === 'STUDENT') {
        const teachersResponse = await teacherService.getAll({
          limit: 1000,
          user_id: user.id,
          role: user.role,
        });
        setTeachers(Array.isArray(teachersResponse.data.data) ? teachersResponse.data.data : []);
      } else if (user?.role === 'TEACHER') {
        const studentsResponse = await studentService.getAll({
          limit: 1000,
          user_id: user.id,
          role: user.role,
        });
        setStudents(Array.isArray(studentsResponse.data.data) ? studentsResponse.data.data : []);
      }
    } catch (error: unknown) {
      console.error('Error loading contacts:', error instanceof Error ? error.message : error);
      // toast.error('Failed to load contacts'); // Suppress to avoid noise if not needed
    } finally {
      setLoadingContacts(false);
    }
  };

  const selectChat = async (chat: Chat, shouldNavigate = true) => {
    setSelectedChat(chat);
    setShowContacts(false);

    if (isMobile || isTablet) {
      setViewMode('messages');
    }

    // Join room explicitly (failsafe)
    socketService.joinChat(chat.id);

    if (shouldNavigate) {
      navigate(`/dashboard/chats/${chat.id}`, { replace: !(isMobile || isTablet) });
    }
    await loadMessages(chat.id);
  };

  const loadMessages = async (chatIdParam: number) => {
    setLoadingMessages(true);
    try {
      const response: ChatMessagesResponse = await chatService.getChatMessages(chatIdParam, { limit: 100 });
      setMessages(response.data.messages);
    } catch (error: unknown) {
      console.error('Error loading messages:', error instanceof Error ? error.message : error);
      toast.error('Failed to load messages');
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedChat || (!messageText.trim() && !selectedFile)) return;

    setSending(true);
    try {
      const messageData = {
        content: messageText.trim() || undefined,
        messageType: selectedFile ? getMessageType(selectedFile) : 'TEXT'
      };

      // Send via API (which emits socket event from backend)
      await chatService.sendMessage(selectedChat.id, messageData, selectedFile || undefined);

      setMessageText('');
      setSelectedFile(null);
      // We don't strictly need to reload messages if socket works, 
      // but it's a good fallback or to confirm send success.
      // Actually, if we rely on socket, we might get duplicate if we optimistically update.
      // Current logic: wait for socket event to append.
      // But we can also re-fetch to be safe.
      // Let's rely on socket event for "appearing" and re-fetch for sync.

    } catch (error: unknown) {
      console.error('Error sending message:', error instanceof Error ? error.message : error);
      toast.error('Failed to send message');
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
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 100 * 1024 * 1024) {
        toast.error('File size exceeds 100MB limit');
        return;
      }
      setSelectedFile(file);
      toast.success('File selected: ' + file.name);
    }
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
      case 'IMAGE': return <Image className="h-4 w-4" />;
      case 'VIDEO': return <Video className="h-4 w-4" />;
      case 'PDF': return <FileText className="h-4 w-4" />;
      default: return <File className="h-4 w-4" />;
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getChatDisplayName = (chat: Chat) => {
    if (!chat.participants || chat.participants.length === 0) {
      return `Chat #${chat.id}`;
    }
    const otherParticipants = chat.participants.filter(p => p.user_id !== user?.id);
    if (otherParticipants.length === 1) {
      return otherParticipants[0].user.name;
    }
    if (otherParticipants.length === 0) return "Me (Draft)"; // Self chat or bug
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

  const filteredTeachers = (teachers || []).filter(t =>
    t.user.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
    t.user.email.toLowerCase().includes(contactSearch.toLowerCase())
  );

  const filteredStudents = (students || []).filter(s =>
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

  const containerHeight =
    isMobile || isTablet ? 'h-[calc(100vh-6rem)]' : 'h-[calc(100vh-8rem)]';

  const cardHeight = 'h-full';

  return (
    <div
      className={cn(
        "flex gap-4",
        "lg:flex-row flex-col md:flex-col",
        containerHeight
      )}
    >
      {/* Left Sidebar - Chat List */}
      <Card
        className={cn(
          "flex-col",
          "lg:w-80",
          (isMobile || isTablet) && viewMode !== 'chats' ? "hidden" : "flex",
          "w-full md:w-full lg:w-80",
          cardHeight
        )}
      >
        <CardHeader className="pb-3 px-4 py-3 shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl text-gray-600">Chats</CardTitle>
            {user?.role !== 'ADMIN' && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setShowContacts(true);
                  setViewMode('contacts');
                }}
              >
                <UserPlus className="h-4 w-4 text-[#0276D3]" />
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="flex-1 p-0 overflow-hidden">
          <ScrollArea className="h-full">
            {loadingChats ? (
              <div className="flex justify-center p-4"><Loader2 className="animate-spin text-muted-foreground" /></div>
            ) : chats.length === 0 ? (
              <div className="p-4 text-center">
                <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No chats yet</p>
                {user?.role !== 'ADMIN' && (
                  <Button
                    size="sm"
                    className="mt-2"
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
              <div className="divide-y">
                {chats.map((chat) => (
                  <div
                    key={chat.id}
                    className={`p-3 cursor-pointer hover:bg-muted transition-colors ${selectedChat?.id === chat.id ? 'bg-muted' : ''
                      }`}
                    onClick={() => selectChat(chat)}
                  >
                    <div className="flex items-start space-x-3">
                      <Avatar className="h-10 w-10 mt-1">
                        <AvatarFallback>
                          {getChatDisplayName(chat).charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm truncate">
                            {getChatDisplayName(chat)}
                          </p>

                          <span className="text-xs text-muted-foreground">
                            {new Date(chat.updated_at).toLocaleDateString()}
                          </span>
                        </div>

                        <p className="text-xs text-muted-foreground truncate mt-1">
                          {getLastMessage(chat)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Center - Chat Messages */}
      <Card
        className={cn(
          "flex-col",
          "lg:flex-1",
          (isMobile || isTablet) && viewMode === 'chats' ? "hidden" : "flex",
          "w-full md:w-full lg:flex-1",
          cardHeight
        )}
      >
        {selectedChat ? (
          <>
            <CardHeader className="pb-3 border-b px-4 py-3 shrink-0">
              <div className="flex items-center space-x-3">
                {(isMobile || isTablet) && (
                  <Button variant="ghost" size="icon" onClick={handleBackToChats} className="-ml-2">
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                )}

                <Avatar>
                  <AvatarFallback>
                    {getChatDisplayName(selectedChat).charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div>
                  <CardTitle className="text-lg">{getChatDisplayName(selectedChat)}</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {selectedChat.participants?.length ?? 0} participants
                  </p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="flex-1 p-0 overflow-hidden flex flex-col relative">
              <ScrollArea className="flex-1 p-4">
                {loadingMessages ? (
                  <div className="flex justify-center p-4"><Loader2 className="animate-spin text-muted-foreground" /></div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No messages yet. Start the conversation!
                  </div>
                ) : (
                  <div className="space-y-4 pb-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.sender_id === user?.id ? 'justify-end' : 'justify-start'
                          }`}
                      >
                        <div
                          className={`flex space-x-2 max-w-[85%] md:max-w-[70%] ${message.sender_id === user?.id
                            ? 'flex-row-reverse space-x-reverse'
                            : ''
                            }`}
                        >
                          <Avatar className="h-8 w-8 shrink-0">
                            <AvatarFallback className="text-xs">
                              {message.sender?.name?.charAt(0).toUpperCase() || '?'}
                            </AvatarFallback>
                          </Avatar>

                          <div
                            className={`rounded-lg p-3 ${message.sender_id === user?.id
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                              }`}
                          >
                            {message.sender_id !== user?.id && message.sender && (
                              <div className="text-xs font-medium mb-1 opacity-70">
                                {message.sender.name}
                              </div>
                            )}

                            {message.content && (
                              <div className="text-sm mb-2 whitespace-pre-wrap">{message.content}</div>
                            )}

                            {message.attachment_url && (
                              <div className="mb-2">
                                {message.message_type === 'IMAGE' ? (
                                  <img
                                    src={message.attachment_url}
                                    alt="Attachment"
                                    className="max-w-full h-auto rounded cursor-pointer max-h-60 object-contain bg-black/10"
                                    onClick={() =>
                                      window.open(message.attachment_url!, '_blank')
                                    }
                                  />
                                ) : (
                                  <div
                                    className="flex items-center space-x-2 p-2 bg-background/50 rounded cursor-pointer hover:bg-background/80 transition-colors"
                                    onClick={() =>
                                      window.open(message.attachment_url!, '_blank')
                                    }
                                  >
                                    {getFileIcon(message.message_type)}
                                    <span className="text-sm truncate max-w-[150px]">
                                      {message.attachment_url.split('/').pop()}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}

                            <div className="text-[10px] opacity-70 text-right">
                              {formatTime(message.created_at)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>

              <div className="p-4 border-t bg-background mt-auto">
                {selectedFile && (
                  <div className="flex items-center justify-between p-2 bg-muted rounded mb-2">
                    <div className="flex items-center space-x-2 overflow-hidden">
                      {getFileIcon(getMessageType(selectedFile))}
                      <span className="text-sm truncate">{selectedFile.name}</span>
                    </div>

                    <Button variant="ghost" size="sm" onClick={() => setSelectedFile(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                <div className="flex space-x-2">
                  <div className="flex-1 relative">
                    <Input
                      placeholder="Type a message..."
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                      disabled={sending}
                      className="pr-10"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={sending}
                    >
                      <Paperclip className="h-4 w-4" />
                    </Button>
                  </div>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept="image/*,video/*,.pdf,.doc,.docx,.txt"
                    className="hidden"
                  />

                  <Button
                    onClick={handleSendMessage}
                    disabled={sending || (!messageText.trim() && !selectedFile)}
                    size="icon"
                  >
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </CardContent>
          </>
        ) : (
          <CardContent className="flex-1 flex items-center justify-center bg-gray-50/50">
            <div className="text-center p-6">
              <MessageCircle className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">Select a chat</h3>
              <p className="text-muted-foreground max-w-xs mx-auto">
                Choose a conversation from the list to start messaging
              </p>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Right Sidebar - Contacts (Overlay on mobile, shouldn't exist on desktop based on current requirement but logic handles it) */}
      {showContacts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <Card className="w-full max-w-md h-[80vh] flex flex-col shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between py-3 border-b">
              <CardTitle className="text-lg">
                Select {user?.role === 'STUDENT' ? 'Teacher' : 'Student'}
              </CardTitle>
              <Button size="icon" variant="ghost" onClick={handleBackFromContacts}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <div className="p-4 border-b">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <CardContent className="flex-1 overflow-hidden p-0">
              <ScrollArea className="h-full">
                {/* Contacts List Logic */}
                {loadingContacts ? (
                  <div className="flex justify-center p-8"><Loader2 className="animate-spin text-muted-foreground" /></div>
                ) : (
                  <div className="divide-y">
                    {user?.role === 'STUDENT' ? (
                      filteredTeachers.map(teacher => (
                        <div key={teacher.id} className="p-3 hover:bg-muted transition-colors flex items-center justify-between cursor-pointer" onClick={() => startNewChat(teacher.user.id)}>
                          <div className="flex items-center space-x-3">
                            <Avatar>
                              <AvatarFallback>{teacher.user.name[0]}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-sm">{teacher.user.name}</p>
                              <p className="text-xs text-muted-foreground">{teacher.user.email}</p>
                            </div>
                          </div>
                          <Button size="sm" variant="ghost"><MessageCircle className="h-4 w-4" /></Button>
                        </div>
                      ))
                    ) : (
                      filteredStudents.map(student => (
                        <div key={student.id} className="p-3 hover:bg-muted transition-colors flex items-center justify-between cursor-pointer" onClick={() => startNewChat(student.user.id)}>
                          <div className="flex items-center space-x-3">
                            <Avatar>
                              <AvatarFallback>{student.user.name[0]}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-sm">{student.user.name}</p>
                              <p className="text-xs text-muted-foreground">{student.user.email}</p>
                            </div>
                          </div>
                          <Button size="sm" variant="ghost"><MessageCircle className="h-4 w-4" /></Button>
                        </div>
                      ))
                    )}
                    {((user?.role === 'STUDENT' && filteredTeachers.length === 0) || (user?.role !== 'STUDENT' && filteredStudents.length === 0)) && (
                      <div className="p-8 text-center text-muted-foreground">No contacts found</div>
                    )}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ChatsPageNew;
