import { invoke, isTauri } from '@tauri-apps/api/core';
import { Button } from '@/components/ui/button';
export async function saveJson(raw: string, name: string, backup = false): Promise<boolean> {
  if (isTauri())
    return invoke(backup ? 'save_backup_file' : 'save_workout_file', { raw, suggestedName: name });
  const url = URL.createObjectURL(new Blob([raw], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}
export function JsonPicker({
  onRead,
  onError,
  backup = false,
}: {
  onRead: (raw: string) => void;
  onError: (error: string) => void;
  backup?: boolean;
}) {
  const choose = async (read: () => Promise<string | null>) => {
    try {
      const raw = await read();
      if (raw !== null) onRead(raw);
    } catch (e) {
      onError(String(e));
    }
  };
  if (isTauri())
    return (
      <Button
        variant="secondary"
        onClick={() => void choose(() => invoke(backup ? 'open_backup_file' : 'open_workout_file'))}
      >
        Choose JSON file
      </Button>
    );
  return (
    <label className="file-picker">
      Choose JSON file
      <input
        type="file"
        accept=".json,application/json"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file)
            void choose(async () => {
              if (file.size > (backup ? 32 * 1024 * 1024 : 1048576))
                throw new Error('File exceeds the supported size.');
              return file.text();
            });
          e.target.value = '';
        }}
      />
    </label>
  );
}
