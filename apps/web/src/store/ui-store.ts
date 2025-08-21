import { create } from '@/lib/mocks';

interface UIState {
  sidebarOpen: boolean;
  mobileMenuOpen: boolean;
  loading: boolean;
  globalError: string | null;
}

interface UIActions {
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setMobileMenuOpen: (open: boolean) => void;
  toggleMobileMenu: () => void;
  setLoading: (loading: boolean) => void;
  setGlobalError: (error: string | null) => void;
  clearGlobalError: () => void;
}

type UIStore = UIState & UIActions;

const initialState: UIState = {
  sidebarOpen: true,
  mobileMenuOpen: false,
  loading: false,
  globalError: null,
};

export const useUIStore = create<UIStore>((set) => ({
  ...initialState,
  
  setSidebarOpen: (sidebarOpen: boolean) => {
    set({ sidebarOpen });
  },
  
  toggleSidebar: () => {
    set((state) => ({ sidebarOpen: !state.sidebarOpen }));
  },
  
  setMobileMenuOpen: (mobileMenuOpen: boolean) => {
    set({ mobileMenuOpen });
  },
  
  toggleMobileMenu: () => {
    set((state) => ({ mobileMenuOpen: !state.mobileMenuOpen }));
  },
  
  setLoading: (loading: boolean) => {
    set({ loading });
  },
  
  setGlobalError: (globalError: string | null) => {
    set({ globalError });
  },
  
  clearGlobalError: () => {
    set({ globalError: null });
  },
}));

// Selectors
export const useSidebar = () => useUIStore((state) => ({
  isOpen: state.sidebarOpen,
  toggle: state.toggleSidebar,
  setOpen: state.setSidebarOpen,
}));

export const useMobileMenu = () => useUIStore((state) => ({
  isOpen: state.mobileMenuOpen,
  toggle: state.toggleMobileMenu,
  setOpen: state.setMobileMenuOpen,
}));

export const useGlobalLoading = () => useUIStore((state) => ({
  loading: state.loading,
  setLoading: state.setLoading,
}));

export const useGlobalError = () => useUIStore((state) => ({
  error: state.globalError,
  setError: state.setGlobalError,
  clearError: state.clearGlobalError,
}));