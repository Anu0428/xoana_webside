'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { Navbar, Footer } from '@/components/layout/Navbar';
import { trafficApi } from '@/lib/api';

export default function LayoutShell({ children }: { children: ReactNode }) {
    const pathname = usePathname();

    const isAdmin = pathname === '/admin' || pathname.startsWith('/admin/');

    useEffect(() => {
        if (!isAdmin) {
            void trafficApi.track(pathname);
        }
    }, [pathname, isAdmin]);

    if (isAdmin) return <>{children}</>;

    return (
        <>
            <Navbar />
            {children}
            <Footer />
        </>
    );
}
