/**
 * useDocumentLoader — Signed URL generation + PDF page tracking.
 * Handles both legacy public URLs and new storage-path content.
 */
import { useState, useEffect, useCallback } from 'react';
import { resolveSubmissionUrl } from '@/lib/speedgrader-api';

interface UseDocumentLoaderOptions {
    /** The raw content field from the submission (URL or storage path) */
    content: string | null;
    /** File type of the submission */
    fileType: 'pdf' | 'text' | null;
}

export function useDocumentLoader({ content, fileType }: UseDocumentLoaderOptions) {
    const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Signed URL expiry timer
    const [urlExpiry, setUrlExpiry] = useState<number>(0);

    const loadDocument = useCallback(async () => {
        if (!content || fileType !== 'pdf') {
            setResolvedUrl(null);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const url = await resolveSubmissionUrl(content);
            setResolvedUrl(url);
            // Track URL expiry for auto-refresh (55 min)
            setUrlExpiry(Date.now() + 55 * 60 * 1000);
        } catch (err) {
            console.error('[useDocumentLoader] Failed to resolve URL:', err);
            setError(err instanceof Error ? err.message : 'Failed to load document');
            // Fallback: try using content directly as URL
            if (content.startsWith('http')) {
                setResolvedUrl(content);
            }
        } finally {
            setIsLoading(false);
        }
    }, [content, fileType]);

    // Load on mount / content change
    useEffect(() => {
        loadDocument();
    }, [loadDocument]);

    // Auto-refresh signed URL before expiry
    useEffect(() => {
        if (!urlExpiry || fileType !== 'pdf') return;

        const timeUntilRefresh = urlExpiry - Date.now();
        if (timeUntilRefresh <= 0) return;

        const timer = setTimeout(() => {
            console.log('[useDocumentLoader] Refreshing signed URL...');
            loadDocument();
        }, timeUntilRefresh);

        return () => clearTimeout(timer);
    }, [urlExpiry, loadDocument, fileType]);

    return {
        resolvedUrl,
        isLoading,
        error,
        refreshUrl: loadDocument,
    };
}
