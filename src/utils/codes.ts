/*
 * Generate a code with numbers
 * @param length - The length of the code
 * @returns The code
 * @example
 * geneerateCodeWithNumbers(10) // "1234567890"
 */
export const geneerateCodeWithNumbers = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/*
 * Generate a code with letters
 * @param length - The length of the code
 * @returns The code
 * @example
 * geneerateCodeWithLetters(10) // "abcdefghij"
 */
export const geneerateCodeWithLetters = (length: number): string => {
  return Math.random()
    .toString(36)
    .substring(2, 2 + length);
};

/*
 * Generate a code with numbers and letters
 * @param length - The length of the code
 * @returns The code
 * @example
 * geneerateCodeWithNumbersAndLetters(10) // "1234567890abcdefghij"
 */
export const geneerateCodeWithNumbersAndLetters = (length: number): string => {
  return Math.random()
    .toString(36)
    .substring(2, 2 + length);
};
