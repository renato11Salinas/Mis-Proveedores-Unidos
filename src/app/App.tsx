import { RouterProvider } from 'react-router';
import { router } from './routes';
import { Toaster } from './components/ui/sonner';
import { useUppercaseInputs } from './hooks/useUppercaseInputs';

export default function App() {
  useUppercaseInputs();

  return (
    <>
      <RouterProvider router={router} />
      <Toaster />
    </>
  );
}