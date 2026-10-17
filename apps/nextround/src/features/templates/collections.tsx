import { useState } from 'react';
import { Dialog } from '@/components/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  memberships,
  type TemplateDocument,
  type TemplateMutation,
  type WorkoutCollection,
  type WorkoutTemplate,
} from './repository';

export function CollectionDialog({
  document,
  template,
  mutate,
  onClose,
  onSaved,
}: {
  document: TemplateDocument;
  template?: WorkoutTemplate;
  mutate: (m: TemplateMutation) => Promise<TemplateDocument>;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [name, setName] = useState('');
  const [editing, setEditing] = useState<WorkoutCollection | null>(null);
  const [deleting, setDeleting] = useState<WorkoutCollection | null>(null);
  const [selected, setSelected] = useState(() =>
    template ? memberships(document, template.id) : [],
  );
  const [expected] = useState(() => (template ? memberships(document, template.id) : []));
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  async function submit(m: TemplateMutation, message: string, close = false) {
    if (busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await mutate(m);
      setName('');
      setEditing(null);
      setDeleting(null);
      setNotice(message);
      if (close) onSaved(message);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      title={template ? `Collections for ${template.name}` : 'Manage collections'}
      className="template-preview"
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <div className="template-preview-body collection-body" aria-busy={busy}>
        <p>
          Collections stay on this Mac. A workout can belong to several collections. Removing a
          collection never deletes its workouts.
        </p>
        {error && (
          <p role="alert">
            {error} Close this dialog and refresh the library to review the latest data.
          </p>
        )}
        {notice && <p role="status">{notice}</p>}
        {template ? (
          <fieldset disabled={busy}>
            <legend>Choose collections</legend>
            {!document.collections.length && (
              <p>
                No collections yet. Close this dialog and choose Manage collections to create one.
              </p>
            )}
            {document.collections.map((c) => (
              <label className="collection-choice" key={c.id}>
                <input
                  type="checkbox"
                  checked={selected.includes(c.id)}
                  onChange={(e) =>
                    setSelected(
                      e.target.checked ? [...selected, c.id] : selected.filter((id) => id !== c.id),
                    )
                  }
                />
                <span>{c.name}</span>
              </label>
            ))}
            <p>No selections places this workout in Unfiled.</p>
          </fieldset>
        ) : (
          <>
            <form
              className="template-form"
              onSubmit={(e) => {
                e.preventDefault();
                void submit(
                  editing
                    ? {
                        action: 'collectionrename',
                        id: editing.id,
                        expectedName: editing.name,
                        name,
                      }
                    : { action: 'collectioncreate', name },
                  `Collection “${name.trim()}” ${editing ? 'renamed' : 'created'}.`,
                );
              }}
            >
              <label htmlFor="collection-name">Collection name</label>
              <Input
                id="collection-name"
                maxLength={80}
                value={name}
                disabled={busy}
                onChange={(e) => setName(e.target.value)}
              />
              <div className="template-actions">
                <Button disabled={busy || !name.trim()} type="submit">
                  {editing ? 'Rename collection' : 'Create collection'}
                </Button>
                {editing && (
                  <Button
                    variant="secondary"
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setEditing(null);
                      setName('');
                    }}
                  >
                    Cancel rename
                  </Button>
                )}
              </div>
            </form>
            {!document.collections.length && <p>No collections yet.</p>}
            <ul className="collection-list">
              {document.collections.map((c) => (
                <li key={c.id}>
                  <strong>{c.name}</strong>
                  <span>{c.workoutIds.length} saved workouts</span>
                  <div className="template-actions">
                    <Button
                      variant="secondary"
                      disabled={busy}
                      aria-label={`Rename collection ${c.name}`}
                      onClick={() => {
                        setEditing(c);
                        setName(c.name);
                        setDeleting(null);
                      }}
                    >
                      Rename
                    </Button>
                    <Button
                      variant="secondary"
                      disabled={busy}
                      aria-label={`Delete collection ${c.name}`}
                      onClick={() => setDeleting(c)}
                    >
                      Delete
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
            {deleting && (
              <div className="template-review">
                <p>Delete collection “{deleting.name}”? All its workouts will remain saved.</p>
                <div className="template-actions">
                  <Button
                    disabled={busy}
                    onClick={() =>
                      void submit(
                        {
                          action: 'collectiondelete',
                          id: deleting.id,
                          expectedName: deleting.name,
                        },
                        `Collection “${deleting.name}” deleted. Its workouts remain saved.`,
                      )
                    }
                  >
                    Confirm delete collection
                  </Button>
                  <Button disabled={busy} variant="secondary" onClick={() => setDeleting(null)}>
                    Keep collection
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      <div className="template-actions">
        <Button variant="secondary" disabled={busy} onClick={onClose}>
          {template ? 'Cancel' : 'Done'}
        </Button>
        {template && (
          <Button
            disabled={busy}
            onClick={() =>
              void submit(
                {
                  action: 'membership',
                  id: template.id,
                  collectionIds: selected,
                  expectedCollectionIds: expected,
                },
                `Collections saved for “${template.name}”.`,
                true,
              )
            }
          >
            Save collections
          </Button>
        )}
      </div>
    </Dialog>
  );
}
