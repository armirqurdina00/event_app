import { withPageAuthRequired } from '@auth0/nextjs-auth0';
import {
  BackendClient,
} from '../../utils/backend_client';
import EventCard from '@/components/event-card';
import Page from '@/components/page';

export const getServerSideProps = withPageAuthRequired({
  getServerSideProps: async (context) => {
    const { event_id } = context.query;

    const backend_client = new BackendClient({
      BASE: process.env.BACKEND_URL
    });

    const event = await backend_client.events.getEvent(event_id as string);

    return {
      props: { event }
    };
  }
});

const ShowEvent = ({ event }) => {
  return (
    <Page>
      <div className='mx-auto max-w-xl'>
        <div className='relative mx-3 mt-4'>
          <EventCard
            event={event}
            upvoted={event.upvotes_sum}
            downvoted={event.downvotes_sum}
            details
          />
        </div>
      </div>
    </Page>
  );
};

export default ShowEvent;