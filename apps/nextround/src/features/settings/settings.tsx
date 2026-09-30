import { Download, Info, Settings2, X } from 'lucide-react';
import { useState } from 'react';
import { Dialog } from '@/components/dialog';
import { ExternalLink } from '@/components/external-link';
import { Button } from '@/components/ui/button';
import icon from '../../../../../assets/icons/ios/AppIcon.appiconset/AppIcon.png';
import { version } from '../../../package.json';
import { GeneralSettings } from './general';
import { UpdatePanel } from './update-panel';
import { useUpdates } from './updates';

export function Settings({
  onClose,
  initialSection = 'general',
}: {
  onClose: () => void;
  initialSection?: 'general' | 'updates';
}) {
  const installing = useUpdates((s) => ['downloading', 'installing'].includes(s.status));
  const dismiss = () => {
    if (!installing) onClose();
  };
  const [section, setSection] = useState<'general' | 'updates' | 'about'>(initialSection);
  return (
    <Dialog title="Settings" onClose={dismiss} className="settings-dialog">
      <div className="settings-layout">
        <nav className="settings-sidebar" aria-label="Settings categories">
          <Button
            variant="ghost"
            aria-pressed={section === 'general'}
            onClick={() => setSection('general')}
          >
            <Settings2 size={17} />
            General
          </Button>
          <Button
            variant="ghost"
            aria-pressed={section === 'updates'}
            onClick={() => setSection('updates')}
          >
            <Download size={17} />
            Updates
          </Button>
          <Button
            variant="ghost"
            aria-pressed={section === 'about'}
            onClick={() => setSection('about')}
          >
            <Info size={17} />
            About
          </Button>
        </nav>
        <section className="settings-content">
          <Button
            className="settings-close"
            variant="ghost"
            size="icon"
            aria-label="Close Settings"
            onClick={dismiss}
            disabled={installing}
          >
            <X size={18} />
          </Button>
          {section === 'general' ? (
            <GeneralSettings />
          ) : section === 'about' ? (
            <>
              <img className="about-icon" src={icon} alt="" />
              <h3>NextRound</h3>
              <p>Version {version}</p>
              <p>A little structure. A stronger session.</p>
              <div className="settings-group">
                <ExternalLink page="privacy">Privacy policy</ExternalLink>
                <ExternalLink page="releases">Release notes</ExternalLink>
                <ExternalLink page="issues">Feedback &amp; support</ExternalLink>
              </div>
              <p className="muted">Made for macOS. Workout history is not saved in this version.</p>
            </>
          ) : (
            <UpdatePanel />
          )}
        </section>
      </div>
    </Dialog>
  );
}
