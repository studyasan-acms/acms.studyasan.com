import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Whiteboard } from '@/components/classroom/Whiteboard';
import { useAuthStore } from '@/store/authStore';
import { usePageTitle } from '@/hooks/usePageTitle';
import type { WhiteboardMessage } from '@/types/videoRoom';

export default function WhiteboardPage() {
  usePageTitle('Whiteboard');
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [isWhiteboardOpen, setIsWhiteboardOpen] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const whiteboardContainerRef = useRef<HTMLDivElement>(null);

  const isAllowed = user?.role === 'ADMIN' || user?.role === 'TEACHER';

  const handleSendMessage = useCallback((_message: WhiteboardMessage) => {
    // Standalone whiteboard intentionally does not sync across users.
  }, []);

  const handleRegisterRemoteMessage = useCallback(
    (_handler: (message: WhiteboardMessage) => void) => {
      // No remote message source in standalone mode.
    },
    []
  );

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        if (whiteboardContainerRef.current?.requestFullscreen) {
          await whiteboardContainerRef.current.requestFullscreen();
        }
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error('Fullscreen toggle failed:', error);
    }
  }, []);

  if (!isAllowed) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-3">
          <h1 className="text-2xl font-bold text-gray-800">Access Denied</h1>
          <p className="text-gray-500">This whiteboard is only available for Admin and Teacher accounts.</p>
          <Button onClick={() => navigate('/dashboard')} variant="outline">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => navigate('/dashboard')}
        className="flex items-center text-muted-foreground hover:text-saBlue transition-colors w-fit text-sm font-medium"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back
      </button>

      <div>
        <h1 className="text-2xl font-bold text-gray-800">Whiteboard</h1>
        <p className="text-sm text-gray-500">Free drawing space for Admin and Teacher.</p>
      </div>

      <div className="flex items-center justify-end">
        <Button type="button" variant="outline" onClick={toggleFullscreen} className="gap-2">
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
        </Button>
      </div>

      <div
        ref={whiteboardContainerRef}
        className="relative h-[calc(100vh-220px)] min-h-[540px] rounded-2xl border border-gray-200 bg-white overflow-hidden data-[fullscreen=true]:h-screen data-[fullscreen=true]:min-h-screen data-[fullscreen=true]:rounded-none"
        data-fullscreen={isFullscreen}
      >
        {isWhiteboardOpen ? (
          <Whiteboard
            isActive={isWhiteboardOpen}
            onClose={() => setIsWhiteboardOpen(false)}
            sendMessage={handleSendMessage}
            onRemoteMessage={handleRegisterRemoteMessage}
            canEdit={true}
          />
        ) : (
          <div className="h-full flex items-center justify-center">
            <Button onClick={() => setIsWhiteboardOpen(true)}>Open Whiteboard</Button>
          </div>
        )}
      </div>
    </div>
  );
}