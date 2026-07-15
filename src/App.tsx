// src/App.tsx
// Root of the application. Provides auth context and renders the route tree.

import { Toaster } from "sonner";
import { AuthProvider } from "@/context/AuthContext";
import { AppRoutes } from "@/routes";

function App() {
  return (
    <AuthProvider>
      <Toaster
        position="top-right"
        richColors
        closeButton
        toastOptions={{
          duration: 4000,
        }}
      />
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;
