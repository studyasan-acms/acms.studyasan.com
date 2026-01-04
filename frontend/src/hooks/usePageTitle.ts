import { useEffect } from 'react';

/**
 * Custom hook to set the document title dynamically
 * @param title - The page title to display
 * @param suffix - Optional suffix (defaults to "StudyAsan")
 */
export function usePageTitle(title: string, suffix: string = 'StudyAsan') {
    useEffect(() => {
        const previousTitle = document.title;
        document.title = title ? `${title} | ${suffix}` : suffix;

        // Cleanup: restore previous title when component unmounts
        return () => {
            document.title = previousTitle;
        };
    }, [title, suffix]);
}

export default usePageTitle;
