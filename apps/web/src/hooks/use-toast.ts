import { useState, useEffect, useCallback } from 'react';

type Toast = {
  id: string;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  variant?: 'default' | 'destructive';
  duration?: number;
};

type ToastState = {
  toasts: Toast[];
};

type ToastAction = 
  | { type: 'ADD_TOAST'; toast: Omit<Toast, 'id'> }
  | { type: 'REMOVE_TOAST'; id: string }
  | { type: 'DISMISS_TOAST'; id?: string }
  | { type: 'UPDATE_TOAST'; id: string; updates: Partial<Toast> };

const toastState: ToastState = { toasts: [] };
const listeners: Array<(state: ToastState) => void> = [];

function dispatch(action: ToastAction) {
  switch (action.type) {
    case 'ADD_TOAST':
      const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      toastState.toasts = [ ...toastState.toasts, { ...action.toast, id } ];
      break;
    case 'REMOVE_TOAST':
      toastState.toasts = toastState.toasts.filter(toast => toast.id !== action.id);
      break;
    case 'DISMISS_TOAST':
      if (action.id) {
        toastState.toasts = toastState.toasts.filter(toast => toast.id !== action.id);
      } else {
        toastState.toasts = [];
      }
      break;
    case 'UPDATE_TOAST':
      toastState.toasts = toastState.toasts.map(toast =>
        toast.id === action.id ? { ...toast, ...action.updates } : toast
      );
      break;
  }

  listeners.forEach(listener => listener(toastState));
}

export function useToast() {
  const [state, setState] = useState<ToastState>(toastState);

  useEffect(() => {
    listeners.push(setState);
    return () => {
      const index = listeners.indexOf(setState);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }, []);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    dispatch({ type: 'ADD_TOAST', toast });
  }, []);

  const removeToast = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_TOAST', id });
  }, []);

  const dismissToast = useCallback((id?: string) => {
    dispatch({ type: 'DISMISS_TOAST', id });
  }, []);

  const updateToast = useCallback((id: string, updates: Partial<Toast>) => {
    dispatch({ type: 'UPDATE_TOAST', id, updates });
  }, []);

  return {
    ...state,
    toast: addToast,
    dismiss: dismissToast,
    update: updateToast,
  };
}