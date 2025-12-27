import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { chatService } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import type { Chat } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Users } from 'lucide-react';

const ChatsPage = () => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    loadChats();
  }, []);

  const loadChats = async () => {
    try {
      const response = await chatService.getUserChats();
      setChats(response.data);
    } catch (error) {
      console.error('Error loading chats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getChatDisplayName = (chat: Chat) => {
    const otherParticipants = chat.participants.filter(p => p.user_id !== user?.id);
    if (otherParticipants.length === 1) {
      return otherParticipants[0].user.name;
    }
    return `Group Chat (${otherParticipants.length} members)`;
  };

  const getChatAvatar = (chat: Chat) => {
    const otherParticipants = chat.participants.filter(p => p.user_id !== user?.id);
    if (otherParticipants.length === 1) {
      return otherParticipants[0].user.name.charAt(0).toUpperCase();
    }
    return <Users className="h-4 w-4" />;
  };

  const getLastMessage = (chat: Chat) => {
    if (chat.messages.length === 0) return 'No messages yet';
    
    const lastMessage = chat.messages[0];
    const senderName = lastMessage.sender_id === user?.id ? 'You' : lastMessage.sender.name;
    
    if (lastMessage.message_type === 'TEXT') {
      return `${senderName}: ${lastMessage.content}`;
    } else {
      return `${senderName}: Sent a ${lastMessage.message_type.toLowerCase()}`;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading chats...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Chats</h1>
          <p className="text-muted-foreground">Communicate with teachers and peers</p>
        </div>
        <Button onClick={() => navigate('/dashboard/chats/new')}>
          <MessageCircle className="h-4 w-4 mr-2" />
          Start New Chat
        </Button>
      </div>

      {chats.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No chats yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Start a conversation with your teachers or classmates
            </p>
            <Button onClick={() => navigate('/dashboard/chats/new')}>
              Start Your First Chat
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {chats.map((chat) => (
            <Card 
              key={chat.id} 
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(`/dashboard/chats/${chat.id}`)}
            >
              <CardContent className="p-4">
                <div className="flex items-center space-x-4">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback>
                      {getChatAvatar(chat)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold truncate">
                        {getChatDisplayName(chat)}
                      </h3>
                      <span className="text-sm text-muted-foreground">
                        {new Date(chat.updated_at).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <p className="text-sm text-muted-foreground truncate mt-1">
                      {getLastMessage(chat)}
                    </p>
                    
                    <div className="flex items-center mt-2">
                      <Badge variant="secondary" className="text-xs">
                        {chat._count.messages} messages
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ChatsPage;