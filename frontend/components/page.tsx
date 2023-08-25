import BottomNav from '@/components/bottom-nav'
import TopNav from '@/components/top-nav'

interface Props {
	title?: string
	children: React.ReactNode
}

const Page = ({ children }: Props) => (
	<>
		<TopNav />
		<main
			/**
			 * Padding top = `appbar` height
			 * Padding bottom = `bottom-nav` height
			 */
			className='mx-auto max-w-screen-md pb-40 px-safe'
		>
			{children}
		</main>

		<BottomNav />
	</>
)

export default Page
