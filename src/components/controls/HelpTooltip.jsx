import { cloneElement, Children, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const SHOW_DELAY = 550;
const GAP = 8;
const MARGIN = 10;
const PANEL_WIDTH = 270;
const EST_HEIGHT = 130;

function computePosition(rect) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const left = Math.min(Math.max(rect.left + rect.width / 2 - PANEL_WIDTH / 2, MARGIN), vw - PANEL_WIDTH - MARGIN);
  const spaceBelow = vh - rect.bottom;
  const placeAbove = spaceBelow < EST_HEIGHT + GAP && rect.top > EST_HEIGHT + GAP;
  return placeAbove
    ? { left, bottom: vh - rect.top + GAP, top: 'auto' }
    : { left, top: rect.bottom + GAP, bottom: 'auto' };
}

function InfoGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <line x1="12" y1="11" x2="12" y2="16.5" />
      <circle cx="12" cy="7.5" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function HelpTooltipPanel({ rect, content }) {
  const style = computePosition(rect);
  const paragraphs = content.body ? content.body.split('\n\n') : [];
  return (
    <div className="help-tip-panel" style={style}>
      {content.title && <div className="help-tip-title">{content.title}</div>}
      {paragraphs.map((p, i) => (
        <div className="help-tip-body" key={i}>{p}</div>
      ))}
      {content.note && (
        <div className="help-tip-note">
          <InfoGlyph />
          <span>{content.note}</span>
        </div>
      )}
    </div>
  );
}

// Tooltip "tutorial" stile Photoshop/AutoCAD: avvolge un singolo trigger via
// cloneElement (nessun nodo DOM extra, nessuna rottura dei layout flex) e
// monta il pannello in un portal perché la view-bar ha overflow:hidden
// (necessario per l'animazione di collapse) che taglierebbe un absolute child.
export default function HelpTooltip({ content, children }) {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState(null);
  const anchorRef = useRef(null);
  const timerRef = useRef(null);

  const show = () => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (anchorRef.current) setRect(anchorRef.current.getBoundingClientRect());
      setOpen(true);
    }, SHOW_DELAY);
  };

  const hide = () => {
    clearTimeout(timerRef.current);
    setOpen(false);
  };

  useEffect(() => () => clearTimeout(timerRef.current), []);

  useEffect(() => {
    if (!open) return undefined;
    window.addEventListener('scroll', hide, true);
    window.addEventListener('resize', hide);
    const onKeyDown = (e) => { if (e.key === 'Escape') hide(); };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('scroll', hide, true);
      window.removeEventListener('resize', hide);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  if (!content) return children;

  const child = Children.only(children);
  const trigger = cloneElement(child, {
    ref: (node) => {
      anchorRef.current = node;
      const { ref } = child;
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
    },
    onMouseEnter: (e) => { child.props.onMouseEnter?.(e); show(); },
    onMouseLeave: (e) => { child.props.onMouseLeave?.(e); hide(); },
    onFocus: (e) => { child.props.onFocus?.(e); show(); },
    onBlur: (e) => { child.props.onBlur?.(e); hide(); },
    onClick: (e) => { child.props.onClick?.(e); hide(); },
  });

  return (
    <>
      {trigger}
      {open && rect && createPortal(<HelpTooltipPanel rect={rect} content={content} />, document.body)}
    </>
  );
}
