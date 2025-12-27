import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MessageSquare, Users, Calendar, ArrowRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { chatService } from "@/services/api";
import type { Chat, User } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/* ---------------------------
   Custom StatsCard (Lite)
---------------------------- */
interface StatsCardLiteProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color?: string;
  bgColor?: string;
  accentColor?: string;
}

function StatsCardLite({
  title,
  value,
  icon: Icon,
  color = "text-[#0276D3]",
  bgColor = "bg-white",
  accentColor = "border-[#0276D3]",
}: StatsCardLiteProps) {
  return (
    <div
      className={`flex flex-col p-6 rounded-2xl shadow-md border-l-4 ${accentColor} ${bgColor}`}
    >
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-gray-600 text-sm">{title}</h4>
        <div className="p-2 rounded-full bg-gray-100">
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

/* ---------------------------
   Admin Chats Page
---------------------------- */
export default function AdminChatsPage() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [filteredChats, setFilteredChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetchAllChats();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredChats(chats);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = chats.filter((chat) => {
        const participantMatch = chat.participants.some(
          (p) =>
            p.user.name.toLowerCase().includes(query) ||
            p.user.email.toLowerCase().includes(query)
        );
        const messageMatch = chat.messages?.[0]?.content
          ?.toLowerCase()
          .includes(query);
        return participantMatch || messageMatch;
      });
      setFilteredChats(filtered);
    }
  }, [searchQuery, chats]);

  const fetchAllChats = async () => {
    try {
      setLoading(true);
      const response = await chatService.getAllChats();
      setChats(response.data);
      setFilteredChats(response.data);
    } catch (error) {
      console.error("Error fetching chats:", error);
    } finally {
      setLoading(false);
    }
  };

  const getParticipantRoles = (
    chat: Chat
  ): { students: User[]; teachers: User[] } => {
    const students = chat.participants
      .filter((p) => p.user.role === "STUDENT")
      .map((p) => p.user);
    const teachers = chat.participants
      .filter((p) => p.user.role === "TEACHER")
      .map((p) => p.user);
    return { students, teachers };
  };

  // "Time ago" helper function
  const formatTimeAgo = (date: string | Date) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) > 1 ? 's' : ''} ago`;
    return `${Math.floor(diffDays / 365)} year${Math.floor(diffDays / 365) > 1 ? 's' : ''} ago`;
  };

  const activeTodayCount = chats.filter((chat) => {
    const lastMessage = chat.messages?.[0];
    if (!lastMessage) return false;
    const messageDate = new Date(lastMessage.created_at);
    return messageDate.toDateString() === new Date().toDateString();
  }).length;

  const totalMessages = chats.reduce(
    (sum, chat) => sum + (chat._count?.messages || 0),
    0
  );

  return (
    <div>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-600">All Chats</h1>
          <p className="text-gray-400 mt-1 text-sm sm:text-base">
            Monitor all conversations between students and teachers
          </p>
        </div>
      </div>

      {/* Search */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <Input
            placeholder="Search chats by participant name, email, or message content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1"
          />
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <StatsCardLite title="Total Chats" value={chats.length} icon={MessageSquare} />
        <StatsCardLite title="Active Today" value={activeTodayCount} icon={Calendar} />
        <StatsCardLite title="Total Messages" value={totalMessages} icon={Users} />
      </div>

      {/* Chats List */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading chats...</div>
      ) : filteredChats.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <MessageSquare className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">
              {searchQuery ? "No chats found matching your search" : "No chats found"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredChats.map((chat) => {
            const { students, teachers } = getParticipantRoles(chat);
            const lastMessage = chat.messages?.[0];
            const timeAgo = lastMessage ? formatTimeAgo(lastMessage.created_at) : "";

            return (
              <Card
                key={chat.id}
                className="hover:shadow-xl transition-shadow cursor-pointer rounded-2xl flex flex-col overflow-hidden"
                onClick={() => navigate(`/dashboard/chats?chatId=${chat.id}`)}
              >

{/* Header */}
<div className="bg-saBlueLight/60 p-4 sm:p-5 flex justify-between items-center text-gray-700 font-semibold">
  <span>Chat #{chat.id}</span>
  <span>{timeAgo}</span>
</div>


                {/* Body */}
                <CardContent className="flex flex-col p-4 sm:p-5 gap-3 bg-gray-100 flex-1">
                  {/* Participants */}
                  <div className="text-gray-700 text-sm">
                    {students.length > 0 && <>Student: {students.map(s => s.name).join(", ")}<br /></>}
                    {teachers.length > 0 && <>Teacher: {teachers.map(t => t.name).join(", ")}</>}
                  </div>

                  {/* Last Message Preview */}
                  {lastMessage && (
                    <p className="text-gray-600 text-sm line-clamp-2 flex-1 mt-2">
                      <span className="block mb-1">Last Message : </span>
                      <span className="font-medium text-gray-700">{lastMessage.sender.name}:</span>{" "}
                      {lastMessage.content || `[${lastMessage.message_type}]`}
                    </p>
                  )}

                  {/* Footer: Messages Count + Arrow */}
                  <div className="flex items-center justify-between mt-2 text-gray-700 text-sm">
                    <span>{chat._count?.messages || 0} messages</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-saBlue hover:text-saBlueDarkHover"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/dashboard/chats?chatId=${chat.id}`);
                      }}
                    >
                      <ArrowRight className="w-5 h-5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
