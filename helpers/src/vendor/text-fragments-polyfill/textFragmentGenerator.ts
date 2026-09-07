/**
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// Ported from text-fragments-polyfill@6.7.0
// (https://github.com/GoogleChromeLabs/text-fragments-polyfill), converted
// from JSDoc-typed JavaScript to TypeScript. See README.MD in this directory.

import * as fragments from './textFragmentMatcher.ts';
import type { TextFragment } from './textFragmentMatcher.ts';

const MAX_EXACT_MATCH_LENGTH = 300;
const MIN_LENGTH_WITHOUT_CONTEXT = 20;
const ITERATIONS_BEFORE_ADDING_CONTEXT = 1;
const WORDS_TO_ADD_FIRST_ITERATION = 3;
const WORDS_TO_ADD_SUBSEQUENT_ITERATIONS = 1;
const TRUNCATE_RANGE_CHECK_CHARS = 10000;
const MAX_DEPTH = 500;

// Desired max run time, in ms. Can be overwritten.
let timeoutDurationMs: number | null = 500;
let t0: number; // Start timestamp for fragment generation

class FragmentTimeoutError extends Error {
  readonly isTimeout = true;
}

/**
 * Allows overriding the max runtime to specify a different interval. Fragment
 * generation will halt and throw an error after this amount of time.
 * @param newTimeoutDurationMs - the desired timeout length, in ms.
 */
export const setFragmentGenerationTimeout = (newTimeoutDurationMs: number | null): void => {
  timeoutDurationMs = newTimeoutDurationMs;
};

/**
 * Enum indicating the success, or failure reason, of generateFragment.
 */
export const GenerateFragmentStatus = {
  SUCCESS: 0,            // A fragment was generated.
  INVALID_SELECTION: 1,  // The selection provided could not be used.
  AMBIGUOUS: 2,  // No unique fragment could be identified for this selection.
  TIMEOUT: 3,    // Computation could not complete in time.
  EXECUTION_FAILED: 4,  // An exception was raised during generation.
} as const;

export type GenerateFragmentStatusValue = typeof GenerateFragmentStatus[keyof typeof GenerateFragmentStatus];

export interface GenerateFragmentResult {
  status: GenerateFragmentStatusValue;
  fragment?: TextFragment;
}

/**
 * Attempts to generate a fragment, suitable for formatting and including in a
 * URL, which will highlight the given selection upon opening.
 * @param selection - a Selection object, the result of window.getSelection
 * @param startTime - the time when generation began, for timeout purposes.
 *     Defaults to current timestamp.
 */
export const generateFragment = (selection: Selection, startTime: number = Date.now()): GenerateFragmentResult => {
  return doGenerateFragment(selection, startTime);
};

/**
 * Attampts to generate a fragment using a given range. @see {@link generateFragment}
 * @param startTime - the time when generation began, for timeout purposes.
 *     Defaults to current timestamp.
 */
export const generateFragmentFromRange =
    (range: Range, startTime: number = Date.now()): GenerateFragmentResult => {
      try {
        return doGenerateFragmentFromRange(range, startTime);
      } catch (err) {
        if (err instanceof FragmentTimeoutError) {
          return {status: GenerateFragmentStatus.TIMEOUT};
        } else {
          return {status: GenerateFragmentStatus.EXECUTION_FAILED};
        }
      }
    };

/**
 * Checks whether fragment generation can be attempted for a given range. This
 * checks a handful of simple conditions: the range must be nonempty, not inside
 * an <input>, etc. A true return is not a guarantee that fragment generation
 * will succeed; instead, this is a way to quickly rule out generation in cases
 * where a failure is predictable.
 * @return true if fragment generation may proceed; false otherwise.
 */
// Not called by textFragmentGenerator.ts's own callers — its iframe/window.top
// check assumes a live page, which doesn't apply to the detached documents
// this is typically used against. Left as upstream for reference/future use.
export const isValidRangeForFragmentGeneration = (range: Range): boolean => {
  // Check that the range isn't just punctuation and whitespace. Only check the
  // first |TRUNCATE_RANGE_CHECK_CHARS| to put an upper bound on runtime; ranges
  // that start with (e.g.) thousands of periods should be rare.
  // This also implicitly ensures the selection isn't in an input or textarea
  // field, as document.selection contains an empty range in these cases.
  if (!range.toString()
           .substring(0, TRUNCATE_RANGE_CHECK_CHARS)
           .match(fragments.internal.NON_BOUNDARY_CHARS)) {
    return false;
  }

  // Check for iframe
  try {
    if ((range.startContainer.ownerDocument as Document).defaultView !== window.top) {
      return false;
    }
  } catch {
    // If accessing window.top throws an error, this is in a cross-origin
    // iframe.
    return false;
  }

  // Walk up the DOM to ensure that the range isn't inside an editable. Limit
  // the search depth to |MAX_DEPTH| to constrain runtime.
  let node: Node | null = range.commonAncestorContainer;
  let numIterations = 0;
  while (node) {
    if (node.nodeType == Node.ELEMENT_NODE) {
      const element = node as Element;
      if (['TEXTAREA', 'INPUT'].includes(element.tagName.toUpperCase())) {
        return false;
      }

      const editable = element.attributes.getNamedItem('contenteditable');
      if (editable && editable.value !== 'false') {
        return false;
      }

      // Cap the number of iterations at |MAX_PRECONDITION_DEPTH| to put an
      // upper bound on runtime.
      numIterations++;
      if (numIterations >= MAX_DEPTH) {
        return false;
      }
    }
    node = node.parentNode;
  }

  return true;
};

/**
 * @see {@link generateFragment} - this method wraps the error-throwing portions
 *     of that method.
 * @throws {Error} - Will throw if computation takes longer than the accepted
 *     timeout length.
 */
const doGenerateFragment =
    (selection: Selection, startTime: number): GenerateFragmentResult => {
      let range: Range;
      try {
        range = selection.getRangeAt(0);
      } catch {
        return {status: GenerateFragmentStatus.INVALID_SELECTION};
      }

      return doGenerateFragmentFromRange(range, startTime);
    };

/**
 * @see {@link doGenerateFragment}
 */
