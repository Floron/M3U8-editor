# TV Guide Feature

This application now includes a TV guide feature that automatically loads Electronic Program Guide (EPG) data from a local file `/epg/epg.xml.gz` to enhance the channel display with icons and additional information.

## Features

### Automatic EPG Loading
- **Auto-start**: When the site opens, it automatically begins loading the TV guide from local file
- **Smart caching**: EPG data is cached for 24 hours to avoid unnecessary reloads
- **Real-time status**: Shows loading progress with visual indicators
- **Success notification**: Shows a toast (sonner) when a fresh load completes
- **Error handling**: Provides clear error messages and retry options

### Channel Icon Integration
- **Local icon matching**: Finds channel icons by matching channel names with local files in `/epgone_dark_logo/` folder
- **File naming convention**: Icons are named as `channel_name.png` (lowercase, spaces replaced with underscores, Cyrillic letters preserved)
- **Cyrillic support**: Properly handles Russian channel names like "Первый канал" → `первый_канал.png`
- **Fallback support**: Uses default TV icon if no local icon is found
- **Image error handling**: Gracefully falls back to default icon if image fails to load

### User Interface
- **Status indicators**: Shows download progress, success, and error states
- **Cache information**: Displays cache status, last update time, and expiration
- **Refresh button**: Allows manual refresh of EPG data
- **Cache management**: Clear cache button for manual cache control
- **Visual feedback**: Loading spinner and color-coded status messages

## Technical Implementation (performance-focused)

### Parsing in a Web Worker (`src/services/epgParser.ts`, `src/services/epg.worker.ts`)
- The bundled feed is ~43 MB gzipped / ~275 MB of XML with 640k+ `<programme>` elements.
  The old approach parsed it on the main thread with `DOMParser` (full DOM tree, seconds of UI freeze) and
  matched programmes to channels with a linear `find()` per programme (~2 billion comparisons).
- Now: a linear regex scan keeps only channel display names + the currently airing programme.
  Channel lookups are O(1) via a `Map`, and most programmes are skipped by a cheap date-prefix prefilter
  before any `Date` parsing. Typical parse time: **~0.5 s** instead of several seconds.
- All of this runs in a Web Worker (`epg.worker.ts`), so the UI stays responsive; if Workers are
  unavailable the same pure functions run inline as a fallback.

### Shared store + hook (`src/services/epgService.ts`, `src/hooks/useEPG.ts`)
- One module-level store subscribed via `useSyncExternalStore`. Previously every channel item ran its own
  `useEPG()` instance — N mounted items caused N parallel loads and a "already in progress" race that left
  most items without EPG data on cold start.
- Single-flight loading, O(1) name lookup by any display-name line (case-insensitive), partial match only as fallback.

### Icon manifest (`src/services/iconsService.ts`, `public/icons-manifest.json`)
- The icon set ships 5000+ PNGs. Instead of guessing a path per channel and collecting hundreds of 404s,
  a build-time manifest maps (lowercased / normalized) names to real files.
- Regenerate after changing the icon folder: `npm run generate-icons` (also runs automatically on `npm run build`).

### Channel Integration
- ChannelItem component automatically displays EPG icons from the manifest
- Fallback to default TV icon when no local icon is found
- Maintains existing channel functionality

## Data Flow

1. **Site Load** → EPG hook initializes
2. **Auto-load** → Loads data from local file `/epg/epg.xml.gz`
3. **Decompress** → Handles gzip compression
4. **Parse XML** → Extracts channel information
5. **Store Data** → Caches EPG information locally
6. **Icon Matching** → Matches channel names with local icon files in `/epgone_dark_logo/` folder
7. **Display Icons** → Shows channel icons in UI
8. **Success Alert** → Notifies user of completion

## Error Handling

- **File loading errors**: Clear error messages with retry options
- **Parse failures**: Graceful fallback to default icons
- **Image loading**: Automatic fallback to TV icon on failure

## Browser Compatibility

- **Modern browsers**: Full support with Compression API
- **Fallback support**: Text-based parsing for older browsers

## Usage

The TV guide feature works automatically - no user interaction required:

1. Open the application
2. EPG loading starts automatically from local file
3. Status is shown below the main header
4. Success alert appears when complete
5. Channel icons are automatically displayed
6. Manual refresh available via refresh button

## Configuration

The EPG source URL is set in `src/services/epgService.ts`:

```typescript
const EPG_URL = `${import.meta.env.BASE_URL}epg.xml.gz`; // -> /M3U8-editor/epg.xml.gz
```

Note: the feed only shows a "current" programme while its date window covers the current time —
regenerate `public/epg.xml.gz` periodically to keep TV-guide lines fresh.

## Future Enhancements

- **Scheduling**: Automatic periodic updates
- **Multiple sources**: Support for additional EPG providers
- **Advanced matching**: Improved channel name matching algorithms
- **Program data**: Display current and upcoming programs
