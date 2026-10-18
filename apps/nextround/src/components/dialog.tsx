import { type ReactNode, type RefObject, useEffect, useRef } from 'react';
export function Dialog({
  title,
  children,
  onClose,
  className = '',
  initialFocus,
}: {
  className?: string;
  initialFocus?: RefObject<HTMLElement | null>;
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const initialFocusOnMount = useRef(initialFocus);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = ref.current;
    const focusTarget = initialFocusOnMount.current?.current;
    // Let the native dialog focus algorithm choose the intended control on opening.
    if (focusTarget) focusTarget.setAttribute('autofocus', '');
    dialog?.showModal();
    focusTarget?.focus({ preventScroll: true });
    return () => {
      focusTarget?.removeAttribute('autofocus');
      dialog?.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`dialog ${className}`}
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }}
    >
      <h2>{title}</h2>
      {children}
    </dialog>
  );
}