const doGenerateFragmentFromRange = (range: Range, startTime: number): GenerateFragmentResult => {
  recordStartTime(startTime);
  // Upstream derives all of this from the global `document`/`document.body`
  // (the live page it's attached to). This is also used against arbitrary,
  // often-detached parsed documents, so every document/root lookup below is
  // derived from the range's own nodes.
  const doc = range.startContainer.ownerDocument as Document;
  const root = documentBody(doc);

  expandRangeStartToWordBound(range);
  expandRangeEndToWordBound(range);
  // Keep a copy of the range before we try to shrink it to make it start and
  // end in text nodes. We need to use the range edges as starting points
  // for context term building, so it makes sense to start from the original
  // edges instead of the edges after shrinking. This way we don't have to
  // traverse all the non-text nodes that are between the edges after shrinking
  // and the original ones.
  const rangeBeforeShrinking = range.cloneRange();

  moveRangeEdgesToTextNodes(range);

  if (range.collapsed) {
    return {status: GenerateFragmentStatus.INVALID_SELECTION};
  }

  let factory: FragmentFactory;

  if (canUseExactMatch(range)) {
    const exactText = fragments.internal.normalizeString(range.toString());
    const fragment: TextFragment = {
      textStart: exactText,
    };
    // If the exact text is long enough to be used on its own, try this and skip
    // the longer process below.
    if (exactText.length >= MIN_LENGTH_WITHOUT_CONTEXT &&
        isUniquelyIdentifying(fragment, doc, root)) {
      return {
        status: GenerateFragmentStatus.SUCCESS,
        fragment: fragment,
      };
    }

    factory = new FragmentFactory(doc, root).setExactTextMatch(exactText);
  } else {
    // We have to use textStart and textEnd to identify a range. First, break
    // the range up based on block boundaries, as textStart/textEnd can't cross
    // these.
    const startSearchSpace = getSearchSpaceForStart(range);
    const endSearchSpace = getSearchSpaceForEnd(range);

    if (startSearchSpace && endSearchSpace) {
      // If the search spaces are truthy, then there's a block boundary between
      // them.
      factory = new FragmentFactory(doc, root).setStartAndEndSearchSpace(
          startSearchSpace, endSearchSpace);
    } else {
      // If the search space was empty/undefined, it's because no block boundary
      // was found. That means textStart and textEnd *share* a search space, so
      // our approach must ensure the substrings chosen as candidates don't
      // overlap.
      factory = new FragmentFactory(doc, root)
                    .setSharedSearchSpace(range.toString().trim());
    }
  }

  const prefixRange = doc.createRange();
  prefixRange.selectNodeContents(root);
  const suffixRange = prefixRange.cloneRange();

  prefixRange.setEnd(
      rangeBeforeShrinking.startContainer, rangeBeforeShrinking.startOffset);
  suffixRange.setStart(
      rangeBeforeShrinking.endContainer, rangeBeforeShrinking.endOffset);

  const prefixSearchSpace = getSearchSpaceForEnd(prefixRange);
  const suffixSearchSpace = getSearchSpaceForStart(suffixRange);

  if (prefixSearchSpace || suffixSearchSpace) {
    factory.setPrefixAndSuffixSearchSpace(prefixSearchSpace, suffixSearchSpace);
  }

  factory.useSegmenter(fragments.internal.makeNewSegmenter(doc));

  let didEmbiggen = false;
  do {
    checkTimeout();
    didEmbiggen = factory.embiggen();
    const fragment = factory.tryToMakeUniqueFragment();
    if (fragment != null) {
      return {
        status: GenerateFragmentStatus.SUCCESS,
        fragment: fragment,
      };
    }
  } while (didEmbiggen);

  return {status: GenerateFragmentStatus.AMBIGUOUS};
};

/**
 * @throws {Error} - if the timeout duration has been exceeded, an error will
 *     be thrown so that execution can be halted.
 */
// docRoot.body can return a synthesized, still-empty node under some
// parsers' still-in-progress HTML5 tree construction for a body-less
// fragment — querying for the real, content-bearing <body> in document
// order sidesteps that.
const documentBody = (doc: Document): Element => doc.querySelector('body') ?? doc.documentElement;

const checkTimeout = (): void => {
  // disable check when no timeout duration specified
  if (timeoutDurationMs === null) {
    return;
  }
  const delta = Date.now() - t0;
  if (delta > timeoutDurationMs) {
    throw new FragmentTimeoutError(`Fragment generation timed out after ${delta} ms.`);
  }
};

/**
 * Call at the start of fragment generation to set the baseline for timeout
 * checking.
 * @param newStartTime - the timestamp when fragment generation began
 */
const recordStartTime = (newStartTime: number): void => {
  t0 = newStartTime;
};

/**
 * Finds the search space for parameters when using range or suffix match.
 * This is the text from the start of the range to the first block boundary,
 * trimmed to remove any leading/trailing whitespace characters.
 * @param range - the range which will be highlighted.
 * @return the text which may be used for constructing a textStart parameter
 *     identifying this range. Will return undefined if no block boundaries
 *     are found inside this range, or if all the candidate ranges were empty
 *     (or included only whitespace characters).
 */
const getSearchSpaceForStart = (range: Range): string | undefined => {
  let node: Node | null = getFirstNodeForBlockSearch(range);
  const walker = makeWalkerForNode(node, range.endContainer);
  if (!walker) {
    return undefined;
  }

  const finishedSubtrees = new Set<Node>();
  // If the range starts after the last child of an element node
  // don't visit its subtree because it's not included in the range.
  if (range.startContainer.nodeType === Node.ELEMENT_NODE &&
      range.startOffset === range.startContainer.childNodes.length) {
    finishedSubtrees.add(range.startContainer);
  }
  const origin = node;
  const textAccumulator = new BlockTextAccumulator(range, true);
  // tempRange monitors whether we've exhausted our search space yet.
  const tempRange = range.cloneRange();
  while (!tempRange.collapsed && node != null) {
    checkTimeout();
    // Depending on whether |node| is an ancestor of the start of our
    // search, we use either its leading or trailing edge as our start.
    if ((node as Element).contains?.(origin)) {
      tempRange.setStartAfter(node);
    } else {
      tempRange.setStartBefore(node);
    }
    // Add node to accumulator to keep track of text inside the current block
    // boundaries
    textAccumulator.appendNode(node);

    // If the accumulator found a non empty block boundary we've got our search
    // space.
    if (textAccumulator.textInBlock !== null) {
      return textAccumulator.textInBlock;
    }
    node = fragments.internal.forwardTraverse(walker, finishedSubtrees);
  }
  return undefined;
};

/**
 * Finds the search space for parameters when using range or prefix match.
 * This is the text from the last block boundary to the end of the range,
 * trimmed to remove any leading/trailing whitespace characters.
 * @param range - the range which will be highlighted.
 * @return the text which may be used for constructing a textEnd parameter
 *     identifying this range. Will return undefined if no block boundaries
 *     are found inside this range, or if all the candidate ranges were empty
 *     (or included only whitespace characters).
 */
const getSearchSpaceForEnd = (range: Range): string | undefined => {
  let node: Node | null = getLastNodeForBlockSearch(range);
  const walker = makeWalkerForNode(node, range.startContainer);
  if (!walker) {
    return undefined;
  }
  const finishedSubtrees = new Set<Node>();
  // If the range ends before the first child of an element node
  // don't visit its subtree because it's not included in the range.
  if (range.endContainer.nodeType === Node.ELEMENT_NODE &&
      range.endOffset === 0) {
    finishedSubtrees.add(range.endContainer);
  }

  const origin = node;
  const textAccumulator = new BlockTextAccumulator(range, false);

  // tempRange monitors whether we've exhausted our search space yet.
  const tempRange = range.cloneRange();
  while (!tempRange.collapsed && node != null) {
    checkTimeout();
    // Depending on whether |node| is an ancestor of the start of our
    // search, we use either its leading or trailing edge as our end.
    if ((node as Element).contains?.(origin)) {
      tempRange.setEnd(node, 0);
    } else {
      tempRange.setEndAfter(node);
    }

    // Add node to accumulator to keep track of text inside the current block
    // boundaries.
    textAccumulator.appendNode(node);

    // If the accumulator found a non empty block boundary we've got our search
    // space.
    if (textAccumulator.textInBlock !== null) {
      return textAccumulator.textInBlock;
    }

    node = fragments.internal.backwardTraverse(walker, finishedSubtrees);
  }
  return undefined;
};

const FactoryMode = {
  ALL_PARTS: 1,
  SHARED_START_AND_END: 2,
  CONTEXT_ONLY: 3,
} as const;
type FactoryModeValue = typeof FactoryMode[keyof typeof FactoryMode];

/**
 * Helper class for constructing range-based fragments for selections that cross
 * block boundaries.
 */
class FragmentFactory {
  private readonly doc: Document;
  private readonly root: Element;
  private readonly Mode = FactoryMode;

  private mode?: FactoryModeValue;

  private startOffset: number | null = null;
  private endOffset: number | null = null;
  private prefixOffset: number | null = null;
  private suffixOffset: number | null = null;

