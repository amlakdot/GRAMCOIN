import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Toaster } from "sonner";
import { Dashboard } from "@/components/dashboard";

export default function App() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { refetchOnWindowFocus: false, retry: 1, staleTime: 30_000 },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <Dashboard />
      <Toaster
        theme="dark"
        position="bottom-center"
        dir="rtl"
        toastOptions={{
          style: {
            background: "#161c26",
            border: "1px solid #243041",
            color: "#f0f3f6",
            fontFamily: "Vazirmatn, sans-serif",
          },
        }}
      />
    </QueryClientProvider>
  );
}
