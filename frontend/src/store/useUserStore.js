import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useUserStore = create(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      
      setUser: (userData) => {
        console.log('=== SETTING USER ===');
        console.log('User data:', userData);
        console.log('User ID:', userData?._id);
        console.log('===================');
        
        if (!userData) {
          console.error('Cannot set user: userData is null/undefined');
          return;
        }
        
        set({ user: userData, isAuthenticated: true });
      },

      clearUser: () => {
        console.log('Clearing user');
        set({ user: null, isAuthenticated: false });
      },
    }),
    {
      name: 'User-storage',
      getStorage: () => localStorage,
    }
  )
);

export default useUserStore;