  private prefixSearchSpace = '';
  private backwardsPrefixSearchSpace = '';
  private suffixSearchSpace = '';

  private startSearchSpace?: string;
  private endSearchSpace?: string;
  private backwardsEndSearchSpace?: string;
  private sharedSearchSpace?: string;
  private backwardsSharedSearchSpace?: string;
  private exactTextMatch?: string;

  private startSegments?: Intl.Segments;
  private endSegments?: Intl.Segments;
  private sharedSegments?: Intl.Segments;
  private prefixSegments?: Intl.Segments;
  private suffixSegments?: Intl.Segments;

  private numIterations = 0;

  /**
   * Initializes the basic state of the factory. Users should then call exactly
   * one of setStartAndEndSearchSpace, setSharedSearchSpace, or
   * setExactTextMatch, and optionally setPrefixAndSuffixSearchSpace.
   * @param doc - document to check uniqueness against.
   * @param root - root element to check uniqueness against.
   */
  constructor(doc: Document, root: Element) {
    this.doc = doc;
    this.root = root;
  }

  /**
   * Generates a fragment based on the current state, then tests it for
   * uniqueness.
   * @return a text fragment if the current state is uniquely identifying, or
   *     undefined if the current state is ambiguous.
   */
  tryToMakeUniqueFragment(): TextFragment | undefined {
    let fragment: TextFragment;
    if (this.mode === this.Mode.CONTEXT_ONLY) {
      fragment = {textStart: this.exactTextMatch!};
    } else {
      fragment = {
        textStart:
            this.getStartSearchSpace().substring(0, this.startOffset!).trim(),
        textEnd: this.getEndSearchSpace().substring(this.endOffset!).trim(),
      };
    }
    if (this.prefixOffset != null) {
      const prefix =
          this.getPrefixSearchSpace().substring(this.prefixOffset).trim();
      if (prefix) {
        fragment.prefix = prefix;
      }
    }
    if (this.suffixOffset != null) {
      const suffix =
          this.getSuffixSearchSpace().substring(0, this.suffixOffset).trim();
      if (suffix) {
        fragment.suffix = suffix;
      }
    }
    return isUniquelyIdentifying(fragment, this.doc, this.root) ? fragment :
                                                                   undefined;
  }

  /**
   * Shifts the current state such that the candidates for textStart and textEnd
   * represent more of the possible search spaces.
   * @return true if the desired expansion occurred; false if the entire search
   *     space has been consumed and no further attempts can be made.
   */
  embiggen(): boolean {
    let canExpandRange = true;

    if (this.mode === this.Mode.SHARED_START_AND_END) {
      if (this.startOffset! >= this.endOffset!) {
        // If the search space is shared between textStart and textEnd, then
        // stop expanding when textStart overlaps textEnd.
        canExpandRange = false;
      }
    } else if (this.mode === this.Mode.ALL_PARTS) {
      // Stop expanding if both start and end have already consumed their full
      // search spaces.
      if (this.startOffset === this.getStartSearchSpace().length &&
          this.backwardsEndOffset() === this.getEndSearchSpace().length) {
        canExpandRange = false;
      }
    } else if (this.mode === this.Mode.CONTEXT_ONLY) {
      canExpandRange = false;
    }

    if (canExpandRange) {
      const desiredIterations = this.getNumberOfRangeWordsToAdd();
      if (this.startOffset! < this.getStartSearchSpace().length) {
        let i = 0;
        if (this.getStartSegments() != null) {
          while (i < desiredIterations &&
                 this.startOffset! < this.getStartSearchSpace().length) {
            this.startOffset = this.getNextOffsetForwards(
                this.getStartSegments()!, this.startOffset!,
                this.getStartSearchSpace());
            i++;
          }
        } else {
          // We don't have a segmenter, so find the next boundary character
          // instead. Shift to the next boundary char, and repeat until we've
          // added a word char.
          let oldStartOffset = this.startOffset!;
          do {
            checkTimeout();
            const newStartOffset =
                this.getStartSearchSpace()
                    .substring(this.startOffset! + 1)
                    .search(fragments.internal.BOUNDARY_CHARS);
            if (newStartOffset === -1) {
              this.startOffset = this.getStartSearchSpace().length;
            } else {
              this.startOffset = this.startOffset! + 1 + newStartOffset;
            }
            // Only count as an iteration if a word character was added.
            if (this.getStartSearchSpace()
                    .substring(oldStartOffset, this.startOffset)
                    .search(fragments.internal.NON_BOUNDARY_CHARS) !== -1) {
              oldStartOffset = this.startOffset;
              i++;
            }
          } while (this.startOffset! < this.getStartSearchSpace().length &&
                   i < desiredIterations);
        }

        // Ensure we don't have overlapping start and end offsets.
        if (this.mode === this.Mode.SHARED_START_AND_END) {
          this.startOffset = Math.min(this.startOffset!, this.endOffset!);
        }
      }

      if (this.backwardsEndOffset() < this.getEndSearchSpace().length) {
        let i = 0;
        if (this.getEndSegments() != null) {
          while (i < desiredIterations && this.endOffset! > 0) {
            this.endOffset = this.getNextOffsetBackwards(
                this.getEndSegments()!, this.endOffset!);
            i++;
          }
        } else {
          // No segmenter, so shift to the next boundary char, and repeat until
          // we've added a word char.
          let oldBackwardsEndOffset = this.backwardsEndOffset();
          do {
            checkTimeout();
            const newBackwardsOffset =
                this.getBackwardsEndSearchSpace()
                    .substring(this.backwardsEndOffset() + 1)
                    .search(fragments.internal.BOUNDARY_CHARS);
            if (newBackwardsOffset === -1) {
              this.setBackwardsEndOffset(this.getEndSearchSpace().length);
            } else {
              this.setBackwardsEndOffset(
                  this.backwardsEndOffset() + 1 + newBackwardsOffset);
            }
            // Only count as an iteration if a word character was added.
            if (this.getBackwardsEndSearchSpace()
                    .substring(oldBackwardsEndOffset, this.backwardsEndOffset())
                    .search(fragments.internal.NON_BOUNDARY_CHARS) !== -1) {
              oldBackwardsEndOffset = this.backwardsEndOffset();
              i++;
            }
          } while (this.backwardsEndOffset() <
                       this.getEndSearchSpace().length &&
                   i < desiredIterations);
        }
        // Ensure we don't have overlapping start and end offsets.
        if (this.mode === this.Mode.SHARED_START_AND_END) {
          this.endOffset = Math.max(this.startOffset!, this.endOffset!);
        }
      }
    }

    let canExpandContext = false;
    if (!canExpandRange ||
        this.startOffset! + this.backwardsEndOffset() <
            MIN_LENGTH_WITHOUT_CONTEXT ||
        this.numIterations >= ITERATIONS_BEFORE_ADDING_CONTEXT) {
      // Check if there's any unused search space left.
      if ((this.backwardsPrefixOffset() != null &&
           this.backwardsPrefixOffset() !==
               this.getPrefixSearchSpace().length) ||
          (this.suffixOffset != null &&
           this.suffixOffset !== this.getSuffixSearchSpace().length)) {
        canExpandContext = true;
      }
    }

    if (canExpandContext) {
      const desiredIterations = this.getNumberOfContextWordsToAdd();
      if (this.backwardsPrefixOffset()! < this.getPrefixSearchSpace().length) {
        let i = 0;
        if (this.getPrefixSegments() != null) {
          while (i < desiredIterations && this.prefixOffset! > 0) {
            this.prefixOffset = this.getNextOffsetBackwards(
                this.getPrefixSegments()!, this.prefixOffset!);
            i++;
          }
        } else {
          // Shift to the next boundary char, and repeat until we've added a
          // word char.
          let oldBackwardsPrefixOffset = this.backwardsPrefixOffset()!;
          do {
            checkTimeout();
            const newBackwardsPrefixOffset =
                this.getBackwardsPrefixSearchSpace()
                    .substring(this.backwardsPrefixOffset()! + 1)
                    .search(fragments.internal.BOUNDARY_CHARS);
            if (newBackwardsPrefixOffset === -1) {
              this.setBackwardsPrefixOffset(
                  this.getBackwardsPrefixSearchSpace().length);
            } else {
              this.setBackwardsPrefixOffset(
                  this.backwardsPrefixOffset()! + 1 + newBackwardsPrefixOffset);
            }
            // Only count as an iteration if a word character was added.
            if (this.getBackwardsPrefixSearchSpace()
                    .substring(
                        oldBackwardsPrefixOffset, this.backwardsPrefixOffset()!)
                    .search(fragments.internal.NON_BOUNDARY_CHARS) !== -1) {
              oldBackwardsPrefixOffset = this.backwardsPrefixOffset()!;
              i++;
            }
          } while (this.backwardsPrefixOffset()! <
                       this.getPrefixSearchSpace().length &&
                   i < desiredIterations);
        }
      }
      if (this.suffixOffset! < this.getSuffixSearchSpace().length) {
        let i = 0;
        if (this.getSuffixSegments() != null) {
          while (i < desiredIterations &&
                 this.suffixOffset! < this.getSuffixSearchSpace().length) {
            this.suffixOffset = this.getNextOffsetForwards(
                this.getSuffixSegments()!, this.suffixOffset!,
                this.getSuffixSearchSpace());
            i++;
          }
        } else {
          let oldSuffixOffset = this.suffixOffset!;
          do {
            checkTimeout();
            const newSuffixOffset =
                this.getSuffixSearchSpace()
                    .substring(this.suffixOffset! + 1)
                    .search(fragments.internal.BOUNDARY_CHARS);
            if (newSuffixOffset === -1) {
              this.suffixOffset = this.getSuffixSearchSpace().length;
            } else {
              this.suffixOffset = this.suffixOffset! + 1 + newSuffixOffset;
            }
            // Only count as an iteration if a word character was added.
            if (this.getSuffixSearchSpace()
                    .substring(oldSuffixOffset, this.suffixOffset)
                    .search(fragments.internal.NON_BOUNDARY_CHARS) !== -1) {
              oldSuffixOffset = this.suffixOffset;
              i++;
            }
          } while (this.suffixOffset! < this.getSuffixSearchSpace().length &&
                   i < desiredIterations);
        }
      }
    }
    this.numIterations++;

    // TODO: check if this exceeds the total length limit
    return canExpandRange || canExpandContext;
  }

