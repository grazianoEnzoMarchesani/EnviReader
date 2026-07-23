import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAppState } from '../../state/AppStateContext';
import { useI18n } from '../../i18n/I18nContext';
import { IconPlay, IconPause, IconSkipBack, IconSkipForward } from '../icons/ToolbarIcons';
import HelpTooltip from './HelpTooltip';

const GAP = 8;
const MARGIN = 10;
const PANEL_WIDTH = 196;

const SPEEDS = [1, 5, 10];

function computePosition(rect) {
  const vw = window.innerWidth;
  const left = Math.min(Math.max(rect.left + rect.width / 2 - PANEL_WIDTH / 2, MARGIN), vw - PANEL_WIDTH - MARGIN);
  return { left, top: rect.bottom + GAP };
}

// Piccolo trigger accanto al valore dello slider Time: apre un popover
// leggero con transport (indietro/play-pausa/avanti) e velocità, come un
// lettore multimediale. La riproduzione vera e propria vive nello state
// globale (AppStateContext) e continua anche a popover chiuso.
export default function TimePlayer({ value, max, onChange }) {
  const { state, set } = useAppState();
  const { tr } = useI18n();
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState(null);
  const anchorRef = useRef(null);
  const panelRef = useRef(null);
  const disabled = max <= 0;
  const playing = state.playing && !disabled;

  useEffect(() => {
    if (!open) return undefined;
    const onDocDown = (e) => {
      if (panelRef.current?.contains(e.target) || anchorRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onKeyDown = (e) => { if (e.key === 'Escape') setOpen(false); };
    const onResize = () => setOpen(false);
    document.addEventListener('mousedown', onDocDown);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('mousedown', onDocDown);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', onResize);
    };
  }, [open]);

  const toggleOpen = () => {
    if (!open && anchorRef.current) setRect(anchorRef.current.getBoundingClientRect());
    setOpen((v) => !v);
  };

  const step = (delta) => {
    if (disabled) return;
    let next = value + delta;
    if (next < 0) next = max;
    else if (next > max) next = 0;
    onChange(next);
  };

  const trigger = (
    <button
      type="button"
      ref={anchorRef}
      className={`time-player-trigger${playing ? ' playing' : ''}`}
      onClick={toggleOpen}
      disabled={disabled}
      aria-label={tr('help_time_player_title')}
      aria-expanded={open}
    >
      {playing ? <IconPause width={13} height={13} /> : <IconPlay width={13} height={13} />}
    </button>
  );

  return (
    <>
      {open ? trigger : <HelpTooltip content={{ title: tr('help_time_player_title'), body: tr('help_time_player_body') }}>{trigger}</HelpTooltip>}
      {open && rect && createPortal(
        <div className="time-player-panel" ref={panelRef} style={computePosition(rect)}>
          <div className="time-player-transport">
            <button type="button" className="step-btn" onClick={() => step(-1)} aria-label={tr('btn_step_back')}>
              <IconSkipBack />
            </button>
            <button
              type="button"
              className="time-player-play"
              onClick={() => set({ playing: !state.playing })}
              aria-label={tr(playing ? 'btn_pause' : 'btn_play')}
            >
              {playing ? <IconPause /> : <IconPlay />}
            </button>
            <button type="button" className="step-btn" onClick={() => step(1)} aria-label={tr('btn_step_forward')}>
              <IconSkipForward />
            </button>
          </div>
          <div className="time-player-speed">
            <span className="control-label">{tr('label_speed')}</span>
            <div className="segmented">
              {SPEEDS.map((s) => (
                <button
                  key={s}
                  className={state.playbackSpeed === s ? 'active-accent' : ''}
                  onClick={() => set({ playbackSpeed: s })}
                >
                  {s}×
                </button>
              ))}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
