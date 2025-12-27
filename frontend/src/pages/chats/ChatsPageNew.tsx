import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { chatService, teacherService, studentService } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import type { Chat, Message, Teacher, Student, ChatMessagesResponse, MessageType } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, Search, Send, Paperclip, File, Image, Video, FileText, X, UserPlus, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const ChatsPageNew = () => {
  const { chatId: chatIdParam } = useParams<{ chatId?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const chatId = chatIdParam || searchParams.get('chatId');

  const [chats, setChats] = useState<Chat[]>([]);
  const [loadingChats, setLoadingChats] = useState(true);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);

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

  useEffect(() => {
    const load = async () => {
      await loadChats();
      if (user?.role !== 'ADMIN') {
        await loadContacts();
      }
    };
    load();
  }, [user?.role]);

  useEffect(() => {
    if (chatId && !loadingChats) {
      const run = async () => {
        const chat = chats.find(c => c.id === parseInt(chatId));
        if (chat) {
          await selectChat(chat);
        } else if (user?.role === 'ADMIN') {
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
      const response = await chatService.getUserChats();
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
    setSelectedChat({
      id: chatIdParam,
      participants: [],
      messages: [],
      _count: { messages: 0 },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as Chat);

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

  const loadContacts = async () => {
    setLoadingContacts(true);
    try {
      if (user?.role === 'STUDENT') {
        const teachersResponse = await teacherService.getAll({ limit: 1000 });
        setTeachers(Array.isArray(teachersResponse.data.data) ? teachersResponse.data.data : []);
      } else if (user?.role === 'TEACHER') {
        const studentsResponse = await studentService.getAll({ limit: 1000 });
        setStudents(Array.isArray(studentsResponse.data.data) ? studentsResponse.data.data : []);
      }
    } catch (error: unknown) {
      console.error('Error loading contacts:', error instanceof Error ? error.message : error);
      toast.error('Failed to load contacts');
    } finally {
      setLoadingContacts(false);
    }
  };
  const selectChat = async (chat: Chat) => {
    setSelectedChat(chat);
    setShowContacts(false);

    if (isMobile || isTablet) {
      setViewMode('messages');
    }

    navigate(`/dashboard/chats/${chat.id}`, { replace: !(isMobile || isTablet) });
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

      await chatService.sendMessage(selectedChat.id, messageData, selectedFile || undefined);

      setMessageText('');
      setSelectedFile(null);
      await loadMessages(selectedChat.id);
      toast.success('Message sent');
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

  const cardHeight = isMobile || isTablet ? 'h-full' : 'h-full';
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
          "flex flex-col",
          "lg:w-80",
          (isMobile || isTablet) && viewMode !== 'chats' ? "hidden" : "flex",
          "w-full md:w-full lg:w-80",
          cardHeight
        )}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl text-gray-600">Chats</CardTitle>
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
          </div>
        </CardHeader>

        <CardContent className="flex-1 p-0 overflow-hidden">
          <ScrollArea className="h-full">
            {loadingChats ? (
              <div className="p-4 text-center text-muted-foreground">Loading...</div>
            ) : chats.length === 0 ? (
              <div className="p-4 text-center">
                <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No chats yet</p>
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
              </div>
            ) : (
              <div className="divide-y">
                {chats.map((chat) => (
                  <div
                    key={chat.id}
                    className={`p-3 cursor-pointer hover:bg-muted transition-colors ${
                      selectedChat?.id === chat.id ? 'bg-muted' : ''
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
          "flex flex-col",
          "lg:flex-1",
          "w-full md:w-full lg:flex-1",
          cardHeight
        )}
      >
        {selectedChat ? (
          <>
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center space-x-3">
                {(isMobile || isTablet) && (
                  <Button variant="ghost" size="icon" onClick={handleBackToChats}>
                    <ChevronLeft className="h-4 w-4" />
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
                    {selectedChat.participants.length} participants
                  </p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="flex-1 p-4 overflow-hidden flex flex-col">
              <ScrollArea className="flex-1 pr-4">
                {loadingMessages ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading messages...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No messages yet. Start the conversation!
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${
                          message.sender_id === user?.id ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <div
                          className={`flex space-x-2 max-w-[70%] ${
                            message.sender_id === user?.id
                              ? 'flex-row-reverse space-x-reverse'
                              : ''
                          }`}
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {message.sender.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>

                          <div
                            className={`rounded-lg p-3 ${
                              message.sender_id === user?.id
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            }`}
                          >
                            {message.sender_id !== user?.id && (
                              <div className="text-xs font-medium mb-1">
                                {message.sender.name}
                              </div>
                            )}

                            {message.content && (
                              <div className="text-sm mb-2">{message.content}</div>
                            )}

                            {message.attachment_url && (
                              <div className="mb-2">
                                {message.message_type === 'IMAGE' ? (
                                  <img
                                    src={message.attachment_url}
                                    alt="Attachment"
                                    className="max-w-full h-auto rounded cursor-pointer"
                                    onClick={() =>
                                      window.open(message.attachment_url!, '_blank')
                                    }
                                  />
                                ) : (
                                  <div
                                    className="flex items-center space-x-2 p-2 bg-background rounded cursor-pointer hover:bg-muted/50"
                                    onClick={() =>
                                      window.open(message.attachment_url!, '_blank')
                                    }
                                  >
                                    {getFileIcon(message.message_type)}
                                    <span className="text-sm truncate">
                                      {message.attachment_url.split('/').pop()}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}

                            <div className="text-xs opacity-70">
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

              <div className="mt-4 space-y-2">
                {selectedFile && (
                  <div className="flex items-center justify-between p-2 bg-muted rounded">
                    <div className="flex items-center space-x-2">
                      {getFileIcon(getMessageType(selectedFile))}
                      <span className="text-sm truncate">{selectedFile.name}</span>
                    </div>

                    <Button variant="ghost" size="sm" onClick={() => setSelectedFile(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                <div className="flex space-x-2">
                  <Input
                    placeholder="Type a message..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                    disabled={sending}
                  />

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept="image/*,video/*,.pdf,.doc,.docx,.txt"
                    className="hidden"
                  />

                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={sending}
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>

                  <Button
                    onClick={handleSendMessage}
                    disabled={sending || (!messageText.trim() && !selectedFile)}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </>
        ) : (
          <CardContent className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl text-gray-600 mb-2">Select a chat</h3>
              <p className="text-muted-foreground">
                Choose a conversation from the left or start a new one
              </p>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Right Sidebar - Contacts */}
      {showContacts && (
        <>
          {(isMobile || isTablet) && (
            <div
              className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm top-16"
              onClick={handleBackFromContacts}
            />
          )}

          <Card
            className={cn(
              "flex flex-col",
              "lg:w-80",
              isMobile || isTablet
                ? "fixed inset-y-16 right-0 z-50 w-[80%] animate-in slide-in-from-right"
                : "relative w-full md:w-full lg:w-80",
              cardHeight
            )}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  {user?.role === 'STUDENT' ? 'Teachers' : 'Students'}
                </CardTitle>

                <Button size="sm" variant="ghost" onClick={handleBackFromContacts}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="mt-2">
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
            </CardHeader>

            <CardContent className="flex-1 p-0 overflow-hidden">
              <ScrollArea className="h-full">
                {loadingContacts ? (
                  <div className="p-4 text-center text-muted-foreground">Loading...</div>
                ) : user?.role === 'STUDENT' ? (
                  <div className="divide-y">
                    {filteredTeachers.length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground text-sm">
                        No teachers found
                      </div>
                    ) : (
                      filteredTeachers.map((teacher) => (
                        <div key={teacher.id} className="p-3 hover:bg-muted transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <Avatar className="h-10 w-10">
                                <AvatarFallback>
                                  {teacher.user.name.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>

                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{teacher.user.name}</p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {teacher.user.email}
                                </p>
                                {teacher.qualification && (
                                  <p className="text-xs text-muted-foreground truncate">
                                    {teacher.qualification}
                                  </p>
                                )}
                              </div>
                            </div>

                            <Button
                              size="sm"
                              onClick={() => startNewChat(teacher.user.id)}
                              disabled={startingChat}
                            >
                              <MessageCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredStudents.length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground text-sm">
                        No students found
                      </div>
                    ) : (
                      filteredStudents.map((student) => (
                        <div key={student.id} className="p-3 hover:bg-muted transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <Avatar className="h-10 w-10">
                                <AvatarFallback>
                                  {student.user.name.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>

                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{student.user.name}</p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {student.user.email}
                                </p>

                                {student.class && (
                                  <Badge variant="secondary" className="text-xs mt-1">
                                    {student.class.name}
                                  </Badge>
                                )}
                              </div>
                            </div>

                            <Button
                              size="sm"
                              onClick={() => startNewChat(student.user.id)}
                              disabled={startingChat}
                            >
                              <MessageCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default ChatsPageNew;