  /**
   * Sets up the factory for a range-based match with a highlight that crosses
   * block boundaries.
   *
   * Exactly one of this, setSharedSearchSpace, or setExactTextMatch should be
   * called so the factory can identify the fragment.
   *
   * @param startSearchSpace - the maximum possible string which can be used to
   *     identify the start of the fragment
   * @param endSearchSpace - the maximum possible string which can be used to
   *     identify the end of the fragment
   * @return returns |this| to allow call chaining and assignment
   */
  setStartAndEndSearchSpace(startSearchSpace: string, endSearchSpace: string): this {
    this.startSearchSpace = startSearchSpace;
    this.endSearchSpace = endSearchSpace;
    this.backwardsEndSearchSpace = reverseString(endSearchSpace);

    this.startOffset = 0;
    this.endOffset = endSearchSpace.length;

    this.mode = this.Mode.ALL_PARTS;
    return this;
  }

  /**
   * Sets up the factory for a range-based match with a highlight that doesn't
   * cross block boundaries.
   *
   * Exactly one of this, setStartAndEndSearchSpace, or setExactTextMatch should
   * be called so the factory can identify the fragment.
   *
   * @param sharedSearchSpace - the full text of the highlight
   * @return returns |this| to allow call chaining and assignment
   */
  setSharedSearchSpace(sharedSearchSpace: string): this {
    this.sharedSearchSpace = sharedSearchSpace;
    this.backwardsSharedSearchSpace = reverseString(sharedSearchSpace);

    this.startOffset = 0;
    this.endOffset = sharedSearchSpace.length;

    this.mode = this.Mode.SHARED_START_AND_END;
    return this;
  }

  /**
   * Sets up the factory for an exact text match.
   *
   * Exactly one of this, setStartAndEndSearchSpace, or setSharedSearchSpace
   * should be called so the factory can identify the fragment.
   *
   * @param exactTextMatch - the full text of the highlight
   * @return returns |this| to allow call chaining and assignment
   */
  setExactTextMatch(exactTextMatch: string): this {
    this.exactTextMatch = exactTextMatch;

    this.mode = this.Mode.CONTEXT_ONLY;
    return this;
  }

  /**
   * Sets up the factory for context-based matches.
   * @param prefixSearchSpace - the string to be used as the search space for
   *     prefix
   * @param suffixSearchSpace - the string to be used as the search space for
   *     suffix
   * @return returns |this| to allow call chaining and assignment
   */
  setPrefixAndSuffixSearchSpace(prefixSearchSpace: string | undefined, suffixSearchSpace: string | undefined): this {
    if (prefixSearchSpace) {
      this.prefixSearchSpace = prefixSearchSpace;
      this.backwardsPrefixSearchSpace = reverseString(prefixSearchSpace);
      this.prefixOffset = prefixSearchSpace.length;
    }

    if (suffixSearchSpace) {
      this.suffixSearchSpace = suffixSearchSpace;
      this.suffixOffset = 0;
    }

    return this;
  }

  /**
   * Sets up the factory to use an instance of Intl.Segmenter when identifying
   * the start/end of words. |segmenter| is not actually retained; instead it is
   * used to create segment objects which are cached.
   *
   * This must be called AFTER any calls to setStartAndEndSearchSpace,
   * setSharedSearchSpace, and/or setPrefixAndSuffixSearchSpace, as these search
   * spaces will be segmented immediately.
   */
  useSegmenter(segmenter: Intl.Segmenter | undefined): this {
    if (segmenter == null) {
      return this;
    }

    if (this.mode === this.Mode.ALL_PARTS) {
      this.startSegments = segmenter.segment(this.startSearchSpace!);
      this.endSegments = segmenter.segment(this.endSearchSpace!);
    } else if (this.mode === this.Mode.SHARED_START_AND_END) {
      this.sharedSegments = segmenter.segment(this.sharedSearchSpace!);
    }

    if (this.prefixSearchSpace) {
      this.prefixSegments = segmenter.segment(this.prefixSearchSpace);
    }
    if (this.suffixSearchSpace) {
      this.suffixSegments = segmenter.segment(this.suffixSearchSpace);
    }

    return this;
  }

  /**
   * @return how many words should be added to the prefix and suffix when
   *     embiggening. This changes depending on the current state of the
   *     prefix/suffix, so it should be invoked once per embiggen, before either
   *     is modified.
   */
  private getNumberOfContextWordsToAdd(): number {
    return (this.backwardsPrefixOffset() === 0 && this.suffixOffset === 0) ?
        WORDS_TO_ADD_FIRST_ITERATION :
        WORDS_TO_ADD_SUBSEQUENT_ITERATIONS;
  }

