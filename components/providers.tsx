"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <Toaster
        position="bottom-right"
        toastOptions={{
          classNames: {
            toast:       "!rounded-xl !shadow-lg !border !border-gray-100",
            success:     "!bg-white !text-gray-900",
            error:       "!bg-white !text-gray-900",
            info:        "!bg-white !text-gray-900",
            description: "!text-gray-500",
          },
        }}
      />
    </SessionProvider>
  );
}
