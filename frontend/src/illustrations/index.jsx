import { memo } from "react";

/**
 * CloudRead illustrations
 * ----------------------------------------------------------------------------
 * Single-color line drawings with selective fills, all on a 1px horizon line
 * at 70% canvas height. Stroke 2.5, rounded caps and joins.
 * Stroke uses currentColor so theme switches automatically.
 * Fills are explicit brand/ember/linen/success tokens.
 *
 * Every illustration is wrapped in a fixed-aspect viewBox so callers can
 * pass any width/height. All exported as memoized stateless components.
 */

const STROKE = 2.5;
const HORIZON_Y = 168;       // of 240 — gives 70/30 split
const STROKE_COLOR = "currentColor";

function Frame({ size = 200, children, className, label, decorative = true }) {
  const a11y = decorative
    ? { "aria-hidden": "true", focusable: "false" }
    : { role: "img", "aria-label": label || "Illustration" };

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 240 200"
      width={size}
      height={size * (200 / 240)}
      className={className}
      style={{ display: "block" }}
      {...a11y}
    >
      {/* Horizon line */}
      <line
        x1="0"
        y1={HORIZON_Y}
        x2="240"
        y2={HORIZON_Y}
        stroke={STROKE_COLOR}
        strokeWidth="1"
        opacity="0.25"
      />
      {children}
    </svg>
  );
}