  /**
   * @return how many words should be added to textStart and textEnd when
   *     embiggening. This changes depending on the current state of
   *     textStart/textEnd, so it should be invoked once per embiggen, before
   *     either is modified.
   */
  private getNumberOfRangeWordsToAdd(): number {
    return (this.startOffset === 0 && this.backwardsEndOffset() === 0) ?
        WORDS_TO_ADD_FIRST_ITERATION :
        WORDS_TO_ADD_SUBSEQUENT_ITERATIONS;
  }

  /**
   * Helper method for embiggening using Intl.Segmenter. Finds the next offset
   * to be tried in the forwards direction (i.e., a prefix of the search space).
   */
  private getNextOffsetForwards(segments: Intl.Segments, offset: number, searchSpace: string): number {
    // Find the nearest wordlike segment and move to the end of it.
    let currentSegment = segments.containing(offset);
    while (currentSegment != null) {
      checkTimeout();
      const currentSegmentEnd =
          currentSegment.index + currentSegment.segment.length;
      if (currentSegment.isWordLike) {
        return currentSegmentEnd;
      }
      currentSegment = segments.containing(currentSegmentEnd);
    }
    // If we didn't find a wordlike segment by the end of the string, set the
    // offset to the full search space.
    return searchSpace.length;
  }

  /**
   * Helper method for embiggening using Intl.Segmenter. Finds the next offset
   * to be tried in the backwards direction (i.e., a suffix of the search
   * space).
   */
  private getNextOffsetBackwards(segments: Intl.Segments, offset: number): number {
    // Find the nearest wordlike segment and move to the start of it.
    let currentSegment = segments.containing(offset);

    // Handle two edge cases:
    //     1. |offset| is at the end of the search space, so |currentSegment|
    //        is undefined
    //     2. We're already at the start of a segment, so moving to the start of
    //        |currentSegment| would be a no-op.
    // In both cases, the solution is to grab the segment immediately
    // prior to this offset.
    if (!currentSegment || offset == currentSegment.index) {
      // If offset is 0, this will return null, which is handled below.
      currentSegment = segments.containing(offset - 1);
    }

    while (currentSegment != null) {
      checkTimeout();
      if (currentSegment.isWordLike) {
        return currentSegment.index;
      }
      currentSegment = segments.containing(currentSegment.index - 1);
    }
    // If we didn't find a wordlike segment by the start of the string,
    // set the offset to the full search space.
    return 0;
  }

  /** @return the string to be used as the search space for textStart */
  private getStartSearchSpace(): string {
    return this.mode === this.Mode.SHARED_START_AND_END ?
        this.sharedSearchSpace! :
        this.startSearchSpace!;
  }

  /**
   * @return the result of segmenting the start search space using
   *     Intl.Segmenter, or undefined if a segmenter was not provided.
   */
  private getStartSegments(): Intl.Segments | undefined {
    return this.mode === this.Mode.SHARED_START_AND_END ? this.sharedSegments :
                                                          this.startSegments;
  }

  /** @return the string to be used as the search space for textEnd */
  private getEndSearchSpace(): string {
    return this.mode === this.Mode.SHARED_START_AND_END ?
        this.sharedSearchSpace! :
        this.endSearchSpace!;
  }

  /**
   * @return the result of segmenting the end search space using
   *     Intl.Segmenter, or undefined if a segmenter was not provided.
   */
  private getEndSegments(): Intl.Segments | undefined {
    return this.mode === this.Mode.SHARED_START_AND_END ? this.sharedSegments :
                                                          this.endSegments;
  }

  /** @return the string to be used as the search space for textEnd, backwards. */
  private getBackwardsEndSearchSpace(): string {
    return this.mode === this.Mode.SHARED_START_AND_END ?
        this.backwardsSharedSearchSpace! :
        this.backwardsEndSearchSpace!;
  }

  /** @return the string to be used as the search space for prefix */
  private getPrefixSearchSpace(): string {
    return this.prefixSearchSpace;
  }

  /**
   * @return the result of segmenting the prefix search space using
   *     Intl.Segmenter, or undefined if a segmenter was not provided.
   */
  private getPrefixSegments(): Intl.Segments | undefined {
    return this.prefixSegments;
  }

  /** @return the string to be used as the search space for prefix, backwards. */
  private getBackwardsPrefixSearchSpace(): string {
    return this.backwardsPrefixSearchSpace;
  }

  /** @return the string to be used as the search space for suffix */
  private getSuffixSearchSpace(): string {
    return this.suffixSearchSpace;
  }

  /**
   * @return the result of segmenting the suffix search space using
   *     Intl.Segmenter, or undefined if a segmenter was not provided.
   */
  private getSuffixSegments(): Intl.Segments | undefined {
    return this.suffixSegments;
  }

  /**
   * Helper method for doing arithmetic in the backwards search space.
   * @return the current end offset, as a start offset in the backwards search
   *     space
   */
  private backwardsEndOffset(): number {
    return this.getEndSearchSpace().length - this.endOffset!;
  }

  /**
   * Helper method for doing arithmetic in the backwards search space.
   * @param backwardsEndOffset - the desired new value of the start offset in
   *     the backwards search space
   */
  private setBackwardsEndOffset(backwardsEndOffset: number): void {
    this.endOffset = this.getEndSearchSpace().length - backwardsEndOffset;
  }

  /**
   * Helper method for doing arithmetic in the backwards search space.
   * @return the current prefix offset, as a start offset in the backwards
   *     search space
   */
  private backwardsPrefixOffset(): number | null {
    if (this.prefixOffset == null) return null;
    return this.getPrefixSearchSpace().length - this.prefixOffset;
  }

  /**
   * Helper method for doing arithmetic in the backwards search space.
   * @param backwardsPrefixOffset - the desired new value of the prefix offset
   *     in the backwards search space
   */
  private setBackwardsPrefixOffset(backwardsPrefixOffset: number): void {
    if (this.prefixOffset == null) return;
    this.prefixOffset =
        this.getPrefixSearchSpace().length - backwardsPrefixOffset;
  }
}

type TextNodeLike = Node | { textContent: string };

/**
 * Helper class to calculate visible text from the start or end of a range
 * until a block boundary is reached or the range is exhausted.
 */
class BlockTextAccumulator {
  private readonly searchRange: Range;
  private readonly isForwardTraversal: boolean;
  private textFound = false;
  private textNodes: TextNodeLike[] = [];
  textInBlock: string | null = null;

  /**
   * @param searchRange - the range for which the text in the last or first
   *     non empty block boundary will be calculated
   * @param isForwardTraversal - true if nodes in searchRange will be forward
   *     traversed
   */
  constructor(searchRange: Range, isForwardTraversal: boolean) {
    this.searchRange = searchRange;
    this.isForwardTraversal = isForwardTraversal;
  }

  /**
   * Adds the next node in the search space range traversal to the accumulator.
   * The accumulator then will keep track of the text nodes in the range until a
   * block boundary is found. Once a block boundary is found and the content of
   * the text nodes in the boundary is non empty, the property textInBlock will
   * be set with the content of the text nodes, trimmed of leading and trailing
   * whitespaces.
   * @param node - next node in the traversal of the searchRange
   */
  appendNode(node: Node): void {
    // If we already calculated the text in the block boundary just ignore any
    // calls to append nodes.
    if (this.textInBlock !== null) {
      return;
    }
    // We found a block boundary, check if there's text inside and set it to
    // textInBlock or keep going to the next block boundary.
    if (isBlock(node)) {
      if (this.textFound) {
        // When traversing backwards the nodes are pushed in reverse order.
        // Reversing them to get them in the right order.
        if (!this.isForwardTraversal) {
          this.textNodes.reverse();
        }
        // Concatenate all the text nodes in the block boundary and trim any
        // trailing and leading whitespaces.
        this.textInBlock = this.textNodes.map(textNode => textNode.textContent)
                               .join('')
                               .trim();
      } else {
        // Discard the text nodes visited so far since they are empty and we'll
        // continue searching in the next block boundary.
        this.textNodes = [];
      }
      return;
    }

    // Ignore non text nodes.
    if (!isText(node)) return;

    // Get the part of node inside the search range. This is to avoid
    // accumulating text that's not inside the range.
    const nodeToInsert = this.getNodeIntersectionWithRange(node);

    // Keep track of any text found in the block boundary.
    this.textFound = this.textFound || (nodeToInsert.textContent ?? '').trim() !== '';

    this.textNodes.push(nodeToInsert);
  }

