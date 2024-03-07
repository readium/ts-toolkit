/**
 * Implementation of Myers' online approximate string matching algorithm [1],
 * with additional optimizations suggested by [2].
 *
 * This has O((k/w) * n) expected-time where `n` is the length of the
 * text, `k` is the maximum number of errors allowed (always <= the pattern
 * length) and `w` is the word size. Because JS only supports bitwise operations
 * on 32 bit integers, `w` is 32.
 *
 * As far as I am aware, there aren't any online algorithms which are
 * significantly better for a wide range of input parameters. The problem can be
 * solved faster using "filter then verify" approaches which first filter out
 * regions of the text that cannot match using a "cheap" check and then verify
 * the remaining potential matches. The verify step requires an algorithm such
 * as this one however.
 *
 * The algorithm's approach is essentially to optimize the classic dynamic
 * programming solution to the problem by computing columns of the matrix in
 * word-sized chunks (ie. dealing with 32 chars of the pattern at a time) and
 * avoiding calculating regions of the matrix where the minimum error count is
 * guaranteed to exceed the input threshold.
 *
 * The paper consists of two parts, the first describes the core algorithm for
 * matching patterns <= the size of a word (implemented by `advanceBlock` here).
 * The second uses the core algorithm as part of a larger block-based algorithm
 * to handle longer patterns.
 *
 * [1] G. Myers, “A Fast Bit-Vector Algorithm for Approximate String Matching
 * Based on Dynamic Programming,” vol. 46, no. 3, pp. 395–415, 1999.
 *
 * [2] Šošić, M. (2014). An simd dynamic programming c/c++ library (Doctoral
 * dissertation, Fakultet Elektrotehnike i računarstva, Sveučilište u Zagrebu).
 */

/**
 * Represents a match returned by a call to `search`.
 */
export interface Match {
  /** Start offset of match in text. */
  start: number;
  /** End offset of match in text. */
  end: number;
  /**
   * The number of differences (insertions, deletions or substitutions) between
   * the pattern and the approximate match in the text.
   */
  errors: number;
}

function reverse(s: string) {
  return s.split("").reverse().join("");
}

/**
 * Given the ends of approximate matches for `pattern` in `text`, find
 * the start of the matches.
 *
 * @return Matches with the `start` property set.
 */
function findMatchStarts(text: string, pattern: string, matches: Match[]) {
  const patRev = reverse(pattern);

  return matches.map((m) => {
    // Find start of each match by reversing the pattern and matching segment
    // of text and searching for an approx match with the same number of
    // errors.
    const minStart = Math.max(0, m.end - pattern.length - m.errors);
    const textRev = reverse(text.slice(minStart, m.end));

    // If there are multiple possible start points, choose the one that
    // maximizes the length of the match.
    const start = findMatchEnds(textRev, patRev, m.errors).reduce((min, rm) => {
      if (m.end - rm.end < min) {
        return m.end - rm.end;
      }
      return min;
    }, m.end);

    return {
      start,
      end: m.end,
      errors: m.errors,
    };
  });
}

/**
 * Internal context used when calculating blocks of a column.
 */
interface Context {
  /**
   * Bit-arrays of positive vertical deltas.
   *
   * ie. `P[b][i]` is set if the vertical delta for the i'th row in the b'th
   * block is positive.
   */
  P: Uint32Array;
  /** Bit-arrays of negative vertical deltas. */
  M: Uint32Array;
  /** Bit masks with a single bit set indicating the last row in each block. */
  lastRowMask: Uint32Array;
}

/**
 * Return 1 if a number is non-zero or zero otherwise, without using
 * conditional operators.
 *
 * This should get inlined into `advanceBlock` below by the JIT.
 *
 * Adapted from https://stackoverflow.com/a/3912218/434243
 */
function oneIfNotZero(n: number) {
  return ((n | -n) >> 31) & 1;
}

