import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { chatService } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import type { Message, ChatMessagesResponse, MessageType } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Paperclip, Send, File, Image, Video, FileText } from 'lucide-react';
import { toast } from 'sonner';

const ChatPage = () => {
  const { chatId } = useParams<{ chatId: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0,
  });
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Validate chatId
    if (!chatId || isNaN(parseInt(chatId))) {
      setError('Invalid chat ID');
      setLoading(false);
      return;
    }
    
    loadMessages();
  }, [chatId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async (page = 1) => {
    if (!chatId || isNaN(parseInt(chatId))) {
      setError('Invalid chat ID');
      setLoading(false);
      return;
    }
    
    try {
      setError(null);
      const response: ChatMessagesResponse = await chatService.getChatMessages(
        parseInt(chatId), 
        { page, limit: pagination.limit }
      );
      
      if (page === 1) {
        setMessages(response.data.messages);
      } else {
        setMessages(prev => [...response.data.messages, ...prev]);
      }
      
      setPagination(response.data.pagination);
    } catch (error: any) {
      console.error('Error loading messages:', error);
      setError(error.response?.data?.message || 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!chatId || (!messageText.trim() && !selectedFile)) return;

    setSending(true);
    try {
      const messageData = {
        content: messageText.trim() || undefined,
        messageType: selectedFile ? getMessageType(selectedFile) : 'TEXT',
      };

      await chatService.sendMessage(parseInt(chatId), messageData, selectedFile || undefined);
      
      setMessageText('');
      setSelectedFile(null);
      await loadMessages(1); // Reload messages to show the new one
      toast.success('Message sent successfully');
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error(error.response?.data?.message || 'Failed to send message');
    } finally {
      setSending(false);
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

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file size (100MB limit)
      const maxSize = 100 * 1024 * 1024; // 100MB
      if (file.size > maxSize) {
        toast.error('File size exceeds 100MB limit');
        return;
      }
      setSelectedFile(file);
      toast.success('File selected: ' + file.name);
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="text-lg text-destructive">{error}</div>
        <Button onClick={() => navigate('/dashboard/chats')}>Back to Chats</Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading chat...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)]">
      {/* Header */}
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">Chat</CardTitle>
            <Button variant="outline" onClick={() => navigate('/dashboard/chats')}>
              Back to Chats
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Messages */}
      <Card className="flex-1 flex flex-col">
        <CardContent className="flex-1 flex flex-col p-0">
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-4">
              {messages.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No messages yet. Start the conversation!
                </div>
              ) : (
                messages.map((message) => (
                  <div 
                    key={message.id} 
                    className={`flex ${message.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex space-x-2 max-w-[70%] ${message.sender_id === user?.id ? 'flex-row-reverse space-x-reverse' : ''}`}>
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {message.sender.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className={`rounded-lg p-3 ${
                        message.sender_id === user?.id 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted'
                      }`}>
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
                                onClick={() => window.open(message.attachment_url!, '_blank')}
                              />
                            ) : (
                              <div 
                                className="flex items-center space-x-2 p-2 bg-background rounded cursor-pointer hover:bg-muted/50"
                                onClick={() => window.open(message.attachment_url!, '_blank')}
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
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Message Input */}
          <div className="border-t p-4">
            {selectedFile && (
              <div className="mb-2 p-2 bg-muted rounded flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {getFileIcon(getMessageType(selectedFile))}
                  <span className="text-sm truncate">{selectedFile.name}</span>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setSelectedFile(null)}
                >
                  ×
                </Button>
              </div>
            )}
            
            <div className="flex space-x-2">
              <Input
                placeholder="Type a message..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
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
      </Card>
    </div>
  );
};

export default ChatPage;