  /**
   * Calculates the intersection of a node with searchRange and returns a Text
   * Node with the intersection
   * @param node - the node to intercept with searchRange
   * @return node if node is fully within searchRange or a Text Node with the
   *     substring of the content of node inside the search range
   */
  private getNodeIntersectionWithRange(node: Node): TextNodeLike {
    let startOffset: number | null = null;
    let endOffset: number | null = null;

    const textLength = (node.textContent ?? '').length;

    if (node === this.searchRange.startContainer &&
        this.searchRange.startOffset !== 0) {
      startOffset = this.searchRange.startOffset;
    }

    if (node === this.searchRange.endContainer &&
        this.searchRange.endOffset !== textLength) {
      endOffset = this.searchRange.endOffset;
    }
    if (startOffset !== null || endOffset !== null) {
      return {
        textContent: (node.textContent ?? '').substring(
            startOffset ?? 0, endOffset ?? textLength),
      };
    }

    return node;
  }
}

/**
 * @param fragment - the candidate fragment
 * @param doc - document to check uniqueness against.
 * @param root - root element to check uniqueness against.
 * @return true iff the candidate fragment identifies exactly one portion of
 *     the document.
 */
const isUniquelyIdentifying = (fragment: TextFragment, doc: Document, root: Element): boolean => {
  return fragments.processTextFragmentDirective(fragment, doc, root).length ===
      1;
};

/**
 * Reverses a string. Compound unicode characters are preserved.
 * @param string - the string to reverse
 * @return sdrawkcab |gnirts|
 */
const reverseString = (string: string): string => {
  // Spread operator (...) splits full characters, rather than code points, to
  // avoid breaking compound unicode characters upon reverse.
  return [...(string || '')].reverse().join('');
};

/**
 * Determines whether the conditions for an exact match are met.
 * @param range - the range for which a fragment is being generated.
 * @return true if exact matching (i.e., only textStart) can be used; false if
 *     range matching (i.e., both textStart and textEnd) must be used.
 */
const canUseExactMatch = (range: Range): boolean => {
  if (range.toString().length > MAX_EXACT_MATCH_LENGTH) return false;
  return !containsBlockBoundary(range);
};

/**
 * Finds the node at which a forward traversal through |range| should begin,
 * based on the range's start container and offset values.
 * @param range - the range which will be traversed
 * @return the node where traversal should begin
 */
const getFirstNodeForBlockSearch = (range: Range): Node => {
  // Get a handle on the first node inside the range. For text nodes, this
  // is the start container; for element nodes, we use the offset to find
  // where it actually starts.
  let node: Node = range.startContainer;
  if (node.nodeType == Node.ELEMENT_NODE &&
      range.startOffset < node.childNodes.length) {
    node = node.childNodes[range.startOffset]!;
  }
  return node;
};

/**
 * Finds the node at which a backward traversal through |range| should begin,
 * based on the range's end container and offset values.
 * @param range - the range which will be traversed
 * @return the node where traversal should begin
 */
const getLastNodeForBlockSearch = (range: Range): Node => {
  // Get a handle on the last node inside the range. For text nodes, this
  // is the end container; for element nodes, we use the offset to find
  // where it actually ends. If the offset is 0, the node itself is returned.
  let node: Node = range.endContainer;
  if (node.nodeType == Node.ELEMENT_NODE && range.endOffset > 0) {
    node = node.childNodes[range.endOffset - 1]!;
  }
  return node;
};

/**
 * Finds the first visible text node within a given range.
 * @param range - range in which to find the first visible text node
 * @return first visible text node within |range| or null if there are no
 *     visible text nodes within |range|
 */
const getFirstTextNode = (range: Range): Node | null => {
  // Check if first node in the range is a visible text node.
  const firstNode = getFirstNodeForBlockSearch(range);
  if (isText(firstNode) && fragments.internal.isNodeVisible(firstNode)) {
    return firstNode;
  }

  // First node is not visible text, use a tree walker to find the first visible
  // text node.
  const walker = fragments.internal.makeTextNodeWalker(range);
  walker.currentNode = firstNode;

  return walker.nextNode();
};

/**
 * Finds the last visible text node within a given range.
 * @param range - range in which to find the last visible text node
 * @return last visible text node within |range| or null if there are no
 *     visible text nodes within |range|
 */
const getLastTextNode = (range: Range): Node | null => {
  // Check if last node in the range is a visible text node.
  const lastNode = getLastNodeForBlockSearch(range);
  if (isText(lastNode) && fragments.internal.isNodeVisible(lastNode)) {
    return lastNode;
  }

  // Last node is not visible text, traverse the range backwards to find the
  // last visible text node.
  const walker = fragments.internal.makeTextNodeWalker(range);
  walker.currentNode = lastNode;

  return fragments.internal.backwardTraverse(walker, new Set());
};

/**
 * Determines whether or not a range crosses a block boundary.
 * @param range - the range to investigate
 * @return true if a block boundary was found, false if no such boundary was
 *     found.
 */
const containsBlockBoundary = (range: Range): boolean => {
  const tempRange = range.cloneRange();
  let node: Node | null = getFirstNodeForBlockSearch(tempRange);
  const walker = makeWalkerForNode(node);
  if (!walker) {
    return false;
  }
  const finishedSubtrees = new Set<Node>();

  while (!tempRange.collapsed && node != null) {
    if (isBlock(node)) return true;
    if (node != null) tempRange.setStartAfter(node);
    node = fragments.internal.forwardTraverse(walker, finishedSubtrees);
    checkTimeout();
  }
  return false;
};

/**
 * Attempts to find a word start within the given text node, starting at
 * |offset| and working backwards.
 *
 * @param node - a node to be searched
 * @param startOffset - the character offset within |node| where the selected
 *     text begins. If undefined, the entire node will be searched.
 * @return the number indicating the offset to which a range should be set to
 *     ensure it starts on a word bound. Returns -1 if the node is not a text
 *     node, or if no word boundary character could be found.
 */
const findWordStartBoundInTextNode = (node: Node, startOffset?: number | null): number => {
  if (node.nodeType !== Node.TEXT_NODE) return -1;
  const textNode = node as Text;

  const offset = startOffset != null ? startOffset : textNode.data.length;

  // If the first character in the range is a boundary character, we don't
  // need to do anything.
  if (offset < textNode.data.length &&
      fragments.internal.BOUNDARY_CHARS.test(textNode.data[offset]!))
    return offset;

  const precedingText = textNode.data.substring(0, offset);
  const boundaryIndex =
      reverseString(precedingText).search(fragments.internal.BOUNDARY_CHARS);

  if (boundaryIndex !== -1) {
    // Because we did a backwards search, the found index counts backwards
    // from offset, so we subtract to find the start of the word.
    return offset - boundaryIndex;
  }
  return -1;
};

