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
  const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;

  return {
    props: { event, googleMapsApiKey },
  };
};

const ShowEvent = ({
  event,
  googleMapsApiKey,
}: {
  event: EventRes;
  googleMapsApiKey: string;
}) => {
  const router = useRouter();
  const { init } = useUserConfig(router);

  useEffect(() => {
    init(googleMapsApiKey);
  }, []);

  return (
    <Page>
      <MetaEvent
        title={event.title}
        description={event.description}
        imageUrl={event.image_url}
      />
      <div className="mx-auto mt-3 max-w-xl">
        <EventCard
          event={event}
          upvoted={false}
          downvoted={false}
          details={true}
        />
      </div>
    </Page>
  );
};

export default ShowEvent;