/**
 * Block calculation step of the algorithm.
 *
 * From Fig 8. on p. 408 of [1], additionally optimized to replace conditional
 * checks with bitwise operations as per Section 4.2.3 of [2].
 *
 * @param ctx - The pattern context object
 * @param peq - The `peq` array for the current character (`ctx.peq.get(ch)`)
 * @param b - The block level
 * @param hIn - Horizontal input delta ∈ {1,0,-1}
 * @return Horizontal output delta ∈ {1,0,-1}
 */
function advanceBlock(ctx: Context, peq: Uint32Array, b: number, hIn: number) {
  let pV = ctx.P[b];
  let mV = ctx.M[b];
  const hInIsNegative = hIn >>> 31; // 1 if hIn < 0 or 0 otherwise.
  const eq = peq[b] | hInIsNegative;

  // Step 1: Compute horizontal deltas.
  const xV = eq | mV;
  const xH = (((eq & pV) + pV) ^ pV) | eq;

  let pH = mV | ~(xH | pV);
  let mH = pV & xH;

  // Step 2: Update score (value of last row of this block).
  const hOut =
    oneIfNotZero(pH & ctx.lastRowMask[b]) -
    oneIfNotZero(mH & ctx.lastRowMask[b]);

  // Step 3: Update vertical deltas for use when processing next char.
  pH <<= 1;
  mH <<= 1;

  mH |= hInIsNegative;
  pH |= oneIfNotZero(hIn) - hInIsNegative; // set pH[0] if hIn > 0

  pV = mH | ~(xV | pH);
  mV = pH & xV;

  ctx.P[b] = pV;
  ctx.M[b] = mV;

  return hOut;
}

/**
 * Find the ends and error counts for matches of `pattern` in `text`.
 *
 * Only the matches with the lowest error count are reported. Other matches
 * with error counts <= maxErrors are discarded.
 *
 * This is the block-based search algorithm from Fig. 9 on p.410 of [1].
 */
