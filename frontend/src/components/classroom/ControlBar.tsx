/**
 * ControlBar Component
 * 
 * Bottom control bar for classroom with mic, camera, screen share, hand raise, reactions, etc.
 */

import React, { useState, useRef, useEffect } from 'react';
import {
    Mic,
    MicOff,
    Video,
    VideoOff,
    Monitor,
    MonitorOff,
    PhoneOff,
    PenTool,
    PersonStanding,
    Hand,
    Smile,
    Volume2,
    VolumeX,
    Headphones,
    Check,
    X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AudioOutputDevice } from '@/hooks/useAudioOutput';

const EMOJI_LIST = ['💖', '👍', '🎉', '👏', '😂', '😮', '😢', '🤔', '👎'];

interface ControlBarProps {
    isMuted: boolean;
    isVideoOff: boolean;
    isAudioClosed?: boolean;
    selectedAudioDeviceId?: string;
    audioDevices?: AudioOutputDevice[];
    audioOutputMode?: 'speaker' | 'earpiece' | 'custom';
    isScreenSharing: boolean;
    isWhiteboardActive: boolean;
    isHandRaised: boolean;
    isBackgroundActive: boolean;
    isConnected: boolean;
    onToggleMic: () => void;
    onToggleCamera: () => void;
    onToggleAudioClosed?: () => void;
    onSelectAudioDevice?: (deviceId: string) => void;
    onSwitchToSpeaker?: () => void;
    onSwitchToEarpiece?: () => void;
    onOpenSystemAudioPicker?: () => void;
    onToggleScreenShare: () => void;
    onToggleWhiteboard: () => void;
    onToggleHandRaise: () => void;
    onSendReaction: (emoji: string) => void;
    onToggleBackground: () => void;
    onLeave: () => void;
}

