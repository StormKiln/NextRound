import { validateConfig } from '@nextround/core';
import { useValidationAttempts } from '@/state/setup-validation';
import { useWorkout, type WorkoutMode } from '@/state/workout';
export function useSetupValidation(mode: WorkoutMode) {
  const state = useWorkout();
  const attempted = useValidationAttempts((s) => !!s.modes[mode]);
  const config = state.getDraftConfig(mode);
  const errors = attempted ? validateConfig(config) : {};
  const validate = () => {
    useValidationAttempts.getState().mark(mode);
    const next = validateConfig(useWorkout.getState().getDraftConfig(mode));
    if (Object.keys(next).length)
      requestAnimationFrame(() => {
        const input = document.querySelector<HTMLElement>(
          'main [aria-invalid="true"], main [data-invalid-exercises="true"] button',
        );
        input?.focus();
        input?.scrollIntoView({ block: 'nearest' });
      });
    return Object.keys(next).length === 0;
  };
  return { errors, validate, getConfig: () => useWorkout.getState().getDraftConfig(mode) };
}
export function SetupErrors({ errors, mode }: { errors: Record<string, string>; mode: string }) {
  return (
    <div role={Object.keys(errors).some((key) => key !== 'exercises') ? 'alert' : undefined}>
      {Object.entries(errors)
        .filter(([key]) => key !== 'exercises')
        .map(([key, message]) => (
          <p id={`${mode}-error-${key}`} className="error" key={key}>
            {message}
          </p>
        ))}
    </div>
  );
}
