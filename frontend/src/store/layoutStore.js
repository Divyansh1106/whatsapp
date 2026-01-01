import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useLayoutStore = create(
  persist(
    (set) => ({
      // which tab is active: 'chats' | 'status' | 'profile' | 'setting'
      activeTab: 'chats',

      // currently selected chat (null if none)
      selectedContact: null,

      setSelectedContact: (contact) => {
        set({ selectedContact: contact });
      },

      setActiveTab: (activeTab) => {
        set({ activeTab });
      },
    }),
    {
      name: 'layout-storage',
      getStorage: () => localStorage,
    }
  )
);

export default useLayoutStore;
