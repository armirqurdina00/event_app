import { useRouter } from 'next/router';
import Button from '@mui/material/Button';
import { useUser } from '@auth0/nextjs-auth0/client';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import GroupsIcon from '@mui/icons-material/Groups';
import EventIcon from '@mui/icons-material/Event';
import {
  Dialog,
  DialogActions,
  DialogContent,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { useTranslation } from 'next-i18next';

const BottomNav = () => {
  const router = useRouter();
  const { user } = useUser();
  const [openJoinDialog, setOpenJoinDialog] = useState(false);

  function handle(href) {
    delete router.query.event_id;
    delete router.query.group_id;
    router.push({
      pathname: href,
      query: router.query,
    });
  }

  const handleLogIn = async () => {
    setOpenJoinDialog(false);
    router.push('/api/auth/login');
  };

  const add = () => {
    if (!user) {
      setOpenJoinDialog(true);
      return;
    }
    if (/^\/groups*/.test(router.pathname)) {
      delete router.query.event_id;
      delete router.query.group_id;
      router.push({
        pathname: '/groups/new',
        query: router.query,
      });
    } else if (/^\/events*/.test(router.pathname)) {
      delete router.query.event_id;
      delete router.query.group_id;
      router.push({
        pathname: '/events/new',
        query: router.query,
      });
    }
  };

  const { t } = useTranslation('common');

  return (
    <div className="">
      <nav className="fixed bottom-0 z-30 w-full border-t bg-zinc-100 pb-safe">
        <div className="mx-auto flex h-14 max-w-md items-center justify-between px-6">
          <Button
            className="flex h-full w-[40%] flex-col items-center justify-center"
            key="Events"
            onClick={() => {
              handle('/events');
            }}
          >
            <EventIcon
              className={`text-4xl ${
                router.pathname == '/events' ? 'text-blue-600' : 'text-zinc-600'
              }`}
            />
            <span
              className={`mt text-xs ${
                router.pathname == '/events' ? 'text-blue-600' : 'text-zinc-600'
              }`}
            >
              {t('footer_item1')}
            </span>
          </Button>

          <Button
            onClick={add}
            className="flex h-full w-[40%] flex-col items-center justify-center"
            key="Add"
            data-testid="add-group-or-event"
          >
            <AddCircleOutlineIcon
              className={`text-5xl ${
                router.pathname == '/groups/new' ||
                router.pathname === '/events/new'
                  ? 'text-blue-600'
                  : 'text-zinc-600'
              }`}
            />
          </Button>

          <Button
            className="flex h-full w-[40%] flex-col items-center justify-center"
            key="Gruppen"
            onClick={() => {
              handle('/groups');
            }}
          >
            <GroupsIcon
              className={`text-4xl ${
                router.pathname == '/groups' ? 'text-blue-600' : 'text-zinc-600'
              }`}
            />
            <span
              className={`mt text-xs ${
                router.pathname == '/groups' ? 'text-blue-600' : 'text-zinc-600'
              }`}
            >
              {t('footer_item2')}
            </span>
          </Button>
        </div>
      </nav>
      <Dialog
        open={openJoinDialog}
        onClose={() => {
          setOpenJoinDialog(false);
        }}
      >
        <DialogContent>
          {/* Hier können Sie den Text und die Erklärung für die Anmeldung anzeigen */}
          <Typography variant="h6">{t('dialog-content.title')}</Typography>
          <Typography>
            {t('dialog-content.description')}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setOpenJoinDialog(false);
            }}
            color="primary"
          >
            {t('dialog-content.close-btn')}
          </Button>
          <Button
            onClick={handleLogIn}
            color="primary"
            data-testid="login-test-id"
          >
            {t('dialog-content.register-btn')}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default BottomNav;
