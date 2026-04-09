import { useState, useEffect } from 'react';
import { loadPublicConfig } from '@/config/publicConfig';

/**
 * Custom hook to manage Firebase readiness state
 * Extracted from the main page component to isolate Firebase connection logic
 *
 * MIGRATION: Updated to use @/config/firebase instead of @/lib/firebase-lazy
 * When NEXT_PUBLIC_STORAGE_BACKEND=postgres, Firebase is not needed and this
 * hook resolves immediately so the orchestrator can proceed without Firebase.
 */
export const useFirebaseReadiness = () => {
  const [firebaseReady, setFirebaseReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;

    const checkFirebaseReady = async () => {
      // When using Postgres backend, Firebase is not needed for storage.
      // Resolve immediately so the orchestrator can proceed.
      const config = await loadPublicConfig();
      if (config.NEXT_PUBLIC_STORAGE_BACKEND === 'postgres') {
        if (!cancelled) {
          setFirebaseReady(true);
        }
        return;
      }

      try {
        const { ensureFirebaseInitialized } = await import('@/config/firebase');
        const { db } = await ensureFirebaseInitialized();

        if (!db) {
          throw new Error('Firestore instance not available');
        }

        if (cancelled) {
          return;
        }

        setFirebaseReady(true);
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error('❌ Firebase connection failed:', error);
        setFirebaseReady(false);

        // Retry after a delay
        retryTimeout = setTimeout(() => {
          if (cancelled) {
            return;
          }

          void checkFirebaseReady();
        }, 2000);
      }
    };

    void checkFirebaseReady();

    return () => {
      cancelled = true;
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
    };
  }, []);

  return { firebaseReady };
};
