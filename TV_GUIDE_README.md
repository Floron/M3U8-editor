# TV Guide Feature

This application now includes a TV guide feature that automatically downloads Electronic Program Guide (EPG) data from [epg.one](http://epg.one/epg.xml.gz) to enhance the channel display with icons and additional information.

## Features

### Automatic EPG Download
- **Auto-start**: When the site opens, it automatically begins downloading the TV guide
- **Smart caching**: EPG data is cached for 24 hours to avoid unnecessary downloads
- **Real-time status**: Shows download progress with visual indicators
- **Success notification**: Displays an alert when download completes successfully
- **Error handling**: Provides clear error messages and retry options

### Channel Icon Integration
- **Automatic icon matching**: Finds channel icons by matching channel names from the EPG data
- **Fallback support**: Uses default TV icon if no EPG icon is found
- **Image error handling**: Gracefully falls back to default icon if image fails to load

### User Interface
- **Status indicators**: Shows download progress, success, and error states
- **Cache information**: Displays cache status, last update time, and expiration
- **Refresh button**: Allows manual refresh of EPG data
- **Cache management**: Clear cache button for manual cache control
- **Visual feedback**: Loading spinner and color-coded status messages

## Technical Implementation

### EPG Service (`src/services/epgService.ts`)
- Downloads compressed EPG data from epg.one
- Handles gzip decompression using browser APIs
- Parses XML data to extract channel information
- Provides channel icon lookup functionality
- **Smart caching system**: Stores EPG data in localStorage for 24 hours
- **Cache validation**: Automatically checks cache expiration and validity
- **Cache management**: Methods to clear cache and get cache information

### EPG Hook (`src/hooks/useEPG.ts`)
- Manages EPG state and download lifecycle
- Auto-triggers download when main page loads
- Provides EPG data and status to components

### Channel Integration
- ChannelItem component automatically displays EPG icons
- Fallback to default TV icon when no EPG icon available
- Maintains existing channel functionality

## Data Flow

1. **Site Load** → EPG hook initializes
2. **Auto-download** → Fetches data from epg.one
3. **Decompress** → Handles gzip compression
4. **Parse XML** → Extracts channel and icon data
5. **Store Data** → Caches EPG information locally
6. **Display Icons** → Shows channel icons in UI
7. **Success Alert** → Notifies user of completion

## Error Handling

- **Network errors**: Clear error messages with retry options
- **CORS issues**: Specific handling for cross-origin restrictions
- **Parse failures**: Graceful fallback to default icons
- **Image loading**: Automatic fallback to TV icon on failure

## Browser Compatibility

- **Modern browsers**: Full support with Compression API
- **Fallback support**: Text-based parsing for older browsers
- **CORS handling**: Proper error messages for security restrictions

## Usage

The TV guide feature works automatically - no user interaction required:

1. Open the application
2. EPG download starts automatically
3. Status is shown below the main header
4. Success alert appears when complete
5. Channel icons are automatically displayed
6. Manual refresh available via refresh button

## Configuration

The EPG source URL can be modified in `src/services/epgService.ts`:

```typescript
const response = await fetch('http://epg.one/epg.xml.gz', {
  mode: 'cors',
  headers: {
    'Accept': 'application/xml, application/gzip, */*',
  }
});
```

## Future Enhancements

- **Caching**: Local storage for offline EPG data
- **Scheduling**: Automatic periodic updates
- **Multiple sources**: Support for additional EPG providers
- **Advanced matching**: Improved channel name matching algorithms
- **Program data**: Display current and upcoming programs
