import React, { useEffect, useState } from 'react';
import { type GroupRes, GroupType } from '../utils/backend_client';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import TelegramIcon from '@mui/icons-material/Telegram';
import GroupsIcon from '@mui/icons-material/Groups';
import { useRouter } from 'next/router';
import EditIcon from '@mui/icons-material/Edit';
import { useUser } from '@auth0/nextjs-auth0/client';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  Typography,
} from '@mui/material';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Link from 'next/link';
import axios from 'axios';

const GroupCard = ({ group }: { group: GroupRes }) => {
  const router = useRouter();
  const { user } = useUser();
  const [showDescription, setShowDescription] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [openWhatsAppDialog, setOpenWhatsAppDialog] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);
  const [numberOfJoins, setNumberOfJoins] = useState(null);

  useEffect(() => {
    if (group) setNumberOfJoins(group.numberOfJoins);
  }, [group]);

  useEffect(() => {
    if (sessionStorage) {
      const sessionItem: string | null = sessionStorage.getItem(group.group_id);
      if (sessionItem !== null) setHasJoined(true);
    }
  }, [processing]);

  // Handle groups

  function handleEdit() {
    router.push({
      pathname: `/groups/${group.group_id}`,
      query: router.query,
    });
  }

  const handleCloseWhatsAppDialog = () => {
    localStorage.setItem('whatsAppLinkHintShown', 'true');
    setOpenWhatsAppDialog(false);
    handleJoin(); // Rufen Sie handleJoin erneut auf, um den Beitritt fortzusetzen
  };

  const handleJoin = async () => {
    // show dialog for whatsapp group join bug on android
    if (
      group.type === GroupType.WHATSAPP &&
      !localStorage.getItem('whatsAppLinkHintShown')
    ) {
      setOpenWhatsAppDialog(true);
      return;
    }

    // restrict join to three times per session
    const sessionItem: string | null = sessionStorage.getItem(group.group_id);

    if (sessionItem !== null) {
      router.push(group.link);
      return;
    } else {
      sessionStorage.setItem(group.group_id, '1');
    }

    if (processing) return;
    setProcessing(true);

    // incremet number of joins
    try {
      await axios.post(`/api/groups/${group.group_id}/joins`);
    } catch (err) {
      console.error(err);
    }

    setNumberOfJoins((preValue) => preValue + 1); // Note: null + 1 = 1 in js

    // open group link to join
    router.push(group.link);

    setProcessing(false);
  };

  // Render

  function getGroupIcon(type: GroupType) {
    if (type == GroupType.TELEGRAM) {
      return <TelegramIcon style={{ color: '#0088cc', fontSize: '30px' }} />;
    } else if (type == GroupType.WHATSAPP) {
      return <WhatsAppIcon style={{ color: '#25d366', fontSize: '30px' }} />;
    } else {
      return <GroupsIcon style={{ color: '#0088cc', fontSize: '30px' }} />;
    }
  }

  const EditButton = ({ group, user, handleEdit }) =>
    group.created_by === user?.sub ? (
      <button
        className="rounded-full bg-black bg-opacity-40 p-1"
        onClick={handleEdit}
        data-testid="edit-test-id"
      >
        <EditIcon color="primary" className="z-20 text-3xl" />
      </button>
    ) : null;

  const GroupEdit = ({ group, user, handleEdit }) => (
    <div className="absolute left-0 top-0 flex w-full justify-between p-2">
      <div />
      <div className="flex cursor-pointer gap-3 ">
        <EditButton group={group} user={user} handleEdit={handleEdit} />
      </div>
    </div>
  );

  const GroupContent = ({ group }: { group: GroupRes }) => (
    <div className="flex h-full flex-col justify-between gap-2 px-4 py-2">
      <div className="flex items-center gap-2">
        {getGroupIcon(group.type)}
        <h5 className="text-xl font-semibold tracking-tight text-gray-900">
          {group.title}
        </h5>
      </div>
      <div>
        <div className="flex items-center gap-1 font-medium text-gray-500">
          <LocationOnIcon className="text-md" />
          <p className="text-md">{group.location}</p>
        </div>
        <span className="text-sm text-gray-500">
          {numberOfJoins} sind hierüber beigetreten
        </span>
        <div className="flex gap-3">
          <div className="flex-grow">
            {!hasJoined ? (
              <Button
                data-testid="join-button-id"
                className="mt-1 w-full !bg-gray-300 text-black"
                onClick={handleJoin}
              >
                <div className="flex items-center gap-2">
                  <GroupAddIcon />
                  <span>Beitreten</span>
                </div>
              </Button>
            ) : (
              <Button
                data-testid="join-button-id"
                className="mt-1 w-full cursor-default !bg-blue-100 text-blue-600"
                onClick={handleJoin}
              >
                <div className="flex items-center gap-2">
                  <GroupAddIcon />
                  <span>Beigetreten</span>
                </div>
              </Button>
            )}
          </div>
          {group.description && (
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
      {showDescription && group.description && (
        <div>
          <Typography variant="body1" className="mx-3 mb-3 mt-3 select-text">
            {formatTextForDisplay(group.description)}
          </Typography>
        </div>
      )}
    </div>
  );

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

  return (
    <div className="relative mx-5 rounded-xl border border-gray-200 bg-white shadow">
      <GroupEdit group={group} user={user} handleEdit={handleEdit} />
      <GroupContent group={group} />
      <Dialog
        open={openWhatsAppDialog}
        onClose={() => {
          setOpenWhatsAppDialog(false);
        }}
      >
        <DialogContent>
          <Typography variant="h6">WhatsApp Link Hinweis</Typography>
          <Typography>
            Bei Android kann es vorkommen, dass WhatsApp-Links beim ersten Mal
            nicht direkt funktionieren. Sollte das der Fall sein, einfach
            nochmal probieren.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            data-testid="confirm-whatsapp-test-id"
            onClick={handleCloseWhatsAppDialog}
            color="primary"
          >
            Verstanden
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default GroupCard;
