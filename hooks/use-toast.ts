import { toast } from 'sonner';

export interface Toast {
  id: string;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  variant?: 'default' | 'destructive';
}

interface ToastProps {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
  action?: React.ReactNode;
}

export function useToast() {
  return {
    toast: ({ title, description, variant = 'default', action }: ToastProps) => {
      if (variant === 'destructive') {
        return toast.error(title || description || 'An error occurred', {
          description: title ? description : undefined,
          action,
        });
      }
      
      return toast.success(title || description || 'Success', {
        description: title ? description : undefined,
        action,
      });
    },
    dismiss: (toastId?: string) => toast.dismiss(toastId),
  };
}