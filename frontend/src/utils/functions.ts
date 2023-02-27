export const truncate = (str: string): string => {
    return str.length > 1 ? str.substring(0, 10) + '...' : str;
};

export const getRandomColor = (): string => {
    let letters = ['red', 'green', 'blue', 'orange', 'yellow', 'purple', 'pink', 'cyan'];
    let color = '';
    for (let i = 0; i < 7; i++) {
        color = letters[Math.floor(Math.random() * letters.length)];
    }
    return color
}