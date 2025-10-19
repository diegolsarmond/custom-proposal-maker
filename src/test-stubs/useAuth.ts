export const useAuth = () => ({
  user: null,
  session: null,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  signOut: async () => {},
  loading: false,
});
