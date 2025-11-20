import Footer from '@/components/home/Footer';
import Header from '@/components/home/Header';
import PageContainer from '@/components/layout/page-container';

import React from 'react';

export default function HomeLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <PageContainer scrollable={true}>
      <div className='flex flex-1 flex-col space-y-2 -m-4 items-center'>
        <Header />
        <main className='w-full max-w-none mx-auto' >{children}</main>
        {/* <Footer /> */}
      </div>
    </PageContainer>
  )
}
