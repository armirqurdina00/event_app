import BottomNav from '@/components/bottom-nav';
import TopNav from '@/components/top-nav';

interface Props {
  title?: string;
  children: React.ReactNode;
}

const Page = ({ children }: Props) => (
  <>
    <TopNav />
    <main className="mx-auto min-h-screen max-w-screen-xl pb-28 px-safe">
      {children}
    </main>
    <BottomNav />
  </>
);

export default Page;
