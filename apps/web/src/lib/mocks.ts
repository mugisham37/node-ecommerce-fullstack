// Temporary mocks for missing dependencies
// These will be replaced once the proper packages are installed

// Mock tRPC
export const api = {
  auth: {
    login: {
      useMutation: () => ({
        mutateAsync: async () => ({ user: null, token: '' }),
        isPending: false,
      }),
    },
    register: {
      useMutation: () => ({
        mutateAsync: async () => ({ user: null, token: '' }),
        isPending: false,
      }),
    },
    forgotPassword: {
      useMutation: () => ({
        mutateAsync: async () => ({}),
        isPending: false,
      }),
    },
    refreshToken: {
      useMutation: () => ({
        mutateAsync: async () => ({ user: null, token: '' }),
        isPending: false,
      }),
    },
  },
  createClient: () => ({}),
  Provider: ({ children }: { children: React.ReactNode }) => children,
  useUtils: () => ({}),
};

// Mock validation schemas
export const LoginCredentialsSchema = {
  parse: (data: any) => data,
};

export const RegisterDataSchema = {
  parse: (data: any) => data,
  extend: () => ({
    refine: () => RegisterDataSchema,
  }),
  shape: {
    password: { parse: (data: any) => data },
  },
};

export const PasswordResetSchema = {
  parse: (data: any) => data,
};

// Mock form hooks
export const useForm = () => ({
  register: () => ({}),
  handleSubmit: (fn: any) => fn,
  formState: { errors: {}, isSubmitting: false },
  setError: () => {},
  getValues: () => ({}),
  watch: () => ({}),
});

export const zodResolver = () => ({});

// Mock query client
export const QueryClient = class {
  constructor() {}
};

export const QueryClientProvider = ({ children }: { children: React.ReactNode }) => children;
export const ReactQueryDevtools = () => null;

// Mock zustand
export const create = (fn: any) => fn(() => ({}));
export const persist = (fn: any) => fn;