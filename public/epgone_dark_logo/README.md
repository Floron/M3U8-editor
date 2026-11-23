# Channel Icons Directory

This directory contains channel icons that are automatically matched with channel names.

## File Naming Convention

Channel names are converted to lowercase and spaces are replaced with underscores. Cyrillic letters are preserved:

- "Discovery Channel" → `discovery_channel.png`
- "National Geographic" → `national_geographic.png`
- "BBC One" → `bbc_one.png`
- "CNN International" → `cnn_international.png`
- "Первый канал" → `первый_канал.png`
- "Россия 1" → `россия_1.png`
- "НТВ" → `нтв.png`
- "ТНТ" → `тнт.png`

## How It Works

1. The system takes a channel name from your playlist
2. Converts it to lowercase and replaces spaces with underscores
3. Looks for a PNG file with that name in this directory
4. If found, displays the icon; if not, shows a default TV icon

## Adding Icons

1. Save your channel icons as PNG files
2. Name them according to the convention above
3. Place them in this directory
4. The system will automatically find and display them

## Examples

For a channel named "Discovery Channel" in your playlist:
- The system will look for: `discovery_channel.png`
- If the file exists, it will be displayed
- If not, a default TV icon will be shown

For a channel named "Первый канал" in your playlist:
- The system will look for: `первый_канал.png`
- If the file exists, it will be displayed
- If not, a default TV icon will be shown