const baseProps = {
  fill: "none",
  stroke: STROKE_COLOR,
  strokeWidth: STROKE,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

/* ─────────────────────────────────────────────────────────────────────
   1. EmptyLibrary — three books standing on a shelf, middle one tilted
   ───────────────────────────────────────────────────────────────────── */
export const EmptyLibrary = memo(function EmptyLibrary(props) {
  return (
    <Frame {...props} label="Empty library">
      <g {...baseProps}>
        {/* Book 1 — left, vertical */}
        <rect x="46" y="100" width="34" height="68" rx="2" fill="var(--linen-300, #d9d3be)" />
        <line x1="54" y1="116" x2="72" y2="116" />
        <line x1="54" y1="124" x2="68" y2="124" />
        <line x1="54" y1="132" x2="72" y2="132" />
        <line x1="54" y1="140" x2="66" y2="140" />

        {/* Book 2 — middle, slightly tilted right */}
        <g transform="rotate(8 130 168)">
          <rect x="116" y="92" width="32" height="76" rx="2" fill="var(--brand-500, #5b5bd6)" opacity="0.85" />
          <line x1="124" y1="108" x2="140" y2="108" stroke="#ffffff" opacity="0.6" />
          <line x1="124" y1="118" x2="136" y2="118" stroke="#ffffff" opacity="0.6" />
        </g>

        {/* Book 3 — right, vertical, shorter */}
        <rect x="160" y="110" width="32" height="58" rx="2" fill="var(--ember-500, #e07a3c)" opacity="0.85" />
        <line x1="168" y1="124" x2="184" y2="124" />
        <line x1="168" y1="132" x2="180" y2="132" />
      </g>
    </Frame>
  );
});

/* ─────────────────────────────────────────────────────────────────────
   2. EmptyRequests — blank card with a quill resting on it
   ───────────────────────────────────────────────────────────────────── */
export const EmptyRequests = memo(function EmptyRequests(props) {
  return (
    <Frame {...props} label="No requests">
      <g {...baseProps}>
        {/* Card */}
        <rect x="60" y="84" width="120" height="80" rx="6" fill="var(--linen-50, #fbf9f2)" />
        <line x1="78" y1="106" x2="146" y2="106" opacity="0.5" />
        <line x1="78" y1="120" x2="130" y2="120" opacity="0.5" />
        <line x1="78" y1="134" x2="138" y2="134" opacity="0.5" />

        {/* Quill — diagonal, body to the upper right */}
        <g transform="rotate(-25 168 110)">
          <path d="M120 110 L168 62" />
          <path d="M168 62 Q176 56 178 50" />
          {/* Feather barbs */}
          <path d="M124 106 L130 100" opacity="0.6" />
          <path d="M132 100 L138 94" opacity="0.6" />
          <path d="M140 92 L146 86" opacity="0.6" />
          <path d="M148 84 L154 78" opacity="0.6" />
          <path d="M156 76 L162 70" opacity="0.6" />
          {/* Quill tip */}
          <path d="M120 110 L116 116" />
        </g>
      </g>
    </Frame>
  );
});

/* ─────────────────────────────────────────────────────────────────────
   3. EmptyUsers — wooden nameplate with "Members"
   ───────────────────────────────────────────────────────────────────── */
export const EmptyUsers = memo(function EmptyUsers(props) {
  return (
    <Frame {...props} label="No users">
      <g {...baseProps}>
        {/* Nameplate */}
        <rect x="48" y="106" width="144" height="50" rx="6" fill="var(--linen-300, #d9d3be)" />
        {/* Pin holes top */}
        <circle cx="64" cy="118" r="2" fill="var(--ink-brown-500, #3b2a1f)" opacity="0.4" />
        <circle cx="176" cy="118" r="2" fill="var(--ink-brown-500, #3b2a1f)" opacity="0.4" />
        {/* "Members" text — single word, centered */}
        <text
          x="120"
          y="140"
          textAnchor="middle"
          fontFamily="var(--font-display, Georgia, serif)"
          fontSize="16"
          fontWeight="600"
          fill="currentColor"
          opacity="0.85"
        >
          Members
        </text>
      </g>
    </Frame>
  );
});

/* ─────────────────────────────────────────────────────────────────────
   4. EmptyNotifications — bell hanging from a ribbon
   ───────────────────────────────────────────────────────────────────── */
export const EmptyNotifications = memo(function EmptyNotifications(props) {
  return (
    <Frame {...props} label="No notifications">
      <g {...baseProps}>
        {/* Ribbon */}
        <line x1="120" y1="40" x2="120" y2="64" />
        <path d="M110 64 L130 64 L120 76 Z" fill="var(--ember-500, #e07a3c)" />
        {/* Bell body */}
        <path
          d="M88 116 Q88 84 120 84 Q152 84 152 116 L160 132 L80 132 Z"
          fill="var(--linen-50, #fbf9f2)"
        />
        {/* Bell clapper */}
        <circle cx="120" cy="142" r="5" fill="var(--linen-300, #d9d3be)" />
        {/* Bell ring line */}
        <line x1="88" y1="132" x2="152" y2="132" />
      </g>
    </Frame>
  );
});

/* ─────────────────────────────────────────────────────────────────────
   5. EmptySearch — magnifying glass over an open book page
   ───────────────────────────────────────────────────────────────────── */
export const EmptySearch = memo(function EmptySearch(props) {
  return (
    <Frame {...props} label="No results">
      <g {...baseProps}>
        {/* Open book */}
        <path d="M40 124 L40 96 L120 88 L120 124 Z" fill="var(--linen-50, #fbf9f2)" />
        <path d="M120 124 L120 88 L200 96 L200 124 Z" fill="var(--linen-50, #fbf9f2)" />
        <line x1="120" y1="88" x2="120" y2="124" />
        <line x1="56" y1="106" x2="100" y2="100" opacity="0.5" />
        <line x1="56" y1="114" x2="100" y2="108" opacity="0.5" />
        <line x1="140" y1="100" x2="184" y2="106" opacity="0.5" />
        <line x1="140" y1="108" x2="184" y2="114" opacity="0.5" />

        {/* Magnifying glass */}
        <circle cx="160" cy="74" r="22" fill="var(--brand-500, #5b5bd6)" fillOpacity="0.12" />
        <circle cx="160" cy="74" r="22" />
        <line x1="176" y1="90" x2="194" y2="108" strokeWidth="3" />
      </g>
    </Frame>
  );
});

/* ─────────────────────────────────────────────────────────────────────
   6. EmptyApproved — clipboard with a quill
   ───────────────────────────────────────────────────────────────────── */
export const EmptyApproved = memo(function EmptyApproved(props) {
  return (
    <Frame {...props} label="Nothing to approve">
      <g {...baseProps}>
        {/* Clipboard */}
        <rect x="68" y="78" width="104" height="92" rx="6" fill="var(--linen-50, #fbf9f2)" />
        {/* Clip */}
        <rect x="104" y="68" width="32" height="16" rx="3" fill="var(--linen-300, #d9d3be)" />
        {/* Lines */}
        <line x1="84" y1="108" x2="156" y2="108" opacity="0.4" />
        <line x1="84" y1="122" x2="156" y2="122" opacity="0.4" />
        <line x1="84" y1="136" x2="138" y2="136" opacity="0.4" />
        <line x1="84" y1="150" x2="150" y2="150" opacity="0.4" />

        {/* Small check mark in lower right corner */}
        <circle cx="186" cy="148" r="14" fill="var(--success-500, #3f8559)" />
        <path d="M180 148 L184 152 L192 144" stroke="white" strokeWidth="2.5" fill="none" />
      </g>
    </Frame>
  );
});

/* ─────────────────────────────────────────────────────────────────────
   7. ErrorState — book with one bent page corner
   ───────────────────────────────────────────────────────────────────── */
export const ErrorState = memo(function ErrorState(props) {
  return (
    <Frame {...props} label="Something went wrong">
      <g {...baseProps}>
        {/* Book body */}
        <path d="M60 70 L60 160 L180 160 L180 70 Z" fill="var(--linen-50, #fbf9f2)" />
        {/* Bent page corner */}
        <path d="M156 70 L180 70 L180 94 Z" fill="var(--linen-200, #ece8da)" />
        <path d="M156 70 L180 94" />
        {/* Lines on the page */}
        <line x1="76" y1="100" x2="148" y2="100" opacity="0.5" />
        <line x1="76" y1="114" x2="148" y2="114" opacity="0.5" />
        <line x1="76" y1="128" x2="130" y2="128" opacity="0.5" />
        <line x1="76" y1="142" x2="148" y2="142" opacity="0.5" />

        {/* Tear drop */}
        <path
          d="M110 50 Q104 60 110 66 Q116 60 110 50 Z"
          fill="var(--danger-500, #a53a3a)"
        />
      </g>
    </Frame>
  );
});

/* ─────────────────────────────────────────────────────────────────────
   8. Offline — library lamp with the light off
   ───────────────────────────────────────────────────────────────────── */
export const Offline = memo(function Offline(props) {
  return (
    <Frame {...props} label="You're offline">
      <g {...baseProps}>
        {/* Lamp base */}
        <line x1="80" y1="160" x2="160" y2="160" />
        <line x1="120" y1="160" x2="120" y2="120" />
        {/* Shade */}
        <path d="M88 88 L152 88 L142 120 L98 120 Z" fill="var(--linen-300, #d9d3be)" />
        {/* Light bulb (off) */}
        <circle cx="120" cy="130" r="6" fill="var(--linen-200, #ece8da)" />
        {/* Slash through */}
        <line x1="60" y1="60" x2="180" y2="180" stroke="var(--danger-500, #a53a3a)" strokeWidth="3" />
      </g>
    </Frame>
  );
});

/* ─────────────────────────────────────────────────────────────────────
   9. NotFound — empty shelf with a "Reserved" card
   ───────────────────────────────────────────────────────────────────── */
export const NotFound = memo(function NotFound(props) {
  return (
    <Frame {...props} label="Page not found">
      <g {...baseProps}>
        {/* Shelf */}
        <line x1="40" y1="160" x2="200" y2="160" strokeWidth="3" />
        {/* Shelf brackets */}
        <path d="M50 160 L50 172 L70 172" />
        <path d="M170 160 L170 172 L190 172" />

        {/* "Reserved" card leaning */}
        <g transform="rotate(-8 120 110)">
          <rect x="92" y="78" width="56" height="64" rx="4" fill="var(--linen-50, #fbf9f2)" />
          <line x1="100" y1="94" x2="140" y2="94" opacity="0.5" />
          <line x1="100" y1="106" x2="132" y2="106" opacity="0.5" />
          <line x1="100" y1="118" x2="138" y2="118" opacity="0.5" />
          <text
            x="120"
            y="132"
            textAnchor="middle"
            fontFamily="var(--font-display, Georgia, serif)"
            fontSize="9"
            fontWeight="600"
            fill="var(--ink-brown-500, #3b2a1f)"
          >
            RESERVED
          </text>
        </g>
      </g>
    </Frame>
  );
});

/* ─────────────────────────────────────────────────────────────────────
   10. LoadingBooks — book with a slowly rotating page lift
   ───────────────────────────────────────────────────────────────────── */
export const LoadingBooks = memo(function LoadingBooks(props) {
  return (
    <Frame {...props} label="Loading">
      <style>{`
        @keyframes cr-page-lift {
          0%   { transform: rotate(0deg); }
          100% { transform: rotate(-12deg); }
        }
        .cr-loading-page {
          transform-origin: 120px 124px;
          animation: cr-page-lift 1.4s var(--ease-standard, ease-in-out) infinite alternate;
        }
      `}</style>
      <g {...baseProps}>
        {/* Open book base */}
        <path d="M48 124 L48 88 L120 80 L120 124 Z" fill="var(--linen-50, #fbf9f2)" />
        <path d="M120 124 L120 80 L192 88 L192 124 Z" fill="var(--linen-50, #fbf9f2)" />
        <line x1="120" y1="80" x2="120" y2="124" />
        {/* Animated right page lifting */}
        <g className="cr-loading-page">
          <path d="M120 80 L192 88 L192 124 L120 124 Z" fill="var(--brand-500, #5b5bd6)" fillOpacity="0.18" />
        </g>
      </g>
    </Frame>
  );
});

/* ─────────────────────────────────────────────────────────────────────
   11. HeroIllustration — open book whose pages lift into a soft cloud arc
   ───────────────────────────────────────────────────────────────────── */
export const HeroIllustration = memo(function HeroIllustration(props) {
  return (
    <Frame {...props} label="" decorative>
      <g {...baseProps}>
        {/* Cloud arc top */}
        <path
          d="M40 56 Q60 36 96 44 Q132 32 168 48 Q204 40 218 64"
          fill="none"
          opacity="0.5"
        />
        {/* Open book — wider, dramatic */}
        <path d="M28 156 L28 100 L120 88 L120 156 Z" fill="var(--linen-50, #fbf9f2)" />
        <path d="M120 156 L120 88 L212 100 L212 156 Z" fill="var(--linen-50, #fbf9f2)" />
        <line x1="120" y1="88" x2="120" y2="156" />
        {/* Spine line on left page */}
        <line x1="40" y1="156" x2="40" y2="100" opacity="0.3" />
        {/* Page lines */}
        <line x1="56" y1="118" x2="100" y2="112" opacity="0.4" />
        <line x1="56" y1="128" x2="100" y2="122" opacity="0.4" />
        <line x1="56" y1="138" x2="92" y2="132" opacity="0.4" />
        <line x1="140" y1="112" x2="184" y2="118" opacity="0.4" />
        <line x1="140" y1="122" x2="184" y2="128" opacity="0.4" />
        <line x1="140" y1="132" x2="176" y2="138" opacity="0.4" />
        {/* Single page lifting up from right */}
        <path
          d="M168 88 Q172 60 156 48 Q140 40 130 56"
          fill="var(--brand-500, #5b5bd6)"
          fillOpacity="0.85"
        />
        <path
          d="M168 88 Q172 60 156 48 Q140 40 130 56"
          fill="none"
          stroke="var(--brand-700, #36369a)"
        />
        {/* Ember accent — small star/dot */}
        <circle cx="80" cy="68" r="3" fill="var(--ember-500, #e07a3c)" />
        <circle cx="200" cy="80" r="2" fill="var(--ember-500, #e07a3c)" />
      </g>
    </Frame>
  );
});

/* ─────────────────────────────────────────────────────────────────────
   12. AuthHero — reading nook: a chair, a lamp, an open book on a side table
   ───────────────────────────────────────────────────────────────────── */
export const AuthHero = memo(function AuthHero(props) {
  return (
    <Frame {...props} label="" decorative>
      <g {...baseProps}>
        {/* Side table */}
        <line x1="170" y1="160" x2="218" y2="160" strokeWidth="3" />
        <line x1="178" y1="160" x2="178" y2="180" />
        <line x1="210" y1="160" x2="210" y2="180" />
        {/* Open book on table */}
        <path d="M174 138 L196 132 L218 138 L196 144 Z" fill="var(--linen-50, #fbf9f2)" />
        <line x1="196" y1="132" x2="196" y2="144" />
        {/* Lamp */}
        <line x1="194" y1="138" x2="194" y2="92" />
        <path d="M180 78 L208 78 L204 92 L184 92 Z" fill="var(--ember-500, #e07a3c)" fillOpacity="0.85" />
        {/* Light glow */}
        <ellipse cx="194" cy="130" rx="40" ry="14" fill="var(--ember-500, #e07a3c)" fillOpacity="0.08" />

        {/* Chair (left) */}
        <rect x="48" y="120" width="60" height="40" rx="4" fill="var(--linen-300, #d9d3be)" />
        <rect x="44" y="92" width="68" height="32" rx="4" fill="var(--linen-300, #d9d3be)" />
        <line x1="52" y1="160" x2="52" y2="178" />
        <line x1="104" y1="160" x2="104" y2="178" />
        {/* Pillow */}
        <rect x="58" y="116" width="22" height="16" rx="3" fill="var(--brand-500, #5b5bd6)" fillOpacity="0.75" />
      </g>
    </Frame>
  );
});

/* ─────────────────────────────────────────────────────────────────────
   Bonus: User / Account loader — simple silhouette
   ───────────────────────────────────────────────────────────────────── */
export const LoadingUser = memo(function LoadingUser(props) {
  return (
    <Frame {...props} label="Loading user">
      <g {...baseProps}>
        <circle cx="120" cy="86" r="22" fill="var(--linen-300, #d9d3be)" />
        <path
          d="M72 160 Q72 124 120 124 Q168 124 168 160"
          fill="var(--linen-300, #d9d3be)"
        />
      </g>
    </Frame>
  );
});
