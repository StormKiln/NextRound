import { invoke } from '@tauri-apps/api/core';
import { type ReactNode, useState } from 'react';
import { native } from '@/native/adapter';
export function ExternalLink({
  page,
  children,
}: {
  page: 'releases' | 'issues';
  children: ReactNode;
}) {
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <a
        href={`https://github.com/StormKiln/NextRound/${page}`}
        target="_blank"
        rel="noreferrer"
        onClick={(event) => {
          if (native) {
            event.preventDefault();
            void invoke('open_project_page', { page }).catch(() =>
              setError('Could not open your browser. Visit github.com/StormKiln/NextRound.'),
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