function findMatchEnds(text: string, pattern: string, maxErrors: number) {
  if (pattern.length === 0) {
    return [];
  }

  // Clamp error count so we can rely on the `maxErrors` and `pattern.length`
  // rows being in the same block below.
  maxErrors = Math.min(maxErrors, pattern.length);

  const matches = [];

  // Word size.
  const w = 32;

  // Index of maximum block level.
  const bMax = Math.ceil(pattern.length / w) - 1;

  // Context used across block calculations.
  const ctx = {
    P: new Uint32Array(bMax + 1),
    M: new Uint32Array(bMax + 1),
    lastRowMask: new Uint32Array(bMax + 1),
  };
  ctx.lastRowMask.fill(1 << 31);
  ctx.lastRowMask[bMax] = 1 << (pattern.length - 1) % w;

  // Dummy "peq" array for chars in the text which do not occur in the pattern.
  const emptyPeq = new Uint32Array(bMax + 1);

  // Map of UTF-16 character code to bit vector indicating positions in the
  // pattern that equal that character.
  const peq = new Map<number, Uint32Array>();

  // Version of `peq` that only stores mappings for small characters. This
  // allows faster lookups when iterating through the text because a simple
  // array lookup can be done instead of a hash table lookup.
  const asciiPeq = [] as Uint32Array[];
  for (let i = 0; i < 256; i++) {
    asciiPeq.push(emptyPeq);
  }

  // Calculate `ctx.peq` - a map of character values to bitmasks indicating
  // positions of that character within the pattern, where each bit represents
  // a position in the pattern.
  for (let c = 0; c < pattern.length; c += 1) {
    const val = pattern.charCodeAt(c);
    if (peq.has(val)) {
      // Duplicate char in pattern.
      continue;
    }

    const charPeq = new Uint32Array(bMax + 1);
    peq.set(val, charPeq);
    if (val < asciiPeq.length) {
      asciiPeq[val] = charPeq;
    }

    for (let b = 0; b <= bMax; b += 1) {
      charPeq[b] = 0;

      // Set all the bits where the pattern matches the current char (ch).
      // For indexes beyond the end of the pattern, always set the bit as if the
      // pattern contained a wildcard char in that position.
      for (let r = 0; r < w; r += 1) {
        const idx = b * w + r;
        if (idx >= pattern.length) {
          continue;
        }

        const match = pattern.charCodeAt(idx) === val;
        if (match) {
          charPeq[b] |= 1 << r;
        }
      }
    }
  }

  // Index of last-active block level in the column.
  let y = Math.max(0, Math.ceil(maxErrors / w) - 1);

  // Initialize maximum error count at bottom of each block.
  const score = new Uint32Array(bMax + 1);
  for (let b = 0; b <= y; b += 1) {
    score[b] = (b + 1) * w;
  }
  score[bMax] = pattern.length;

  // Initialize vertical deltas for each block.
  for (let b = 0; b <= y; b += 1) {
    ctx.P[b] = ~0;
    ctx.M[b] = 0;
  }

  // Process each char of the text, computing the error count for `w` chars of
  // the pattern at a time.
  for (let j = 0; j < text.length; j += 1) {
    // Lookup the bitmask representing the positions of the current char from
    // the text within the pattern.
    const charCode = text.charCodeAt(j);
    let charPeq;

    if (charCode < asciiPeq.length) {
      // Fast array lookup.
      charPeq = asciiPeq[charCode];
    } else {
      // Slower hash table lookup.
      charPeq = peq.get(charCode);
      if (typeof charPeq === "undefined") {
        charPeq = emptyPeq;
      }
    }

    // Calculate error count for blocks that we definitely have to process for
    // this column.
    let carry = 0;
    for (let b = 0; b <= y; b += 1) {
      carry = advanceBlock(ctx, charPeq, b, carry);
      score[b] += carry;
    }

    // Check if we also need to compute an additional block, or if we can reduce
    // the number of blocks processed for the next column.
    if (
      score[y] - carry <= maxErrors &&
      y < bMax &&
      (charPeq[y + 1] & 1 || carry < 0)
    ) {
      // Error count for bottom block is under threshold, increase the number of
      // blocks processed for this column & next by 1.
      y += 1;

      ctx.P[y] = ~0;
      ctx.M[y] = 0;

      let maxBlockScore;
      if (y === bMax) {
        const remainder = pattern.length % w;
        maxBlockScore = remainder === 0 ? w : remainder;
      } else {
        maxBlockScore = w;
      }

      score[y] =
        score[y - 1] +
        maxBlockScore -
        carry +
        advanceBlock(ctx, charPeq, y, carry);
    } else {
      // Error count for bottom block exceeds threshold, reduce the number of
      // blocks processed for the next column.
      while (y > 0 && score[y] >= maxErrors + w) {
        y -= 1;
      }
    }

    // If error count is under threshold, report a match.
    if (y === bMax && score[y] <= maxErrors) {
      if (score[y] < maxErrors) {
        // Discard any earlier, worse matches.
        matches.splice(0, matches.length);
      }

      matches.push({
        start: -1,
        end: j + 1,
        errors: score[y],
      });

      // Because `search` only reports the matches with the lowest error count,
      // we can "ratchet down" the max error threshold whenever a match is
      // encountered and thereby save a small amount of work for the remainder
      // of the text.
      maxErrors = score[y];
    }
  }

  return matches;
}

/**
 * Search for the closest matches for `pattern` in `text`.
 *
 * Returns all matches that have the lowest number of errors, or an empty
 * array if no match was found with `maxErrors` or fewer errors.
 */
export default function search(
  text: string,
  pattern: string,
  maxErrors: number
): Match[] {
  const matches = findMatchEnds(text, pattern, maxErrors);
  return findMatchStarts(text, pattern, matches);
}