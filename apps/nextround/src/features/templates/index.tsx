import type { WorkoutConfig } from '@nextround/core';
import { formatTarget } from '@nextround/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useId, useRef, useState } from 'react';
import { Dialog } from '@/components/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SessionLibrary } from '@/features/sessions/library';
import { readTraining, trainingKey } from '@/features/sessions/repository';
import { useTemplateSources } from '@/state/template-source';
import { CollectionExport, CollectionImport } from './collection-transfer';
import { CollectionDialog } from './collections';
import { matchesTemplate } from './matching';
import {
  copyValidatedConfig,
  mutateTemplates,
  readTemplates,
  type TemplateMutation,
  type WorkoutTemplate,
} from './repository';
import { budgetTimeLabel } from './time-budget';
import { TimeBudgetFilter } from './time-budget-filter';
import './templates.css';
import { copyName, useTemplateFilters } from './filter-state';
import { WorkoutPreview } from './preview';
import { WorkoutExport, WorkoutImport } from './transfer';
import { workoutSummary } from './workout-details';

const queryKey = ['workout-templates'];
const message = (error: unknown) => (error instanceof Error ? error.message : String(error));
function useTemplateMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (mutation: TemplateMutation) => {
      await client.cancelQueries({ queryKey });
      const document = await mutateTemplates(mutation);
      await client.cancelQueries({ queryKey });
      client.setQueryData(queryKey, document);
      return document;
    },
  });
}
export function SaveWorkoutButton({
  getConfig,
  validate,
}: {
  getConfig: () => WorkoutConfig;
  validate?: () => boolean;
}) {
  const [config, setConfig] = useState<WorkoutConfig | null>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const draft = getConfig();
  const mode = draft.type ?? 'emom';
  const source = useTemplateSources((s) => s.sources[mode]);
  const [expected, setExpected] = useState<WorkoutTemplate | null>(null);
  const currentConfig = JSON.stringify(draft);
  function open(update: boolean) {
    if (validate && !validate()) return;
    try {
      setConfig(copyValidatedConfig(getConfig()));
      setExpected(update && source ? structuredClone(source) : null);
      setName(update && source ? source.name : '');
      setError(null);
      setSaved(null);
    } catch (e) {
      setError(message(e));
    }
  }
  const mutation = useTemplateMutation();
  const inputId = useId();
  return (
    <div className="template-save">
      {source && (
        <Button type="button" variant="secondary" onClick={() => open(true)}>
          Update saved workout
        </Button>
      )}
      <Button type="button" variant="secondary" onClick={() => open(false)}>
        {source ? 'Save as new' : 'Save workout'}
      </Button>
      {saved === currentConfig && <span role="status">Workout saved.</span>}
      {error && !config && <p role="alert">{error}</p>}
      {config && (
        <Dialog
          title={expected ? 'Update saved workout' : 'Save workout'}
          onClose={() => {
            if (!mutation.isPending) setConfig(null);
          }}
        >
          <form
            className="template-form"
            onSubmit={async (event) => {
              event.preventDefault();
              setError(null);
              try {
                if (mutation.isPending) return;
                const document = await mutation.mutateAsync(
                  expected
                    ? { action: 'update', id: expected.id, expected, name, config }
                    : { action: 'save', name, config },
                );
                const updated = expected
                  ? document.templates.find((t) => t.id === expected.id)
                  : document.templates.at(-1);
                if (updated) useTemplateSources.getState().setSource(mode, updated);
                setConfig(null);
                setSaved(JSON.stringify(config));
              } catch (e) {
                setError(message(e));
              }
            }}
          >
            <p>
              {expected
                ? `Replace “${expected.name}” with these settings? Its identity is preserved.`
                : 'Save a copy to use again. You can edit it after loading.'}
            </p>
            <label htmlFor={inputId}>Workout name</label>
            <Input
              id={inputId}
              value={name}
              maxLength={120}
              required
              onChange={(event) => setName(event.target.value)}
              disabled={mutation.isPending}
            />
            {error && <p role="alert">{error}</p>}
            {error && expected && (
              <Button
                type="button"
                variant="secondary"
                disabled={mutation.isPending}
                onClick={() => {
                  setExpected(null);
                  setError(null);
                }}
              >
                Save as new
              </Button>
            )}
            <div className="template-actions">
              <Button
                type="button"
                variant="secondary"
                disabled={mutation.isPending}
                onClick={() => setConfig(null)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending || !name.trim()}>
                {mutation.isPending ? 'Saving…' : expected ? 'Update' : 'Save'}
              </Button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
}
export function TemplateLibrary({
  onLoad,
}: {
  onLoad: (config: WorkoutConfig, source: WorkoutTemplate) => void;
}) {
  const training = useQuery({ queryKey: trainingKey, queryFn: readTraining, retry: false });
  const client = useQueryClient();
  const query = useQuery({ queryKey, queryFn: readTemplates, retry: false });
  const heading = useRef<HTMLHeadingElement>(null);
  const origin = useRef<HTMLElement | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  function restoreFocus(onlyIfLost = false) {
    requestAnimationFrame(() => {
      if (
        onlyIfLost &&
        document.activeElement !== document.body &&
        document.activeElement !== origin.current
      )
        return;
      if (mounted.current)
        (origin.current?.isConnected ? origin.current : heading.current)?.focus({
          preventScroll: true,
        });
    });
  }
  function closeAction() {
    setAction(null);
    restoreFocus();
  }
  const {
    search,
    favouritesOnly,
    workoutType,
    collection,
    budgetMinutes,
    budgetDraft,
    budgetError,
    reset: resetFilters,
  } = useTemplateFilters();
  const [collectionDialog, setCollectionDialog] = useState<WorkoutTemplate | 'manage' | null>(null);
  const [membershipNotice, setMembershipNotice] = useState(false);
  useEffect(() => {
    if (
      query.data &&
      collection !== 'all' &&
      collection !== 'unfiled' &&
      !query.data.collections.some((c) => c.id === collection)
    ) {
      useTemplateFilters.setState({ collection: 'all' });
    }
  }, [query.data, collection]);
  const [importing, setImporting] = useState(false);
  const [importingCollection, setImportingCollection] = useState(false);
  const [exportCollectionId, setExportCollectionId] = useState<string | null>(null);
  const [exportId, setExportId] = useState<string | null>(null);
  const [hiddenImport, setHiddenImport] = useState(false);
  const clearFilterFeedback = () => {
    setMembershipNotice(false);
    setHiddenImport(false);
    setHiddenCopy(false);
    setHiddenRename(false);
    setNotice('');
  };
  const setSearch = (search: string) => {
    clearFilterFeedback();
    useTemplateFilters.setState({ search });
  };
  const setWorkoutType = (workoutType: string) => {
    clearFilterFeedback();
    useTemplateFilters.setState({ workoutType });
  };
  const setFavouritesOnly = (favouritesOnly: boolean) => {
    clearFilterFeedback();
    useTemplateFilters.setState({ favouritesOnly });
  };
  const operationLock = useRef(false);
  const [hiddenCopy, setHiddenCopy] = useState(false);
  const [hiddenRename, setHiddenRename] = useState(false);
  const searchInput = useRef<HTMLInputElement>(null);
  function focusSearch() {
    requestAnimationFrame(() => {
      if (mounted.current) (searchInput.current ?? heading.current)?.focus({ preventScroll: true });
    });
  }
  const [notice, setNotice] = useState('');

  const mutation = useTemplateMutation();
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const busy = mutation.isPending || loading;
  const [action, setAction] = useState<{
    type: 'rename' | 'delete' | 'load' | 'duplicate';
    template: WorkoutTemplate;
  } | null>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const searchId = useId();
  const typeId = useId();
  const collectionId = useId();
  const nameId = useId();
  const filters = { search, favouritesOnly, workoutType, collection, budgetMinutes };
  const templateDocument = query.data;
  const templates =
    templateDocument?.templates.filter((t) => matchesTemplate(t, filters, templateDocument)) ?? [];
  async function refresh() {
    if (busy || operationLock.current) return;
    operationLock.current = true;
    setLoading(true);
    setError(null);
    setNotice('');
    setHiddenCopy(false);
    setHiddenRename(false);
    try {
      await client.cancelQueries({ queryKey });
      const latest = await readTemplates();
      if (!mounted.current) return;
      await client.cancelQueries({ queryKey });
      if (!mounted.current) return;
      client.setQueryData(queryKey, latest);
      if (action) {
        const entry = latest.templates.find((t) => t.id === action.template.id);
        if (!entry) {
          setNotice('That saved workout no longer exists. The library has been refreshed.');
          closeAction();
        } else {
          setAction({ ...action, template: entry });
          setNotice(`Current saved name: “${entry.name}”. Review it before confirming.`);
        }
      } else setNotice('Saved workouts refreshed.');
    } catch (e) {
      if (mounted.current) setError(message(e));
    } finally {
      operationLock.current = false;
      if (mounted.current) setLoading(false);
    }
  }
  async function favourite(template: WorkoutTemplate, button: HTMLElement) {
    if (busy || operationLock.current) return;
    operationLock.current = true;
    origin.current = button;
    setError(null);
    setNotice('');
    setHiddenCopy(false);
    setHiddenRename(false);
    try {
      await client.cancelQueries({ queryKey });
      await mutation.mutateAsync({
        action: 'favourite',
        id: template.id,
        favourite: !template.favourite,
      });
      if (!mounted.current) return;
      setNotice(`${template.name} ${template.favourite ? 'removed from' : 'added to'} favourites.`);
      restoreFocus(true);
    } catch (e) {
      if (mounted.current) setError(message(e));
    } finally {
      operationLock.current = false;
    }
  }
  async function submit() {
    if (!action || busy || operationLock.current) return;
    operationLock.current = true;
    setLoading(true);
    setError(null);
    setNotice('');
    setHiddenCopy(false);
    setHiddenRename(false);
    try {
      await client.cancelQueries({ queryKey });
      if (action.type === 'load') {
        // Re-read so stale cards never load deleted, corrupted or externally changed records.
        const latest = await readTemplates();
        if (!mounted.current) return;
        const entry = latest.templates.find((t) => t.id === action.template.id);
        if (!entry) throw new Error('This saved workout no longer exists. Refresh and try again.');
        onLoad(copyValidatedConfig(entry.config), structuredClone(entry));
      } else
        await mutation.mutateAsync(
          action.type === 'rename'
            ? { action: 'rename', id: action.template.id, expectedName: action.template.name, name }
            : action.type === 'duplicate'
              ? { action: 'duplicate', id: action.template.id, expected: action.template, name }
              : { action: 'delete', id: action.template.id, expected: action.template },
        );
      if (!mounted.current) return;
      const updatedDocument =
        client.getQueryData<import('./repository').TemplateDocument>(queryKey);
      const modified =
        action.type === 'duplicate'
          ? updatedDocument?.templates.at(-1)
          : updatedDocument?.templates.find((t) => t.id === action.template.id);
      const modifiedHidden =
        !!modified && !!updatedDocument && !matchesTemplate(modified, filters, updatedDocument);
      const hidden = action.type === 'duplicate' && modifiedHidden;
      const renamedHidden = action.type === 'rename' && modifiedHidden;
      setHiddenCopy(hidden);
      setHiddenRename(renamedHidden);
      setNotice(
        action.type === 'duplicate'
          ? `Workout copied as “${name.trim()}”.${hidden ? ' The copy is hidden by your current filters.' : ''}`
          : action.type === 'rename'
            ? `Workout renamed.${renamedHidden ? ` “${name.trim()}” is hidden by your current filters.` : ''}`
            : action.type === 'delete'
              ? 'Workout deleted.'
              : '',
      );
      closeAction();
    } catch (e) {
      if (mounted.current) setError(message(e));
    } finally {
      operationLock.current = false;
      if (mounted.current) setLoading(false);
    }
  }
  return (
    <section className="template-library" aria-labelledby="saved-workouts-title">
      <div>
        <h2 id="saved-workouts-title" ref={heading} tabIndex={-1}>
          Saved workouts
        </h2>
        <p>Keep your favourites ready for the next round.</p>
      </div>
      <Button
        variant="secondary"
        disabled={busy || query.isPending || query.isError}
        onClick={(event) => {
          origin.current = event.currentTarget;
          clearFilterFeedback();
          setImporting(true);
        }}
      >
        Import workout
      </Button>
      <Button
        variant="secondary"
        disabled={busy || query.isPending || query.isError}
        onClick={(event) => {
          origin.current = event.currentTarget;
          clearFilterFeedback();
          setCollectionDialog('manage');
        }}
      >
        Manage collections
      </Button>
      <Button
        variant="secondary"
        disabled={busy || query.isPending || query.isError}
        onClick={(event) => {
          origin.current = event.currentTarget;
          clearFilterFeedback();
          setImportingCollection(true);
        }}
      >
        Import collection
      </Button>
      {collection !== 'all' && collection !== 'unfiled' && (
        <>
          <Button
            variant="secondary"
            disabled={
              busy ||
              query.isPending ||
              query.isError ||
              (!query.data?.collections.find((c) => c.id === collection)?.workoutIds.length &&
                !training.data?.sessions.some((s) => s.collections?.includes(collection)))
            }
            onClick={(event) => {
              origin.current = event.currentTarget;
              clearFilterFeedback();
              setExportCollectionId(collection);
            }}
          >
            Export collection
          </Button>
          {!query.data?.collections.find((c) => c.id === collection)?.workoutIds.length &&
            !training.data?.sessions.some((s) => s.collections?.includes(collection)) && (
              <p>Add a saved workout to this collection before exporting.</p>
            )}
        </>
      )}
      {membershipNotice && (
        <Button
          variant="secondary"
          onClick={() => {
            resetFilters();
            clearFilterFeedback();
            focusSearch();
          }}
        >
          Show updated workout
        </Button>
      )}
      {hiddenImport && (
        <Button
          variant="secondary"
          onClick={() => {
            resetFilters();
            clearFilterFeedback();
            setNotice('Filters cleared. Your imported workout is shown.');
            focusSearch();
          }}
        >
          Show imported workout
        </Button>
      )}
      {!action && notice && <p role="status">{notice}</p>}
      {!action && hiddenRename && (
        <Button
          variant="secondary"
          onClick={() => {
            resetFilters();
            clearFilterFeedback();
            setNotice('Filters cleared. Your renamed workout is shown.');
            focusSearch();
          }}
        >
          Show renamed workout
        </Button>
      )}
      {!action && hiddenCopy && (
        <Button
          variant="secondary"
          onClick={() => {
            resetFilters();
            setHiddenCopy(false);
            setHiddenRename(false);
            setNotice('Filters cleared. Your copied workout is shown.');
            focusSearch();
          }}
        >
          Show copied workout
        </Button>
      )}
      {!action && error && <p role="alert">{error}</p>}
      <Button variant="secondary" disabled={busy || query.isPending} onClick={() => void refresh()}>
        Refresh saved workouts
      </Button>
      {query.isPending && <p role="status">Loading saved workouts…</p>}
      {query.isError ? (
        <div role="alert">
          <p>{message(query.error)}</p>
          <Button variant="secondary" disabled={busy} onClick={() => void refresh()}>
            Retry saved workouts
          </Button>
        </div>
      ) : (
        <>
          {(!!training.data?.sessions.length ||
            !!query.data?.templates.length ||
            !!query.data?.collections.length ||
            !!search ||
            favouritesOnly ||
            workoutType !== 'all' ||
            collection !== 'all' ||
            budgetMinutes !== null ||
            !!budgetDraft) && (
            <fieldset className="template-search" aria-label="Filter saved workouts">
              <label htmlFor={searchId}>Search saved workouts</label>
              <Input
                id={searchId}
                ref={searchInput}
                type="search"
                placeholder="Workout name or exercise details"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <div className="template-filters">
                <div className="template-mode">
                  <label htmlFor={collectionId}>Collection</label>
                  <select
                    id={collectionId}
                    value={collection}
                    onChange={(event) => {
                      clearFilterFeedback();
                      useTemplateFilters.setState({ collection: event.target.value });
                    }}
                  >
                    <option value="all">All workouts</option>
                    <option value="unfiled">Unfiled</option>
                    {query.data?.collections.map((c) => (
                      <option value={c.id} key={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="template-mode">
                  <label htmlFor={typeId}>Workout type</label>
                  <select
                    id={typeId}
                    value={workoutType}
                    onChange={(event) => setWorkoutType(event.target.value)}
                  >
                    <option value="all">All types</option>
                    <option value="emom">EMOM</option>
                    <option value="countdown">Countdown</option>
                    <option value="intervals">Intervals</option>
                    <option value="amrap">AMRAP</option>
                    <option value="forTime">For Time</option>
                    <option value="ladder">Ladder</option>
                  </select>
                </div>
                <label className="template-favourites">
                  <input
                    type="checkbox"
                    checked={favouritesOnly}
                    onChange={(event) => setFavouritesOnly(event.target.checked)}
                  />
                  Favourites only
                </label>
                <Button
                  variant="secondary"
                  disabled={
                    !search &&
                    !favouritesOnly &&
                    workoutType === 'all' &&
                    collection === 'all' &&
                    budgetMinutes === null &&
                    !budgetDraft &&
                    !budgetError
                  }
                  onClick={() => {
                    resetFilters();
                    clearFilterFeedback();
                    focusSearch();
                  }}
                >
                  Clear filters
                </Button>
              </div>
              <TimeBudgetFilter onChange={clearFilterFeedback} />
            </fieldset>
          )}
          {query.data && templates.length === 0 && (
            <p>
              {query.data.templates.length
                ? favouritesOnly ||
                  workoutType !== 'all' ||
                  collection !== 'all' ||
                  budgetMinutes !== null
                  ? 'No saved workouts match your filters.'
                  : 'No saved workouts match your search.'
                : 'Save a workout from any workout setup to see it here.'}
            </p>
          )}
        </>
      )}
      <SessionLibrary />
      {!query.isError && (
        <>
          <ul className="template-list">
            {templates.map((template) => (
              <li key={template.id}>
                <div className="template-summary">
                  <h3>{template.name}</h3>
                  <p>{workoutSummary(template.config)}</p>
                  <p>{budgetTimeLabel(template.config)}</p>
                  <p>
                    {query.data?.collections
                      .filter((c) => c.workoutIds.includes(template.id))
                      .map((c) => c.name)
                      .join(' · ') || 'Unfiled'}
                  </p>
                </div>
                <div className="template-actions">
                  <Button
                    variant="secondary"
                    disabled={busy}
                    aria-label={`Collections for ${template.name}`}
                    onClick={(event) => {
                      origin.current = event.currentTarget;
                      clearFilterFeedback();
                      setCollectionDialog(template);
                    }}
                  >
                    Collections
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={busy}
                    aria-pressed={!!template.favourite}
                    aria-label={`${template.favourite ? 'Unfavourite' : 'Favourite'} ${template.name}`}
                    onClick={(event) => void favourite(template, event.currentTarget)}
                  >
                    {template.favourite ? '★ Favourite' : '☆ Favourite'}
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={busy}
                    aria-label={`Preview ${template.name}`}
                    onClick={(event) => {
                      origin.current = event.currentTarget;
                      clearFilterFeedback();
                      setError(null);
                      setPreviewId(template.id);
                    }}
                  >
                    Preview
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={busy}
                    aria-label={`Export ${template.name}`}
                    onClick={(event) => {
                      origin.current = event.currentTarget;
                      clearFilterFeedback();
                      setExportId(template.id);
                    }}
                  >
                    Export
                  </Button>
                  {(['load', 'duplicate', 'rename', 'delete'] as const).map((type) => (
                    <Button
                      key={type}
                      variant={type === 'load' ? 'default' : 'secondary'}
                      disabled={busy}
                      aria-label={`${type[0].toUpperCase() + type.slice(1)} ${template.name}`}
                      onClick={(event) => {
                        origin.current = event.currentTarget;
                        setNotice('');
                        setHiddenCopy(false);
                        setHiddenRename(false);
                        setAction({ type, template });
                        setName(type === 'duplicate' ? copyName(template.name) : template.name);
                        setError(null);
                      }}
                    >
                      {type[0].toUpperCase() + type.slice(1)}
                    </Button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
      {collectionDialog && query.data && (
        <CollectionDialog
          reload={async () => {
            const result = await query.refetch();
            if (result.error) throw result.error;
            if (!result.data) throw new Error('Saved workouts unavailable.');
            return result.data;
          }}
          document={query.data}
          template={collectionDialog === 'manage' ? undefined : collectionDialog}
          mutate={mutation.mutateAsync}
          onClose={() => {
            setCollectionDialog(null);
            restoreFocus();
          }}
          onSaved={(message) => {
            const doc = client.getQueryData<import('./repository').TemplateDocument>(queryKey);
            const entry =
              collectionDialog === 'manage'
                ? undefined
                : doc?.templates.find((t) => t.id === collectionDialog.id);
            const hidden = !!doc && !!entry && !matchesTemplate(entry, filters, doc);
            setNotice(message + (hidden ? ' This workout is hidden by your current filters.' : ''));
            setMembershipNotice(hidden);
            setCollectionDialog(null);
            restoreFocus();
          }}
        />
      )}
      {importingCollection && (
        <CollectionImport
          onClose={() => {
            setImportingCollection(false);
            restoreFocus();
          }}
          onImported={(name) => {
            setImportingCollection(false);
            setNotice(
              `Collection “${name}” imported with independent workouts. Choose it in the Collection filter to view it; other filters still apply.`,
            );
            restoreFocus();
          }}
        />
      )}
      {exportCollectionId && (
        <CollectionExport
          id={exportCollectionId}
          onClose={() => {
            setExportCollectionId(null);
            restoreFocus();
          }}
          onSaved={() => {
            setExportCollectionId(null);
            setNotice('Collection file exported.');
            restoreFocus();
          }}
        />
      )}
      {importing && (
        <WorkoutImport
          onClose={() => {
            setImporting(false);
            restoreFocus();
          }}
          onImported={(entry) => {
            setImporting(false);
            const filters = useTemplateFilters.getState();
            const doc = client.getQueryData<import('./repository').TemplateDocument>(queryKey);
            const hidden = !!doc && !matchesTemplate(entry, filters, doc);
            setHiddenImport(hidden);
            setNotice(
              `Workout imported as “${entry.name}”.${hidden ? ' It is hidden by your current filters.' : ''}`,
            );
            restoreFocus();
          }}
        />
      )}
      {exportId && (
        <WorkoutExport
          id={exportId}
          onClose={() => {
            setExportId(null);
            restoreFocus();
          }}
          onSaved={() => {
            setExportId(null);
            setNotice('Workout file exported.');
            restoreFocus();
          }}
        />
      )}
      {previewId && (
        <WorkoutPreview
          key={previewId}
          id={previewId}
          onLoad={onLoad}
          onClose={() => {
            setPreviewId(null);
            restoreFocus();
          }}
        />
      )}
      {action && (
        <Dialog
          title={`${action.type[0].toUpperCase() + action.type.slice(1)} saved workout`}
          onClose={() => {
            if (!busy && !operationLock.current) closeAction();
          }}
        >
          <form
            className="template-form"
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            {action.type === 'rename' || action.type === 'duplicate' ? (
              <>
                {action.type === 'duplicate' && (
                  <p>
                    Create an independent copy of “{action.template.name}”. Your current setup stays
                    as it is.
                  </p>
                )}
                <label htmlFor={nameId}>Workout name</label>
                <Input
                  id={nameId}
                  maxLength={120}
                  required
                  value={name}
                  disabled={busy}
                  onChange={(event) => setName(event.target.value)}
                />
              </>
            ) : (
              <p>
                {action.type === 'delete'
                  ? `Delete “${action.template.name}”? This cannot be undone.`
                  : `Load “${action.template.name}”? This replaces the current setup for this workout mode.`}
              </p>
            )}
            {(action.type === 'duplicate' || action.type === 'delete') && (
              <section aria-label="Saved workout to review" className="template-review">
                <p>{workoutSummary(action.template.config)}</p>
                <p>
                  Lead-in: {action.template.config.leadInSeconds}s · Warning:{' '}
                  {action.template.config.warningSeconds}s
                </p>
                {action.template.config.type === 'ladder' && (
                  <p>
                    {action.template.config.ladder.rungs} rungs ·{' '}
                    {action.template.config.ladder.increment} rep increment ·{' '}
                    {action.template.config.timeCapSeconds
                      ? `${action.template.config.timeCapSeconds}s cap`
                      : 'No time cap'}
                  </p>
                )}
                {(action.template.config.type === 'countdown' ||
                  action.template.config.type === 'forTime') && (
                  <p>Checklist: {action.template.config.showChecklist !== false ? 'On' : 'Off'}</p>
                )}
                <details>
                  <summary>
                    Review exercises ({action.template.config.exercises?.length ?? 0})
                  </summary>
                  <ol>
                    {action.template.config.exercises?.map((exercise) => (
                      <li key={exercise.id}>
                        <strong>{exercise.name}</strong>
                        {exercise.target && <> · {formatTarget(exercise.target)}</>}
                        {exercise.description && <p>{exercise.description}</p>}
                      </li>
                    ))}
                  </ol>
                  {!action.template.config.exercises?.length && <p>No exercises specified.</p>}
                </details>
              </section>
            )}
            {notice && <p role="status">{notice}</p>}
            {error && (
              <>
                <p role="alert">{error}</p>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={busy}
                  onClick={() => void refresh()}
                >
                  Refresh saved workouts
                </Button>
              </>
            )}
            <div className="template-actions">
              <Button type="button" variant="secondary" disabled={busy} onClick={closeAction}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant={action.type === 'delete' ? 'destructive' : 'default'}
                disabled={
                  busy ||
                  ((action.type === 'rename' || action.type === 'duplicate') && !name.trim())
                }
              >
                {busy
                  ? action.type === 'load'
                    ? 'Loading…'
                    : 'Saving…'
                  : action.type === 'load'
                    ? 'Load workout'
                    : action.type === 'delete'
                      ? 'Delete workout'
                      : action.type === 'duplicate'
                        ? 'Create copy'
                        : 'Save name'}
              </Button>
            </div>
          </form>
        </Dialog>
      )}
    </section>
  );
}
