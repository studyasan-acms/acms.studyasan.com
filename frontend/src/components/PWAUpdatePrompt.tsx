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
            <div className="bg-saBlue text-white rounded-2xl shadow-2xl p-4 border border-white/20 animate-in slide-in-from-bottom-5">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                        {needRefresh ? (
                            <>
                                <h3 className="font-bold text-base flex items-center gap-2">
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                    New Version Available!
                                </h3>
                                <p className="text-xs text-white/90 mt-1">
                                    A new version of StudyAsan is ready. Reload to update.
                                </p>
                            </>
                        ) : (
                            <>
                                <h3 className="font-bold text-base flex items-center gap-2">
                                    <Download className="w-4 h-4" />
                                    Install StudyAsan
                                </h3>
                                <p className="text-xs text-white/90 mt-1">
                                    Add StudyAsan to your home screen for quick access.
                                </p>
                            </>
                        )}
                    </div>
                    <button
                        onClick={close}
                        className="text-white/70 hover:text-white transition-colors"
                        aria-label="Close"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex items-center gap-2 mt-3">
                    {needRefresh ? (
                        <Button
                            onClick={() => updateServiceWorker(true)}
                            className="flex-1 bg-white text-saBlue hover:bg-slate-100 font-bold text-xs h-9 rounded-xl shadow-sm"
                        >
                            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                            Reload Now
                        </Button>
                    ) : (
                        <Button
                            onClick={handleInstallClick}
                            className="flex-1 bg-white text-saBlue hover:bg-slate-100 font-bold text-xs h-9 rounded-xl shadow-sm"
                        >
                            <Download className="w-3.5 h-3.5 mr-1.5" />
                            Install App
                        </Button>
                    )}
                    <Button
                        onClick={close}
                        variant="ghost"
                        className="text-white hover:bg-white/10 font-medium text-xs h-9 rounded-xl px-3"
                    >
                        Later
                    </Button>
                </div>
            </div>
        </div>
    );
}