export function ControlBar({
    isMuted,
    isVideoOff,
    isAudioClosed = false,
    selectedAudioDeviceId = 'default',
    audioDevices = [],
    audioOutputMode = 'speaker',
    isScreenSharing,
    isWhiteboardActive,
    isHandRaised,
    isBackgroundActive,
    isConnected,
    onToggleMic,
    onToggleCamera,
    onToggleAudioClosed,
    onSelectAudioDevice,
    onSwitchToSpeaker,
    onSwitchToEarpiece,
    onOpenSystemAudioPicker,
    onToggleScreenShare,
    onToggleWhiteboard,
    onToggleHandRaise,
    onSendReaction,
    onToggleBackground,
    onLeave,
}: ControlBarProps) {
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showSoundMenu, setShowSoundMenu] = useState(false);
    const soundMenuRef = useRef<HTMLDivElement>(null);

    // Close sound menu on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (soundMenuRef.current && !soundMenuRef.current.contains(e.target as Node)) {
                setShowSoundMenu(false);
            }
        };
        if (showSoundMenu) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [showSoundMenu]);

    const handleReactionClick = (emoji: string) => {
        onSendReaction(emoji);
        setShowEmojiPicker(false);
    };

    return (
        <div className="relative flex flex-col items-center">
            {/* Horizontal Floating Emoji Reactions Bar (matching user's uploaded screenshot 1) */}
            {showEmojiPicker && (
                <div className="absolute -top-16 mb-2 flex items-center gap-1.5 px-3 py-2 rounded-full bg-slate-900/90 backdrop-blur-xl border border-white/20 shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-3 duration-200">
                    {EMOJI_LIST.map((emoji) => (
                        <button
                            key={emoji}
                            onClick={() => handleReactionClick(emoji)}
                            className="p-1.5 text-2xl hover:scale-130 transition-transform duration-150 active:scale-95 rounded-full hover:bg-white/20"
                            title={`Send ${emoji}`}
                        >
                            {emoji}
                        </button>
                    ))}
                </div>
            )}

            {/* Floating Audio Output & Sound Control Menu */}
            {showSoundMenu && (
                <div
                    ref={soundMenuRef}
                    className="absolute -top-[270px] mb-3 p-4 rounded-3xl bg-white/98 text-slate-800 backdrop-blur-2xl border border-slate-200 shadow-2xl z-50 w-76 sm:w-84 animate-in fade-in slide-in-from-bottom-3 duration-200"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-sky-50 text-saBlue">
                                <Volume2 className="w-4 h-4" />
                            </div>
                            <span className="text-sm font-extrabold text-slate-800 tracking-tight">Sound & Speaker</span>
                        </div>
                        <button
                            onClick={() => setShowSoundMenu(false)}
                            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Master Sound Toggle (Close Sound / Open Sound) */}
                    <div className="mb-3.5">
                        <button
                            onClick={() => {
                                onToggleAudioClosed?.();
                            }}
                            className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl font-bold text-xs transition-all shadow-xs border ${
                                isAudioClosed
                                    ? 'bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-600 shadow-emerald-500/20 shadow-md'
                                    : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200 hover:border-rose-300'
                            }`}
                        >
                            <div className="flex items-center gap-2.5">
                                {isAudioClosed ? (
                                    <Volume2 className="w-4 h-4 text-white" />
                                ) : (
                                    <VolumeX className="w-4 h-4 text-rose-500" />
                                )}
                                <span>{isAudioClosed ? 'Open Sound (Unmute Audio)' : 'Close Sound (Mute Incoming)'}</span>
                            </div>
                            <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider ${
                                isAudioClosed ? 'bg-white/25 text-white' : 'bg-rose-200/80 text-rose-800'
                            }`}>
                                {isAudioClosed ? 'Muted' : 'Active'}
                            </span>
                        </button>
                    </div>

                    {/* Audio Output Route Options */}
                    <div>
                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-1 flex items-center justify-between">
                            <span>Audio Output Route</span>
                            <span className="text-saBlue font-bold normal-case flex items-center gap-1 text-xs">
                                {audioOutputMode === 'earpiece' ? (
                                    <><Headphones className="w-3.5 h-3.5" /> Earpiece</>
                                ) : (
                                    <><Volume2 className="w-3.5 h-3.5" /> Speaker</>
                                )}
                            </span>
                        </div>

                        <div className="space-y-1.5">
                            {/* Preset 1: Speaker */}
                            <button
                                onClick={() => {
                                    onSwitchToSpeaker?.();
                                    setShowSoundMenu(false);
                                }}
                                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all border ${
                                    audioOutputMode === 'speaker' || selectedAudioDeviceId === 'default'
                                        ? 'bg-sky-50 text-saBlue border-sky-300 shadow-xs'
                                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                                }`}
                            >
                                <div className="flex items-center gap-2.5 truncate">
                                    <div className={`p-1.5 rounded-lg ${audioOutputMode === 'speaker' || selectedAudioDeviceId === 'default' ? 'bg-saBlue text-white' : 'bg-slate-200 text-slate-600'}`}>
                                        <Volume2 className="w-3.5 h-3.5 shrink-0" />
                                    </div>
                                    <div className="flex flex-col text-left truncate">
                                        <span className="truncate font-bold">Speaker</span>
                                        <span className="text-[10px] text-slate-500 font-normal">Loudspeaker / Built-in audio</span>
                                    </div>
                                </div>
                                {(audioOutputMode === 'speaker' || selectedAudioDeviceId === 'default') && (
                                    <Check className="w-4 h-4 text-saBlue shrink-0" />
                                )}
                            </button>

                            {/* Preset 2: Earpiece / Headphones */}
                            <button
                                onClick={() => {
                                    onSwitchToEarpiece?.();
                                    setShowSoundMenu(false);
                                }}
                                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all border ${
                                    audioOutputMode === 'earpiece' || selectedAudioDeviceId === 'earpiece'
                                        ? 'bg-sky-50 text-saBlue border-sky-300 shadow-xs'
                                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                                }`}
                            >
                                <div className="flex items-center gap-2.5 truncate">
                                    <div className={`p-1.5 rounded-lg ${audioOutputMode === 'earpiece' || selectedAudioDeviceId === 'earpiece' ? 'bg-saBlue text-white' : 'bg-slate-200 text-slate-600'}`}>
                                        <Headphones className="w-3.5 h-3.5 shrink-0" />
                                    </div>
                                    <div className="flex flex-col text-left truncate">
                                        <span className="truncate font-bold">Earpiece / Headphones</span>
                                        <span className="text-[10px] text-slate-500 font-normal">Private audio output / Headset</span>
                                    </div>
                                </div>
                                {(audioOutputMode === 'earpiece' || selectedAudioDeviceId === 'earpiece') && (
                                    <Check className="w-4 h-4 text-saBlue shrink-0" />
                                )}
                            </button>

                            {/* Additional hardware devices if detected */}
                            {audioDevices
                                .filter(d => !d.isDefault && d.deviceId !== 'default' && d.deviceId !== 'earpiece')
                                .map((dev) => (
                                    <button
                                        key={dev.deviceId}
                                        onClick={() => {
                                            onSelectAudioDevice?.(dev.deviceId);
                                            setShowSoundMenu(false);
                                        }}
                                        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all border ${
                                            selectedAudioDeviceId === dev.deviceId
                                                ? 'bg-sky-50 text-saBlue border-sky-300 shadow-xs'
                                                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2.5 truncate">
                                            <div className={`p-1.5 rounded-lg ${selectedAudioDeviceId === dev.deviceId ? 'bg-saBlue text-white' : 'bg-slate-200 text-slate-600'}`}>
                                                {dev.isEarpiece ? (
                                                    <Headphones className="w-3.5 h-3.5 shrink-0" />
                                                ) : (
                                                    <Volume2 className="w-3.5 h-3.5 shrink-0" />
                                                )}
                                            </div>
                                            <span className="truncate text-left font-bold">{dev.label}</span>
                                        </div>
                                        {selectedAudioDeviceId === dev.deviceId && (
                                            <Check className="w-4 h-4 text-saBlue shrink-0" />
                                        )}
                                    </button>
                                ))}

                            {onOpenSystemAudioPicker && (
                                <button
                                    onClick={() => {
                                        onOpenSystemAudioPicker();
                                        setShowSoundMenu(false);
                                    }}
                                    className="w-full mt-1.5 py-1.5 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-[11px] text-slate-600 font-semibold transition-colors text-center"
                                >
                                    Choose Device (System Picker)...
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className="flex items-center gap-1 md:gap-2 p-2 rounded-2xl md:rounded-full bg-white/95 backdrop-blur-xl border border-slate-200 shadow-xl max-w-[95vw] overflow-x-auto scrollbar-hide no-scrollbar">
                {/* Microphone Toggle */}
                <Button
                    variant={isMuted ? 'destructive' : 'outline'}
                    size="icon"
                    className={`h-10 w-10 rounded-full transition-all ${!isMuted
                        ? 'hover:bg-slate-100 text-slate-700 border-slate-200'
                        : 'bg-red-500 hover:bg-red-600 border-red-500'
                        }`}
                    onClick={onToggleMic}
                    disabled={!isConnected}
                    title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
                >
                    {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>

                {/* Camera Toggle */}
                <Button
                    variant={isVideoOff ? 'destructive' : 'outline'}
                    size="icon"
                    className={`h-10 w-10 rounded-full transition-all ${!isVideoOff
                        ? 'hover:bg-slate-100 text-slate-700 border-slate-200'
                        : 'bg-red-500 hover:bg-red-600 border-red-500'
                        }`}
                    onClick={onToggleCamera}
                    disabled={!isConnected}
                    title={isVideoOff ? 'Turn On Camera' : 'Turn Off Camera'}
                >
                    {isVideoOff ? <VideoOff className="h-4 w-4" /> : <Video className="h-4 w-4" />}
                </Button>

                {/* Speaker / Earpiece / Close Sound Control */}
                <div className="relative">
                    <Button
                        variant={isAudioClosed ? 'destructive' : 'outline'}
                        size="icon"
                        className={`h-10 w-10 rounded-full transition-all relative ${
                            isAudioClosed
                                ? 'bg-red-500 hover:bg-red-600 border-red-500 text-white shadow-md shadow-red-500/20'
                                : audioOutputMode === 'earpiece'
                                    ? 'hover:bg-sky-50 text-sky-600 border-sky-300 bg-sky-50/50'
                                    : 'hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                        onClick={() => setShowSoundMenu(!showSoundMenu)}
                        disabled={!isConnected}
                        title={
                            isAudioClosed
                                ? 'Sound is Closed (Click to Open or Change Speaker/Earpiece)'
                                : audioOutputMode === 'earpiece'
                                    ? 'Audio: Earpiece / Headphones (Click for options)'
                                    : 'Audio: Speaker (Click to change speaker/earpiece or close sound)'
                        }
                    >
                        {isAudioClosed ? (
                            <VolumeX className="h-4 w-4" />
                        ) : audioOutputMode === 'earpiece' ? (
                            <Headphones className="h-4 w-4" />
                        ) : (
                            <Volume2 className="h-4 w-4" />
                        )}
                        {/* Status indicator dot */}
                        {isAudioClosed && (
                            <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 bg-red-400 border-2 border-white rounded-full animate-pulse" />
                        )}
                    </Button>
                </div>

                {/* Background Toggle */}
                <Button
                    variant={isBackgroundActive ? 'default' : 'ghost'}
                    size="icon"
                    className={`h-10 w-10 rounded-full ${isBackgroundActive
                        ? 'bg-gray-700 hover:bg-gray-800 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                        }`}
                    onClick={onToggleBackground}
                    disabled={!isConnected}
                    title={isBackgroundActive ? 'Remove Background' : 'Gray Background'}
                >
                    <PersonStanding className="h-4 w-4" />
                </Button>

                {/* Separator */}
                <div className="w-px h-8 bg-slate-200 mx-1" />

                {/* Screen Share */}
                <Button
                    variant={isScreenSharing ? 'default' : 'ghost'}
                    size="icon"
                    className={`h-10 w-10 rounded-full ${isScreenSharing
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                        }`}
                    onClick={onToggleScreenShare}
                    disabled={!isConnected}
                    title={isScreenSharing ? 'Stop Sharing' : 'Share Screen'}
                >
                    {isScreenSharing ? <MonitorOff className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
                </Button>

                {/* Whiteboard */}
                <Button
                    variant={isWhiteboardActive ? 'default' : 'ghost'}
                    size="icon"
                    className={`h-10 w-10 rounded-full relative ${isWhiteboardActive
                        ? 'bg-sky-500 hover:bg-sky-600 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                        }`}
                    onClick={onToggleWhiteboard}
                    disabled={!isConnected}
                    title="Toggle Whiteboard"
                >
                    <PenTool className="h-4 w-4" />
                    {isWhiteboardActive && (
                        <span className="absolute top-2 right-2 h-2.5 w-2.5 bg-white border-2 border-sky-500 rounded-full animate-pulse" />
                    )}
                </Button>

                {/* Separator */}
                <div className="w-px h-8 bg-slate-200 mx-1" />

                {/* Hand Raise Button */}
                <Button
                    variant={isHandRaised ? 'default' : 'ghost'}
                    size="icon"
                    className={`h-10 w-10 rounded-full relative transition-all ${isHandRaised
                        ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/30 animate-pulse'
                        : 'text-slate-700 hover:bg-slate-100'
                        }`}
                    onClick={onToggleHandRaise}
                    disabled={!isConnected}
                    title={isHandRaised ? 'Lower Hand' : 'Raise Hand'}
                >
                    <Hand className="h-5 w-5" />
                    {isHandRaised && (
                        <span className="absolute -top-1 -right-1 h-3 w-3 bg-amber-400 border-2 border-white rounded-full" />
                    )}
                </Button>

                {/* Quick Clap Button */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-full text-xl hover:bg-slate-100 hover:scale-110 transition-transform"
                    onClick={() => onSendReaction('👏')}
                    disabled={!isConnected}
                    title="Clap 👏"
                >
                    👏
                </Button>

                {/* Emoji Reactions Picker Toggle Button */}
                <Button
                    variant={showEmojiPicker ? 'default' : 'ghost'}
                    size="icon"
                    className={`h-10 w-10 rounded-full ${showEmojiPicker
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                        }`}
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    disabled={!isConnected}
                    title="Reactions 😊"
                >
                    <Smile className="h-5 w-5" />
                </Button>

                {/* Separator */}
                <div className="w-px h-8 bg-slate-200 mx-1" />

                {/* End Call */}
                <Button
                    variant="destructive"
                    size="icon"
                    className="h-10 w-14 rounded-full bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/20"
                    onClick={onLeave}
                    title="Leave Classroom"
                >
                    <PhoneOff className="h-5 w-5" />
                </Button>
            </div>
        </div>
    );
}
