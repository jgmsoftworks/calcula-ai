import { createContext, useContext, ReactNode } from 'react';
import { useActivityLog } from '@/hooks/useActivityLog';

interface ActivityContextType {
  logActivity: (
    action: string,
    tableName?: string,
    recordId?: string,
    description?: string,
    value?: string
  ) => Promise<void>;
}

const ActivityContext = createContext<ActivityContextType | undefined>(undefined);

export const ActivityProvider = ({ children }: { children: ReactNode }) => {
  const { logActivity } = useActivityLog();

  return (
    <ActivityContext.Provider value={{ logActivity }}>
      {children}
    </ActivityContext.Provider>
  );
};

export const useActivity = () => {
  const context = useContext(ActivityContext);
  if (!context) {
    throw new Error('useActivity must be used within an ActivityProvider');
  }
  return context;
};