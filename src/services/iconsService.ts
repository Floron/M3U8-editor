class IconsService {

findChannelIcon(channelName: string): string | undefined {
    if (!channelName) return undefined;
    
    
    // Return the path to the local icon file
    const iconPath = `./epgone_dark_logo/${channelName}.png`;
    console.log(`Looking for channel icon: "${channelName}" -> "${channelName}.png" -> "${iconPath}"`);
    
    return iconPath;
  }
}

export const iconsService = new IconsService();