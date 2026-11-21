# MWAHLI Design System

## Brand tokens

| Token | Hex | Role |
|---|---|---|
| Rose | `#B72A57` | Primary brand/action and emotional emphasis |
| Wine | `#6F173A` | Premium headings and dark brand surfaces |
| Petal | `#FFF1F5` | Soft background |
| Blush | `#F8D5DE` | Secondary surface and dividers |
| Honey | `#F0B64A` | Surprise, selected states and warmth |
| Honey Light | `#FFF0C9` | Positive and celebratory panels |
| Cream | `#FFF9F3` | Main canvas |
| Ink | `#27191F` | Primary text |
| Cocoa | `#5B3B44` | Secondary text |
| Night | `#1B1217` | Candlelight dark mode and Studio rooms |
| Sage | `#58715D` | Care, delivered, calm and success states |

## UI rules locked into the build

- Pink is paired with Wine/Ink so the interface does not feel toy-like.
- Honey is an accent, not the color of every primary button.
- Heart/kiss shapes are punctuation, not wallpaper.
- Consumer UI uses Tailwind tokens. Bootstrap is not globally imported.
- Minimum target size is 44px.
- Mobile uses bottom navigation and sticky/obvious primary actions.
- Motion is user-triggered, calm and reduced for grief/care.
- The recipient experience supports reduced motion and keeps core reveals understandable without animation.
- Product photography slots should use 4:5 or 1:1; Studio rooms may use cinematic/freeform ratios.
- Interface copy is direct: “Who are you thinking about?”, “Make something”, “Nothing is an option”, “Change it quietly.”

## Typography

- Interface/body: Inter/system sans.
- Editorial/emotional: Liberation Serif/Georgia fallback until a licensed production serif is chosen.
- Data/IDs: IBM Plex Mono or equivalent in operations surfaces.
- Handwriting is optional and only for sender-authored accents, never long body text.
