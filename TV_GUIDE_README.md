# TV Guide Feature

This application now includes a TV guide feature that automatically loads Electronic Program Guide (EPG) data from a local file `/epg/epg.xml.gz` to enhance the channel display with icons and additional information.

## Features

### Automatic EPG Loading
- **Auto-start**: When the site opens, it automatically begins loading the TV guide from local file
- **Smart caching**: EPG data is cached for 24 hours to avoid unnecessary reloads
- **Real-time status**: Shows loading progress with visual indicators
- **Success notification**: Displays an alert when loading completes successfully
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

## Technical Implementation

### EPG Service (`src/services/epgService.ts`)
- Loads compressed EPG data from local file `/epg/epg.xml.gz`
- Handles gzip decompression using browser APIs
- Parses XML data to extract channel information
- **Local icon lookup**: Matches channel names with local icon files in `/epgone_dark_logo/` folder
- **Name cleaning**: Converts channel names to lowercase, replaces spaces with underscores, and preserves Cyrillic letters for file matching
- **Smart caching system**: Stores EPG data in localStorage for 24 hours
- **Cache validation**: Automatically checks cache expiration and validity
- **Cache management**: Methods to clear cache and get cache information

### EPG Hook (`src/hooks/useEPG.ts`)
- Manages EPG state and loading lifecycle
- Auto-triggers loading when main page loads
- Provides EPG data and status to components

### Channel Integration
- ChannelItem component automatically displays EPG icons
- Fallback to default TV icon when no EPG icon available
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

The EPG source file path can be modified in `src/services/epgService.ts`:

```typescript
const response = await fetch('/epg/epg.xml.gz', {
  method: 'GET',
  headers: {
    'Accept': 'application/xml, application/gzip, */*',
    'Origin': 'null'
  }
});
```

## Future Enhancements

- **Caching**: Local storage for offline EPG data
- **Scheduling**: Automatic periodic updates
- **Multiple sources**: Support for additional EPG providers
- **Advanced matching**: Improved channel name matching algorithms
- **Program data**: Display current and upcoming programs
