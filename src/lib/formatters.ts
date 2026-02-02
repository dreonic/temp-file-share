/**
 * Intelligently truncates a filename while preserving the extension
 * @param fileName - The filename to truncate
 * @param maxLength - Maximum length of the truncated filename (default: 30)
 * @returns Truncated filename with extension preserved
 * 
 * @example
 * truncateFileName("very-long-filename.pdf", 20) // "very-long...pdf"
 * truncateFileName("short.txt", 30) // "short.txt"
 */
export const truncateFileName = (fileName: string, maxLength: number = 30): string => {
    if (fileName.length <= maxLength) return fileName;

    // Find the last dot to separate name and extension
    const lastDotIndex = fileName.lastIndexOf('.');
    
    // If no extension or extension is too long, just truncate normally
    if (lastDotIndex === -1 || fileName.length - lastDotIndex > 10) {
        return fileName.substring(0, maxLength - 3) + '...';
    }

    const extension = fileName.substring(lastDotIndex);
    const nameWithoutExt = fileName.substring(0, lastDotIndex);
    
    // Calculate how much space we have for the name part
    const availableSpace = maxLength - extension.length - 3; // 3 for "..."
    
    if (availableSpace <= 0) {
        return fileName.substring(0, maxLength - 3) + '...';
    }

    return nameWithoutExt.substring(0, availableSpace) + '... ' + extension;
};
