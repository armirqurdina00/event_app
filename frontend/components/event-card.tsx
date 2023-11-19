import React, { useState, useEffect } from 'react';
import { type EventRes } from '../utils/backend_client';
import 'moment/locale/de';
import EditIcon from '@mui/icons-material/Edit';
import { useRouter } from 'next/router';
import {
  Button,
  Typography,
  Popover,
  List,
  ListItem,
  ListItemText,
  Dialog,
  DialogActions,
  DialogContent,
} from '@mui/material';
import { useUser } from '@auth0/nextjs-auth0/client';
import axios from 'axios';
import Image from 'next/image';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Link from 'next/link';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import {
  TelegramShareButton,
  TelegramIcon,
  WhatsappShareButton,
  WhatsappIcon,
} from 'react-share';
import ShareIcon from '@mui/icons-material/Share';
import DayDisplay from './day-display';
import { atcb_action } from 'add-to-calendar-button';
import EditCalendarIcon from '@mui/icons-material/EditCalendar';
import LaunchIcon from '@mui/icons-material/Launch';

const EventCard = ({
  event,
  upvoted,
  downvoted,
  details = false,
}: {
  event: EventRes;
  upvoted: boolean;
  downvoted: boolean;
  details: boolean;
}) => {
  const { user } = useUser();
  const router = useRouter();
  const [votesDiff, setVotesDiff] = useState(event.votes_diff);
  const [upvoteClicked, setUpvoteClicked] = useState(upvoted);
  const [processing, setProcessing] = useState(false);
  const [showDescription, setShowDescription] = useState(details);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentUrl, setCurrentUrl] = useState(null);
  const [openJoinDialog, setOpenJoinDialog] = useState(false);

  useEffect(() => {
    setVotesDiff(event.votes_diff);
  }, [event]);

  useEffect(() => {
    setUpvoteClicked(upvoted);
  }, [upvoted]);

  useEffect(() => {
    setUpvoteClicked(downvoted);
  }, [downvoted]);

  useEffect(() => {
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.delete('source');
    const urlWithParams = `${window.location.origin}/events/${event.event_id}${currentUrl.search}`;
    setCurrentUrl(urlWithParams);
  }, [event.event_id]);

  // Handle Events

  const handleLogIn = async () => {
    setOpenJoinDialog(false);
    router.push('/api/auth/login');
  };

  function handleEdit() {
    router.push({
      pathname: `/events/${event.event_id}/edit`,
      query: router.query,
    });
  }

  function handleUrl() {
    if (!event.url) return;
    window.open(event.url, '_blank');
  }

  const handleLocationUrl = () => {
    if (!event.locationUrl) return;
    window.open(event.locationUrl, '_blank');
  };

  async function handleAddToCalendar(evt) {
    if (!user) {
      setOpenJoinDialog(true);
      return;
    }

    try {
      if (processing) return;
      setProcessing(true);
      if (upvoteClicked) {
        setUpvoteClicked(false);
        await axios.delete(
          `/api/users/${user.sub}/events/${event.event_id}/upvotes`
        );
        setVotesDiff((preValue) => preValue - 1);
      } else {
        setUpvoteClicked(true);
        await axios.post(
          `/api/users/${user.sub}/events/${event.event_id}/upvotes`
        );
        setVotesDiff((preValue) => preValue + 1);
        showAddToCalenderModal(evt);
      }
    } finally {
      setProcessing(false);
    }
  }

  const showAddToCalenderModal = (evt) => {
    atcb_action(
      {
        name: event.title,
        description: event.description,
        location: `${event.location}`,
        startDate: new Date(event.unix_time).toISOString().split('T')[0],
        startTime: new Date(event.unix_time).toTimeString().substring(0, 5),
        endTime: new Date(event.unix_time).toTimeString().substring(0, 5),
        timeZone: 'currentBrowser',
        options: ['Google', 'Apple', 'Outlook.com', 'iCal'],
      },
      evt.currentTarget
    );
  };

  const handleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Render

  const formatTextForDisplay = (inputText) => {
    if (!inputText) return;

    const urlPattern = /https?:\/\/[^\s]+/g;

    const convertStrToLinks = (str) => {
      let lastIndex = 0;
      const result = [];

      str.replace(urlPattern, (match, offset) => {
        // Add plain text before the match
        if (offset > lastIndex) {
          result.push(str.substring(lastIndex, offset));
        }

        // Add the link
        result.push(
          <Link className="break-words text-blue-500" href={match} key={match}>
            {match}
          </Link>
        );

        // Update the last index past this match
        lastIndex = offset + match.length;
      });

      // Add any remaining plain text
      if (lastIndex < str.length) {
        result.push(str.substring(lastIndex));
      }

      return result;
    };

    return inputText.split('\n').map((str, index, array) => (
      <React.Fragment key={index}>
        {convertStrToLinks(str)}
        {index === array.length - 1 ? null : <br />}
      </React.Fragment>
    ));
  };

  const ShareButtons = ({ currentUrl }) => {
    const [anchorEl, setAnchorEl] = useState(null);
    const handleClick = (e) => {
      setAnchorEl(e.currentTarget);
    };
    const handleClose = () => {
      setAnchorEl(null);
    };

    return (
      <>
        <button
          onClick={handleClick}
          className="cursor-pointer rounded-full bg-black bg-opacity-70 p-1"
        >
          <ShareIcon color="primary" className="z-10 text-3xl" />
        </button>
        <SharePopover
          anchorEl={anchorEl}
          onClose={handleClose}
          currentUrl={currentUrl}
        />
      </>
    );
  };

  const SharePopover = ({ anchorEl, onClose, currentUrl }) => (
    <Popover
      open={Boolean(anchorEl)}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'center',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'center',
      }}
    >
      <List>
        <ListItem button>
          <WhatsappShareButton url={currentUrl} onClick={onClose}>
            <ListItemText
              primary={
                <div className="flex items-center gap-3">
                  <WhatsappIcon size={32} round={true} /> Share on Whatsapp
                </div>
              }
            />
          </WhatsappShareButton>
        </ListItem>
        <ListItem button>
          <TelegramShareButton url={currentUrl} onClick={onClose}>
            <ListItemText
              primary={
                <div className="flex items-center gap-3">
                  <TelegramIcon size={32} round={true} /> Share on Telegram
                </div>
              }
            />
          </TelegramShareButton>
        </ListItem>
      </List>
    </Popover>
  );

  const CalendarButton = () =>
    upvoteClicked ? (
      <Button
        className="mt-1 w-full !bg-blue-100 text-blue-600"
        onClick={handleAddToCalendar}
      >
        <div className="flex items-center gap-2">
          <EditCalendarIcon color="primary" />
          <span className="font-bold"> Im Kalender gespeichert</span>
        </div>
      </Button>
    ) : (
      <Button
        className="mt-1 w-full !bg-gray-300 text-black"
        onClick={handleAddToCalendar}
      >
        <div className="flex items-center gap-2">
          <EditCalendarIcon />
          <span> Im Kalender speichern</span>
        </div>
      </Button>
    );

  return (
    <div className="relative mx-5 rounded-xl border border-gray-200 bg-white shadow">
      <div className="relative w-full">
        <Image
          className={'event-img-16-9 rounded-t-xl object-cover'}
          src={event.image_url}
          alt="Event Picture"
          layout="responsive"
          width={16}
          height={9}
          objectFit="cover"
          quality={100}
          data-testid="event-picture"
          unoptimized={true}
          onClick={handleFullscreen}
        />
        {isFullscreen && (
          <div
            className="fixed left-0 top-0 z-40 flex h-screen w-screen items-center justify-center overflow-y-auto bg-black bg-opacity-70"
            onClick={handleFullscreen}
          >
            <img src={event.image_url} alt="Description" />
          </div>
        )}
        <div className="absolute left-0 top-0 flex w-full  justify-between p-2">
          <div className="flex-grow" onClick={handleFullscreen} />
          <div className="flex flex-col gap-4">
            {event.url && (
              <button
                className="cursor-pointer rounded-full bg-black bg-opacity-70 p-1"
                onClick={handleUrl}
                data-testid="edit-test-id"
              >
                <LaunchIcon color="primary" className="z-10 text-3xl" />
              </button>
            )}
            <ShareButtons currentUrl={currentUrl} />
            {event.created_by === user?.sub && (
              <button
                className="cursor-pointer rounded-full bg-black bg-opacity-70 p-1"
                onClick={handleEdit}
                data-testid="edit-test-id"
              >
                <EditIcon color="primary" className="z-10 text-3xl" />
              </button>
            )}
          </div>
        </div>
      </div>
      <div className="px-3 py-2">
        <div className="-my-0.5 flex items-center justify-between">
          <DayDisplay unix_time={event.unix_time} />
          <div />
        </div>
        <div
          className="-my-0.5 flex cursor-pointer justify-between"
          onClick={() => {
            setShowDescription(!showDescription);
          }}
        >
          <h4 className="text-xl font-semibold tracking-tight">
            {event.title}
          </h4>
        </div>
        <div className="text-md -my-0.5 flex justify-between font-medium text-gray-500 ">
          <div
            className="flex max-w-xs cursor-pointer items-center gap-1"
            onClick={handleLocationUrl}
          >
            <LocationOnIcon className="text-sm" />
            <p className="truncate">{event.location}</p>
          </div>
          <div />
        </div>
        <div className="w-full text-gray-500">
          <span className="text-sm">{votesDiff} sind interessiert</span>
          <div className="flex gap-1">
            <div className="flex-grow">
              <CalendarButton />
            </div>
            {event.description && (
              <div>
                {showDescription ? (
                  <Button
                    className="mt-1 w-full !bg-blue-100 text-blue-600"
                    onClick={() => {
                      setShowDescription(!showDescription);
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <ExpandMoreIcon color="primary" />
                    </div>
                  </Button>
                ) : (
                  <Button
                    className="mt-1 w-full !bg-gray-300 text-black"
                    onClick={() => {
                      setShowDescription(!showDescription);
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <ExpandMoreIcon />
                    </div>
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      {showDescription && event.description && (
        <div>
          <Typography
            variant="body1"
            className="mx-3 mb-3 mt-3 select-text overflow-clip"
          >
            {formatTextForDisplay(event.description)}
          </Typography>
        </div>
      )}
      <Dialog
        open={openJoinDialog}
        onClose={() => {
          setOpenJoinDialog(false);
        }}
      >
        <DialogContent>
          {/* Hier können Sie den Text und die Erklärung für die Anmeldung anzeigen */}
          <Typography variant="h6">Anmeldung erforderlich</Typography>
          <Typography>
            {' '}
            Angemeldet kannst du zudem den WhatsApp und Telegram Gruppen
            beitreten.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setOpenJoinDialog(false);
            }}
            color="primary"
          >
            Schließen
          </Button>
          <Button
            onClick={handleLogIn}
            color="primary"
            data-testid="login-test-id"
          >
            Jetzt anmelden
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default EventCard;
