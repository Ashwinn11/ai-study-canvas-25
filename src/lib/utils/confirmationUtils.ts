import { create } from 'zustand';

interface ConfirmationState {
    isOpen: boolean;
    title: string;
    message: string;
    resolve: ((value: boolean) => void) | null;
    openConfirmation: (title: string, message: string) => Promise<boolean>;
    confirm: () => void;
    cancel: () => void;
}

export const useConfirmationStore = create<ConfirmationState>((set, get) => ({
    isOpen: false,
    title: '',
    message: '',
    resolve: null,

    openConfirmation: (title: string, message: string) => {
        return new Promise<boolean>((resolve) => {
            set({ isOpen: true, title, message, resolve });
        });
    },

    confirm: () => {
        const { resolve } = get();
        if (resolve) resolve(true);
        set({ isOpen: false, resolve: null });
    },

    cancel: () => {
        const { resolve } = get();
        if (resolve) resolve(false);
        set({ isOpen: false, resolve: null });
    },
}));

/**
 * Shows a delete confirmation dialog to the user
 * @param message - The message to display in the confirmation dialog
 * @returns Promise that resolves to true if user confirms, false otherwise
 */
export async function showDeleteConfirm(message: string): Promise<boolean> {
    return useConfirmationStore.getState().openConfirmation('Delete Confirmation', message);
}
