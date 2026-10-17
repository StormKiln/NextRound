import { useCallback, useEffect, useRef, useState } from 'react';
import { Dialog } from '@/components/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { type CollectionErrorCode, collectionFailure } from './collection-errors';
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
  reload,
}: {
  document: TemplateDocument;
  template?: WorkoutTemplate;
  mutate: (m: TemplateMutation) => Promise<TemplateDocument>;
  reload: () => Promise<TemplateDocument>;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [name, setName] = useState('');
  const [editing, setEditing] = useState<WorkoutCollection | null>(null);
  const [deleting, setDeleting] = useState<WorkoutCollection | null>(null);
  const [selected, setSelected] = useState(() =>
    template ? memberships(document, template.id) : [],
  );
  const [expected, setExpected] = useState(() =>
    template ? memberships(document, template.id) : [],
  );
  const nameInput = useRef<HTMLInputElement>(null),
    keepButton = useRef<HTMLButtonElement>(null),
    origin = useRef<HTMLElement | null>(null),
    originLabel = useRef<string | null>(null),
    gate = useRef(false);
  const [errorCode, setErrorCode] = useState<CollectionErrorCode>('storage');
  const focusName = useCallback(() => {
    requestAnimationFrame(() => {
      nameInput.current?.focus();
      nameInput.current?.scrollIntoView({ block: 'nearest' });
    });
  }, []);
  function restoreAction() {
    requestAnimationFrame(() => {
      if (origin.current?.isConnected) origin.current.focus();
      else {
        const buttons = nameInput.current
          ?.closest('dialog')
          ?.querySelectorAll<HTMLButtonElement>('button[aria-label]');
        const restored = Array.from(buttons ?? []).find(
          (button) => button.getAttribute('aria-label') === originLabel.current,
        );
        (restored ?? nameInput.current)?.focus();
      }
    });
  }
  useEffect(() => {
    if (editing) focusName();
  }, [editing, focusName]);
  useEffect(() => {
    if (deleting) requestAnimationFrame(() => keepButton.current?.focus());
  }, [deleting]);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  async function submit(m: TemplateMutation, message: string, close = false) {
    if (gate.current) return;
    gate.current = true;
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
      else restoreAction();
    } catch (e) {
      const failure = collectionFailure(e);
      setError(failure.message);
      setErrorCode(failure.code);
      if (failure.code === 'name') focusName();
    } finally {
      gate.current = false;
      setBusy(false);
    }
  }
  return (
    <Dialog
      title={template ? `Collections for ${template.name}` : 'Manage collections'}
      className="template-preview"
      onClose={() => {
        if (!gate.current) onClose();
      }}
    >
      <div className="template-preview-body collection-body" aria-busy={busy}>
        <p>
          Collections stay on this Mac. A workout can belong to several collections. Removing a
          collection never deletes its workouts.
        </p>
        {error && (
          <div>
            <p role="alert" id="collection-error">
              {error}
            </p>
            {errorCode === 'conflict' && (
              <>
                <p>
                  Reload to review the latest collections. This discards unsaved collection edits
                  and selections in this dialog.
                </p>
                <Button
                  variant="secondary"
                  disabled={busy}
                  onClick={async () => {
                    if (gate.current) return;
                    gate.current = true;
                    setBusy(true);
                    try {
                      const doc = await reload();
                      setName('');
                      setEditing(null);
                      setDeleting(null);
                      const ids = template ? memberships(doc, template.id) : [];
                      setSelected(ids);
                      setExpected(ids);
                      setError('');
                      setNotice('Latest collections loaded. Review before saving.');
                      focusName();
                    } catch (e) {
                      const failure = collectionFailure(e);
                      setError(failure.message);
                      setErrorCode(failure.code);
                    } finally {
                      gate.current = false;
                      setBusy(false);
                    }
                  }}
                >
                  Reload collection data
                </Button>
              </>
            )}
            {errorCode === 'storage' && (
              <p>Your edits are kept. Retry the action when storage is available.</p>
            )}
          </div>
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
            {!deleting && (
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
                    ref={nameInput}
                    aria-invalid={!!error && errorCode === 'name'}
                    aria-describedby={
                      error && errorCode === 'name' ? 'collection-error' : undefined
                    }
                    id="collection-name"
                    maxLength={80}
                    value={name}
                    disabled={busy}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (errorCode === 'name') setError('');
                    }}
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
                          setError('');
                          restoreAction();
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
                          onClick={(event) => {
                            origin.current = event.currentTarget;
                            originLabel.current = event.currentTarget.getAttribute('aria-label');
                            setError('');
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
                          onClick={(event) => {
                            origin.current = event.currentTarget;
                            originLabel.current = event.currentTarget.getAttribute('aria-label');
                            setEditing(null);
                            setName('');
                            setError('');
                            setDeleting(c);
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
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
                  <Button
                    ref={keepButton}
                    disabled={busy}
                    variant="secondary"
                    onClick={() => {
                      setDeleting(null);
                      setError('');
                      restoreAction();
                    }}
                  >
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
