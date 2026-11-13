import { createContext, useContext } from 'react';

interface ActivityContextType {
  logActivity: (
    action: string,
    tableName?: string,
    recordId?: string,
    description?: string,
    value?: string
  ) => Promise<void>;
}

export const ActivityContext = createContext<ActivityContextType | undefined>(undefined);

export const useActivity = () => {
  const context = useContext(ActivityContext);
  if (!context) {
    throw new Error('useActivity must be used within an ActivityProvider');
  }
  return context;
};
