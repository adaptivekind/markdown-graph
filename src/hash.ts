/**
 * Generate a cheap checksum from a string. This is used to append to duplicate
 * named things in the garden to allow de-duplication.
 *
 * @param source - string to generate a hash from
 * @returns checksum for the string
 */
export const hash = (source: string) => {
  if (source.length === 0) {
    return "0";
  }
  let hashValue = 0;
  // classic checksum
  for (let i = 0; i < source.length; i++) {
    // shift (1->32), minus current and add new character
    hashValue = (hashValue << 5) - hashValue + source.charCodeAt(i);
    // bitwise to 32 bit integer
    hashValue |= 0;
  }
  // redix with radix 36, i.e. use characters in the range 0-9 or a-z
  return Math.abs(hashValue).toString(36);
};
