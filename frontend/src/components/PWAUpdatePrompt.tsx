import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from './ui/button';
import { Download, RefreshCw, X } from 'lucide-react';

export function PWAUpdatePrompt() {
    const [showInstallPrompt, setShowInstallPrompt] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

    const {
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegistered(r: ServiceWorkerRegistration | undefined) {
            console.log('SW Registered: ' + r);
        },
        onRegisterError(error: Error) {
            console.log('SW registration error', error);
        },
    });

    useEffect(() => {
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setShowInstallPrompt(true);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            console.log('User accepted the install prompt');
        }

        setDeferredPrompt(null);
        setShowInstallPrompt(false);
    };

    const close = () => {
        setNeedRefresh(false);
        setShowInstallPrompt(false);
    };

    if (!needRefresh && !showInstallPrompt) {
        return null;
    }

    return (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl shadow-2xl p-4 text-white animate-in slide-in-from-bottom-5">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                        {needRefresh ? (
                            <>
                                <h3 className="font-semibold text-lg flex items-center gap-2">
                                    <RefreshCw className="w-5 h-5" />
                                    New Version Available!
                                </h3>
                                <p className="text-sm text-white/80 mt-1">
                                    A new version of StudyAsan is ready. Reload to update.
                                </p>
                            </>
                        ) : (
                            <>
                                <h3 className="font-semibold text-lg flex items-center gap-2">
                                    <Download className="w-5 h-5" />
                                    Install StudyAsan
                                </h3>
                                <p className="text-sm text-white/80 mt-1">
                                    Add StudyAsan to your home screen for quick access.
                                </p>
                            </>
                        )}
                    </div>
                    <button
                        onClick={close}
                        className="text-white/60 hover:text-white transition-colors"
                        aria-label="Close"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex gap-2 mt-3">
                    {needRefresh ? (
                        <Button
                            onClick={() => updateServiceWorker(true)}
                            className="flex-1 bg-white text-indigo-600 hover:bg-white/90"
                        >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Reload Now
                        </Button>
                    ) : (
                        <Button
                            onClick={handleInstallClick}
                            className="flex-1 bg-white text-indigo-600 hover:bg-white/90"
                        >
                            <Download className="w-4 h-4 mr-2" />
                            Install App
                        </Button>
                    )}
                    <Button
                        onClick={close}
                        variant="ghost"
                        className="text-white hover:bg-white/10"
                    >
                        Later
                    </Button>
                </div>
            </div>
        </div>
    );
}