/**
 * Attempts to find a word end within the given text node, starting at |offset|.
 *
 * @param node - a node to be searched
 * @param endOffset - the character offset within |node| where the selected
 *     text end. If undefined, the entire node will be searched.
 * @return the number indicating the offset to which a range should be set to
 *     ensure it ends on a word bound. Returns -1 if the node is not a text
 *     node, or if no word boundary character could be found.
 */
const findWordEndBoundInTextNode = (node: Node, endOffset?: number | null): number => {
  if (node.nodeType !== Node.TEXT_NODE) return -1;
  const textNode = node as Text;

  const offset = endOffset != null ? endOffset : 0;

  // If the last character in the range is a boundary character, we don't
  // need to do anything.
  if (offset < textNode.data.length && offset > 0 &&
      fragments.internal.BOUNDARY_CHARS.test(textNode.data[offset - 1]!)) {
    return offset;
  }

  const followingText = textNode.data.substring(offset);
  const boundaryIndex = followingText.search(fragments.internal.BOUNDARY_CHARS);

  if (boundaryIndex !== -1) {
    return offset + boundaryIndex;
  }
  return -1;
};

/**
 * Helper method to create a TreeWalker useful for finding a block boundary near
 * a given node.
 * @param node - the node where the search should start
 * @param endNode - optional; if included, the root of the walker will be
 *     chosen to ensure it can traverse at least as far as this node.
 * @return a TreeWalker, rooted in a block ancestor of |node|, currently
 *     pointing to |node|, which will traverse only visible text and element
 *     nodes.
 */
const makeWalkerForNode = (node: Node | null, endNode?: Node): TreeWalker | undefined => {
  if (!node) {
    return undefined;
  }

  // Find a block-level ancestor of the node by walking up the tree. This
  // will be used as the root of the tree walker.
  let blockAncestor: Node = node;
  const endNodeNotNull = endNode != null ? endNode : node;
  while (!(blockAncestor as Element).contains?.(endNodeNotNull) || !isBlock(blockAncestor)) {
    if (blockAncestor.parentNode) {
      blockAncestor = blockAncestor.parentNode;
    }
  }

  const doc = blockAncestor.ownerDocument ?? (blockAncestor as unknown as Document);
  const walker = doc.createTreeWalker(
      blockAncestor, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
        acceptNode: (node: Node) => fragments.internal.acceptNodeIfVisibleInRange(node),
      });

  walker.currentNode = node;
  return walker;
};

/**
 * Modifies the start of the range, if necessary, to ensure the selection text
 * starts after a boundary char (whitespace, etc.) or a block boundary. Can only
 * expand the range, not shrink it.
 * @param range - the range to be modified
 */
const expandRangeStartToWordBound = (range: Range): void => {
  const segmenter =
      fragments.internal.makeNewSegmenter(range.startContainer.ownerDocument ?? undefined);
  if (segmenter) {
    // Find the starting text node and offset (since the range may start with a
    // non-text node).
    const startNode = getFirstNodeForBlockSearch(range);
    if (startNode !== range.startContainer) {
      range.setStartBefore(startNode);
    }

    expandToNearestWordBoundaryPointUsingSegments(
        segmenter, /* isRangeEnd= */ false, range);
  } else {
    // Simplest case: If we're in a text node, try to find a boundary char in
    // the same text node.
    const newOffset =
        findWordStartBoundInTextNode(range.startContainer, range.startOffset);
    if (newOffset !== -1) {
      range.setStart(range.startContainer, newOffset);
      return;
    }

    // Also, skip doing any traversal if we're already at the inside edge of
    // a block node.
    if (isBlock(range.startContainer) && range.startOffset === 0) {
      return;
    }

    const walker = makeWalkerForNode(range.startContainer);
    if (!walker) {
      return;
    }
    const finishedSubtrees = new Set<Node>();

    let node = fragments.internal.backwardTraverse(walker, finishedSubtrees);
    while (node != null) {
      const newOffset = findWordStartBoundInTextNode(node);
      if (newOffset !== -1) {
        range.setStart(node, newOffset);
        return;
      }

      // If |node| is a block node, then we've hit a block boundary, which
      // counts as a word boundary.
      if (isBlock(node)) {
        if ((node as Element).contains?.(range.startContainer)) {
          // If the selection starts inside |node|, then the correct range
          // boundary is the *leading* edge of |node|.
          range.setStart(node, 0);
        } else {
          // Otherwise, |node| is before the selection, so the correct boundary
          // is the *trailing* edge of |node|.
          range.setStartAfter(node);
        }
        return;
      }

      node = fragments.internal.backwardTraverse(walker, finishedSubtrees);
      // We should never get here; the walker should eventually hit a block node
      // or the root of the document. Collapse range so the caller can handle
      // this as an error.
      range.collapse();
    }
  }
};

/**
 * Moves the range edges to the first and last visible text nodes inside of it.
 * If there are no visible text nodes in the range then it is collapsed.
 * @param range - the range to be modified
 */
const moveRangeEdgesToTextNodes = (range: Range): void => {
  const firstTextNode = getFirstTextNode(range);
  // No text nodes in range. Collapsing the range and early return.
  if (firstTextNode == null) {
    range.collapse();
    return;
  }

  const firstNode = getFirstNodeForBlockSearch(range);

  // Making sure the range starts with visible text.
  if (firstNode !== firstTextNode) {
    range.setStart(firstTextNode, 0);
  }

  const lastNode = getLastNodeForBlockSearch(range);
  const lastTextNode = getLastTextNode(range)!;
  // No need for no text node checks here because we know at there's at least
  // firstTextNode in the range.

  // Making sure the range ends with visible text.
  if (lastNode !== lastTextNode) {
    range.setEnd(lastTextNode, (lastTextNode.textContent ?? '').length);
  }
};

/**
 * Uses Intl.Segmenter to shift the start or end of a range to a word boundary.
 * Helper method for expandWord*ToWordBound methods.
 * @param segmenter - object to use for word segmenting
 * @param isRangeEnd - true if the range end should be modified, false if the
 *     range start should be modified
 * @param range - the range to modify
 */
