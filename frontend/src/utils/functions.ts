export const truncate = (str: string): string => {
    return str.length > 1 ? str.substring(0, 10) + '...' : str;
};