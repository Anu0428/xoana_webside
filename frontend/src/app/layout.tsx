import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { Providers } from "@/components/ui/providers";
import LayoutShell from '@/components/layout/LayoutShell';

export const metadata: Metadata = {
    title: "XOANA - 独立手指滑板品牌",
    description: "XOANA是一个专注于独立手指滑板的品牌，每一块指板都是独立手工打造",
};

export default async function RootLayout({
                                             children,
                                         }: {
    children: React.ReactNode;
}) {
    const locale = await getLocale();
    const messages = await getMessages();

    return (
        <html lang={locale} suppressHydrationWarning>
        <body
            className="min-h-screen flex flex-col"
            style={{
                fontFamily:
                    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            }}
        >
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
            <NextIntlClientProvider messages={messages}>
                <Providers>
                    <LayoutShell>
                        <main className="flex-1">{children}</main>
                    </LayoutShell>
                </Providers>
            </NextIntlClientProvider>
        </ThemeProvider>
        </body>
        </html>
    );
}
