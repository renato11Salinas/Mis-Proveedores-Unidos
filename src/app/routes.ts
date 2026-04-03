import { createBrowserRouter } from 'react-router';
import { Dashboard } from './pages/Dashboard';
import { OrdenDetail } from './pages/OrdenDetail';
import { NuevaOrden } from './pages/NuevaOrden';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Dashboard,
  },
  {
    path: '/orden/:id',
    Component: OrdenDetail,
  },
  {
    path: '/nueva-orden',
    Component: NuevaOrden,
  },
]);
