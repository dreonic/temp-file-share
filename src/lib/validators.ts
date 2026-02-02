/**
 * Validates a custom short link according to backend requirements
 * - Must be at least 6 characters long
 * - Must contain only alphanumeric characters (letters and numbers)
 * 
 * @param link - The custom link to validate
 * @returns Error message if invalid, null if valid
 */
export const validateCustomLink = (link: string): string | null => {
    if (!link || link.trim().length === 0) {
        return "Link cannot be empty";
    }

    if (link.length < 6) {
        return "Link must be at least 6 characters long";
    }

    if (!/^[a-zA-Z0-9]{6,}$/.test(link)) {
        return "Link must contain only letters and numbers";
    }

    return null;
};
