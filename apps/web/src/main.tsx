import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router';
import AdminLayout from './pages/admin/AdminLayout';
import Dashboard from './pages/admin/Dashboard';
import DataEdit from './pages/admin/DataEdit';
import Files from './pages/admin/Files';
import Login from './pages/admin/Login';
import PostEdit from './pages/admin/PostEdit';
import Posts from './pages/admin/Posts';
import ProfileEdit from './pages/admin/ProfileEdit';
import Reports from './pages/admin/Reports';
import Users, { ChangePassword } from './pages/admin/Users';
import Data from './pages/public/Data';
import Dokumen from './pages/public/Dokumen';
import Home from './pages/public/Home';
import Kabar from './pages/public/Kabar';
import KabarDetail from './pages/public/KabarDetail';
import Pengaduan from './pages/public/Pengaduan';
import Profil from './pages/public/Profil';
import './styles.css';
import { NotFound, PublicLayout } from './ui';

const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/profil', element: <Profil /> },
      { path: '/kabar', element: <Kabar /> },
      { path: '/kabar/:id', element: <KabarDetail /> },
      { path: '/data', element: <Data /> },
      { path: '/dokumen', element: <Dokumen /> },
      { path: '/pengaduan', element: <Pengaduan /> },
      { path: '*', element: <NotFound /> },
    ],
  },
  { path: '/kelola/masuk', element: <Login /> },
  {
    path: '/kelola',
    element: <AdminLayout />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'pengaduan', element: <Reports /> },
      { path: 'kabar', element: <Posts /> },
      { path: 'kabar/:id', element: <PostEdit /> },
      { path: 'dokumen', element: <Files /> },
      { path: 'data', element: <DataEdit /> },
      { path: 'profil', element: <ProfileEdit /> },
      { path: 'akun', element: <Users /> },
      { path: 'kata-sandi', element: <ChangePassword /> },
    ],
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
