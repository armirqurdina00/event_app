import { BackendClient, EventRes } from '../../utils/backend_client';
import EventCard from '@/components/event-card';
import Page from '@/components/page';
import { useUserConfig } from '@/hooks/useUserConfig';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import MetaEvent from '@/components/meta-event';

export const getServerSideProps = async (context) => {
  const { event_id } = context.query;

  const backend_client = new BackendClient({
    BASE: process.env.BACKEND_URL,
  });

  const event = await backend_client.events.getEvent(event_id as string);

  return {
    props: { event },
  };
};

const ShowEvent = ({ event }: { event: EventRes }) => {
  const router = useRouter();
  const { init } = useUserConfig(router);

  useEffect(() => {
    init();
  }, []);

  return (
    <Page>
      <MetaEvent
        title={event.title}
        description={event.description}
        imageUrl={event.image_url}
      />
      <div className="mx-auto mt-3 max-w-xl">
        <EventCard event={event} details={true} />
      </div>
    </Page>
  );
};

export default ShowEvent;
