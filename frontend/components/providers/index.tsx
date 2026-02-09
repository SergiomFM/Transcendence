import React from "react";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { ThemeProvider } from "./theme-provider";
import { AuthProvider } from "./auth-provider";

const Providers = async ({ children }: { children: React.ReactNode }) => {
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      <ThemeProvider>
        <AuthProvider>{children}</AuthProvider>
      </ThemeProvider>
    </NextIntlClientProvider>
  );
};

export default Providers;