const expandToNearestWordBoundaryPointUsingSegments =
    (segmenter: Intl.Segmenter, isRangeEnd: boolean, range: Range): void => {
      // Find the index as an offset in the full text of the block in which
      // boundary occurs.
      const boundary = isRangeEnd ?
          {node: range.endContainer, offset: range.endOffset} :
          {node: range.startContainer, offset: range.startOffset};

      const nodes = getTextNodesInSameBlock(boundary.node);
      if (!nodes) return;
      const preNodeText = nodes.preNodes.reduce((prev, cur) => {
        return prev.concat(cur.textContent ?? '');
      }, '');

      const innerNodeText = nodes.innerNodes.reduce((prev, cur) => {
        return prev.concat(cur.textContent ?? '');
      }, '');

      let offsetInText = preNodeText.length;
      if (boundary.node.nodeType === Node.TEXT_NODE) {
        offsetInText += boundary.offset;
      } else if (isRangeEnd) {
        offsetInText += innerNodeText.length;
      }

      // Find the segment of the full block text containing the range start.
      const postNodeText = nodes.postNodes.reduce((prev, cur) => {
        return prev.concat(cur.textContent ?? '');
      }, '');

      const allNodes =
          [...nodes.preNodes, ...nodes.innerNodes, ...nodes.postNodes];

      // Edge case: There's no text nodes in the block.
      // In that case there's nothing to do because there is no word boundary
      // to find.
      if (allNodes.length == 0) {
        return;
      }

      const text = preNodeText.concat(innerNodeText, postNodeText);

      const segments = segmenter.segment(text);
      const foundSegment = segments.containing(offsetInText);

      if (!foundSegment) {
        if (isRangeEnd) {
          range.setEndAfter(allNodes[allNodes.length - 1]!);
        } else {
          range.setEndBefore(allNodes[0]!);
        }
        return;
      }

      // Easy case: if the segment is not word-like (i.e., contains whitespace,
      // punctuation, etc.) then nothing needs to be done because this
      // boundary point is between words.
      if (!foundSegment.isWordLike) {
        return;
      }

      // Another easy case: if we are at the first/last character of the
      // segment, then we're done.
      if (offsetInText === foundSegment.index ||
          offsetInText === foundSegment.index + foundSegment.segment.length) {
        return;
      }

      // We're inside a word. Based on |isRangeEnd|, the target offset will
      // either be the start or the end of the found segment.
      const desiredOffsetInText = isRangeEnd ?
          foundSegment.index + foundSegment.segment.length :
          foundSegment.index;
      let newNodeIndexInText = 0;
      for (const node of allNodes) {
        const nodeTextLength = (node.textContent ?? '').length;
        if (newNodeIndexInText <= desiredOffsetInText &&
            desiredOffsetInText <
                newNodeIndexInText + nodeTextLength) {
          const offsetInNode = desiredOffsetInText - newNodeIndexInText;
          if (isRangeEnd) {
            if (offsetInNode >= nodeTextLength) {
              range.setEndAfter(node);
            } else {
              range.setEnd(node, offsetInNode);
            }
          } else {
            if (offsetInNode >= nodeTextLength) {
              range.setStartAfter(node);
            } else {
              range.setStart(node, offsetInNode);
            }
          }
          return;
        }
        newNodeIndexInText += nodeTextLength;
      }

      // If we got here, then somehow the offset didn't fall within a node. As a
      // fallback, move the range to the start/end of the block.
      if (isRangeEnd) {
        range.setEndAfter(allNodes[allNodes.length - 1]!);
      } else {
        range.setStartBefore(allNodes[0]!);
      }
    };

interface TextNodeLists {
  preNodes: Text[];
  innerNodes: Text[];
  postNodes: Text[];
}

/**
 * Traverses the DOM to extract all TextNodes appearing in the same block level
 * as |node| (i.e., those that are descendents of a common ancestor of |node|
 * with no other block elements in between.)
 */
const getTextNodesInSameBlock = (node: Node): TextNodeLists | undefined => {
  const preNodes: Text[] = [];
  // First, backtraverse to get to a block boundary
  const backWalker = makeWalkerForNode(node);
  if (!backWalker) {
    return undefined;
  }
  const finishedSubtrees = new Set<Node>();
  let backNode: Node | null =
      fragments.internal.backwardTraverse(backWalker, finishedSubtrees);
  while (backNode != null && !isBlock(backNode)) {
    checkTimeout();
    if (backNode.nodeType === Node.TEXT_NODE) {
      preNodes.push(backNode as Text);
    }
    backNode =
        fragments.internal.backwardTraverse(backWalker, finishedSubtrees);
  }
  preNodes.reverse();

  const innerNodes: Text[] = [];
  if (node.nodeType === Node.TEXT_NODE) {
    innerNodes.push(node as Text);
  } else {
    const doc = node.ownerDocument ?? (node as unknown as Document);
    const walker = doc.createTreeWalker(
        node, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
          acceptNode: (n: Node) => fragments.internal.acceptNodeIfVisibleInRange(n),
        });
    walker.currentNode = node;
    let child = walker.nextNode();
    while (child != null) {
      checkTimeout();
      if (child.nodeType === Node.TEXT_NODE) {
        innerNodes.push(child as Text);
      }
      child = walker.nextNode();
    }
  }

  const postNodes: Text[] = [];
  const forwardWalker = makeWalkerForNode(node);
  if (!forwardWalker) {
    return undefined;
  }
  // Forward traverse from node after having finished its subtree
  // to get text nodes after it until we find a block boundary.
  const finishedSubtreesForward = new Set<Node>([node]);
  let forwardNode: Node | null = fragments.internal.forwardTraverse(
      forwardWalker, finishedSubtreesForward);
  while (forwardNode != null && !isBlock(forwardNode)) {
    checkTimeout();
    if (forwardNode.nodeType === Node.TEXT_NODE) {
      postNodes.push(forwardNode as Text);
    }
    forwardNode = fragments.internal.forwardTraverse(
        forwardWalker, finishedSubtreesForward);
  }

  return {preNodes, innerNodes, postNodes};
};

/**
 * Modifies the end of the range, if necessary, to ensure the selection text
 * ends before a boundary char (whitespace, etc.) or a block boundary. Can only
 * expand the range, not shrink it.
 * @param range - the range to be modified
 */
const expandRangeEndToWordBound = (range: Range): void => {
  const segmenter =
      fragments.internal.makeNewSegmenter(range.endContainer.ownerDocument ?? undefined);
  if (segmenter) {
    // Find the ending text node and offset (since the range may end with a
    // non-text node).
    const endNode = getLastNodeForBlockSearch(range);
    if (endNode !== range.endContainer) {
      range.setEndAfter(endNode);
    }
    expandToNearestWordBoundaryPointUsingSegments(
        segmenter, /* isRangeEnd= */ true, range);
  } else {
    let initialOffset: number | null = range.endOffset;

    let node: Node | null = range.endContainer;
    if (node.nodeType === Node.ELEMENT_NODE) {
      if (range.endOffset < node.childNodes.length) {
        node = node.childNodes[range.endOffset]!;
      }
    }

    const walker = makeWalkerForNode(node);
    if (!walker) {
      return;
    }
    // We'll traverse the dom after node's subtree to try to find
    // either a word or block boundary.
    const finishedSubtrees = new Set<Node>([node]);

    while (node != null) {
      checkTimeout();

      const newOffset = findWordEndBoundInTextNode(node, initialOffset);
      // Future iterations should not use initialOffset; null it out so it is
      // discarded.
      initialOffset = null;

      if (newOffset !== -1) {
        range.setEnd(node, newOffset);
        return;
      }

      // If |node| is a block node, then we've hit a block boundary, which
      // counts as a word boundary.
      if (isBlock(node)) {
        if ((node as Element).contains?.(range.endContainer)) {
          // If the selection starts inside |node|, then the correct range
          // boundary is the *trailing* edge of |node|.
          range.setEnd(node, node.childNodes.length);
        } else {
          // Otherwise, |node| is after the selection, so the correct boundary
          // is the *leading* edge of |node|.
          range.setEndBefore(node);
        }
        return;
      }

      node = fragments.internal.forwardTraverse(walker, finishedSubtrees);
    }
    // We should never get here; the walker should eventually hit a block node
    // or the root of the document. Collapse range so the caller can handle this
    // as an error.
    range.collapse();
  }
};

/**
 * Helper to determine if a node is a block element or not.
 * @param node - the node to evaluate
 * @return true if the node is an element classified as block-level
 */
const isBlock = (node: Node): boolean => {
  return node.nodeType === Node.ELEMENT_NODE &&
      (fragments.internal.BLOCK_ELEMENTS.includes((node as Element).tagName.toUpperCase()) ||
       (node as Element).tagName.toUpperCase() === 'HTML' ||
       (node as Element).tagName.toUpperCase() === 'BODY');
};

/**
 * Helper to determine if a node is a Text Node or not
 * @param node - the node to evaluate
 * @return true if the node is a Text Node
 */
const isText = (node: Node): boolean => {
  return node.nodeType === Node.TEXT_NODE;
};
