import { Outlet } from 'react-router-dom';
import { AppLayout } from './AppLayout';

export const AppLayoutRoute = () => (
  <AppLayout>
    <Outlet />
  </AppLayout>
);

export default AppLayoutRoute;
