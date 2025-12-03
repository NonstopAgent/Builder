import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Tab } from "../types";

type PanelVisibility = {
  showPreview: boolean;
  showChat: boolean;
  showTerminal: boolean;
};

interface UIState {
  currentProjectId?: string;
  setCurrentProjectId: (id?: string) => void;
  selectedTaskId?: string;
  setSelectedTaskId: (id?: string) => void;
  tabs: Tab[];
  activeTabId?: string;
  addTab: (tab: Omit<Tab, "id"> & { id?: string }) => void;
  closeTab: (id: string) => void;
  setActiveTab: (id?: string) => void;
  updateTabContent: (id: string, content: string) => void;
  panelVisibility: PanelVisibility;
  togglePanel: (panel: keyof PanelVisibility) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      currentProjectId: undefined,
      setCurrentProjectId: (id) => set({ currentProjectId: id }),
      selectedTaskId: undefined,
      setSelectedTaskId: (id) => set({ selectedTaskId: id }),
      tabs: [],
      activeTabId: undefined,
      addTab: (tab) =>
        set((state) => {
          const id = tab.id ?? crypto.randomUUID();
          if (state.tabs.some((t) => t.id === id || t.path === tab.path)) {
            return {
              ...state,
              activeTabId: state.tabs.find((t) => t.id === id || t.path === tab.path)?.id,
            };
          }
          return {
            ...state,
            tabs: [...state.tabs, { ...tab, id }],
            activeTabId: id,
          };
        }),
      closeTab: (id) =>
        set((state) => {
          const filtered = state.tabs.filter((tab) => tab.id !== id);
          const activeTabId = state.activeTabId === id ? filtered.at(-1)?.id : state.activeTabId;
          return { ...state, tabs: filtered, activeTabId };
        }),
      setActiveTab: (id) => set({ activeTabId: id }),
      updateTabContent: (id, content) =>
        set((state) => ({
          tabs: state.tabs.map((tab) => (tab.id === id ? { ...tab, content, isDirty: true } : tab)),
        })),
      panelVisibility: {
        showPreview: true,
        showChat: true,
        showTerminal: true,
      },
      togglePanel: (panel) =>
        set((state) => ({
          panelVisibility: { ...state.panelVisibility, [panel]: !state.panelVisibility[panel] },
        })),
    }),
    {
      name: "super-builder-ui",
      partialize: (state) => ({
        panelVisibility: state.panelVisibility,
        tabs: state.tabs.map((tab) => ({ ...tab, content: "" })),
      }),
    }
  )
);
