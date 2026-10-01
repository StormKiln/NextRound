import { invoke } from '@tauri-apps/api/core';
import { type ReactNode, useState } from 'react';
import { native } from '@/native/adapter';
export function ExternalLink({
  page,
  children,
}: {
  page: 'releases' | 'issues' | 'privacy';
  children: ReactNode;
}) {
  const [error, setError] = useState<string | null>(null);
  const url = `https://github.com/StormKiln/NextRound/${page === 'privacy' ? 'blob/main/PRIVACY.md' : page}`;
  return (
    <>
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        onClick={(event) => {
          setError(null);
          if (native) {
            event.preventDefault();
            void invoke('open_project_page', { page })
              .then(() => setError(null))
              .catch(() =>
                setError(
                  `Could not open your browser. Try this link again, or copy this address into your browser: ${url}`,
                ),
              );
          }
        }}
      >
        {children}
      </a>
      {error && <p role="alert">{error}</p>}
    </>
  );
}
