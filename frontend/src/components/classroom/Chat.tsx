/**
 * Chat Component
 * 
 * Chat panel for the classroom.
 */

import React, { useState, useRef, useEffect } from 'react';
import { Send, X, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ChatMessage } from '@/types/videoRoom';

interface ChatProps {
    isOpen: boolean;
    onClose: () => void;
    messages: ChatMessage[];
    onSendMessage: (text: string) => void;
    currentUserName: string;
}

export function Chat({
    isOpen,
    onClose,
    messages,
    onSendMessage,
    currentUserName,
}: ChatProps) {
    const [inputText, setInputText] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = () => {
        if (inputText.trim()) {
            onSendMessage(inputText.trim());
            setInputText('');
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="absolute inset-0 z-[60] md:z-50 md:inset-auto md:right-4 md:bottom-20 md:w-80 md:h-96 bg-white md:rounded-2xl shadow-2xl border-l md:border border-slate-200 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-sky-500 to-indigo-500 text-white p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    <h3 className="font-semibold">Chat</h3>
                </div>
                <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-white hover:bg-white/20"
                    onClick={onClose}
                >
                    <X className="w-4 h-4" />
                </Button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
                {messages.length === 0 ? (
                    <div className="text-center text-slate-400 mt-8">
                        <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No messages yet</p>
                        <p className="text-xs">Start the conversation!</p>
                    </div>
                ) : (
                    messages.map((msg) => {
                        const isOwn = msg.sender === currentUserName;
                        return (
                            <div
                                key={msg.id}
                                className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}
                            >
                                <div
                                    className={`max-w-[80%] rounded-2xl px-4 py-2 shadow-sm ${isOwn
                                        ? 'bg-sky-500 text-white rounded-br-sm'
                                        : 'bg-white text-slate-900 rounded-bl-sm border border-slate-200'
                                        }`}
                                >
                                    {!isOwn && (
                                        <p className="text-xs font-semibold mb-1 text-sky-600">
                                            {msg.sender}
                                        </p>
                                    )}
                                    <p className="text-sm break-words">{msg.text}</p>
                                </div>
                                <span className="text-xs text-slate-400 mt-1 px-2">
                                    {new Date(msg.timestamp).toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })}
                                </span>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 bg-white border-t border-slate-200">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Type a message..."
                        className="flex-1 px-4 py-2 rounded-full border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm"
                    />
                    <Button
                        size="icon"
                        onClick={handleSend}
                        disabled={!inputText.trim()}
                        className="rounded-full bg-sky-500 hover:bg-sky-600 h-10 w-10"
                    >
                        <Send className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
