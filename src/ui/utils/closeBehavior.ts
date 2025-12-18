export type CloseBehavior = 'ask' | 'exit' | 'minimize';

const STORAGE_KEY = 'closeBehaviorPreference';

const isCloseBehavior = (value: string | null): value is CloseBehavior =>
  value === 'exit' || value === 'minimize' || value === 'ask';

export const getCloseBehaviorPreference = (): CloseBehavior => {
  if (typeof localStorage === 'undefined') return 'ask';

  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && isCloseBehavior(stored)) {
    return stored;
  }
  return 'ask';
};

export const setCloseBehaviorPreference = (behavior: CloseBehavior) => {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, behavior);
};

export const resetCloseBehaviorPreference = () => {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
};

export const hasRememberedCloseBehavior = () => {
  const behavior = getCloseBehaviorPreference();
  return behavior === 'exit' || behavior === 'minimize';
};
