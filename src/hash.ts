// Hash function constants
const EMPTY_STRING_HASH = "0";
const INITIAL_HASH_VALUE = 0;
const HASH_SHIFT_BITS = 5;
const HASH_RADIX = 36;
const HASH_MASK_32BIT = 0;

/**
 * Generate a cheap checksum from a string. This is used to append to duplicate
 * named things in the garden to allow de-duplication.
 *
 * @param source - string to generate a hash from
 * @returns checksum for the string
 */
export const hash = (source: string) => {
  if (source.length === 0) {
    return EMPTY_STRING_HASH;
  }
  let hashValue = INITIAL_HASH_VALUE;
  // classic checksum
  for (let i = 0; i < source.length; i++) {
    // shift (1->32), minus current and add new character
    hashValue =
      (hashValue << HASH_SHIFT_BITS) - hashValue + source.charCodeAt(i);
    // bitwise to 32 bit integer
    hashValue |= HASH_MASK_32BIT;
  }
  // redix with radix 36, i.e. use characters in the range 0-9 or a-z
  return Math.abs(hashValue).toString(HASH_RADIX);
};
