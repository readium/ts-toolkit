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
// (https://github.com/GoogleChromeLabs/text-fragments-polyfill), trimmed to
// the directive-matching subset (dropped the live-highlighting/marking
// exports) and converted from JSDoc-typed JavaScript to TypeScript. See
// README.MD in this directory.

export interface TextFragment {
  textStart: string;
  textEnd?: string;
  prefix?: string;
  suffix?: string;
}

interface BoundaryPoint {
  node: Node;
  offset: number;
}

type ElementFilterFunction = (node: Node) => number;

// Block elements. elements of a text fragment cannot cross the boundaries of a
// block element. Source for the list:
// https://developer.mozilla.org/en-US/docs/Web/HTML/Block-level_elements#Elements
const BLOCK_ELEMENTS = [
  'ADDRESS',    'ARTICLE',  'ASIDE',  'BLOCKQUOTE', 'BR',     'DETAILS',
  'DIALOG',     'DD',       'DIV',    'DL',         'DT',     'FIELDSET',
  'FIGCAPTION', 'FIGURE',   'FOOTER', 'FORM',       'H1',     'H2',
  'H3',         'H4',       'H5',     'H6',         'HEADER', 'HGROUP',
  'HR',         'LI',       'MAIN',   'NAV',        'OL',     'P',
  'PRE',        'SECTION',  'TABLE',  'UL',         'TR',     'TH',
  'TD',         'COLGROUP', 'COL',    'CAPTION',    'THEAD',  'TBODY',
  'TFOOT',
];

// Characters that indicate a word boundary. Use the script
// tools/generate-boundary-regex.js if it's necessary to modify or regenerate
// this. Because it's a hefty regex, this should be used infrequently and only
// on single-character strings.
const BOUNDARY_CHARS =
    /[\t-\r -#%-\*,-\/:;\?@\[-\]_\{\}\x85\xA0\xA1\xA7\xAB\xB6\xB7\xBB\xBF\u037E\u0387\u055A-\u055F\u0589\u058A\u05BE\u05C0\u05C3\u05C6\u05F3\u05F4\u0609\u060A\u060C\u060D\u061B\u061E\u061F\u066A-\u066D\u06D4\u0700-\u070D\u07F7-\u07F9\u0830-\u083E\u085E\u0964\u0965\u0970\u0AF0\u0DF4\u0E4F\u0E5A\u0E5B\u0F04-\u0F12\u0F14\u0F3A-\u0F3D\u0F85\u0FD0-\u0FD4\u0FD9\u0FDA\u104A-\u104F\u10FB\u1360-\u1368\u1400\u166D\u166E\u1680\u169B\u169C\u16EB-\u16ED\u1735\u1736\u17D4-\u17D6\u17D8-\u17DA\u1800-\u180A\u1944\u1945\u1A1E\u1A1F\u1AA0-\u1AA6\u1AA8-\u1AAD\u1B5A-\u1B60\u1BFC-\u1BFF\u1C3B-\u1C3F\u1C7E\u1C7F\u1CC0-\u1CC7\u1CD3\u2000-\u200A\u2010-\u2029\u202F-\u2043\u2045-\u2051\u2053-\u205F\u207D\u207E\u208D\u208E\u2308-\u230B\u2329\u232A\u2768-\u2775\u27C5\u27C6\u27E6-\u27EF\u2983-\u2998\u29D8-\u29DB\u29FC\u29FD\u2CF9-\u2CFC\u2CFE\u2CFF\u2D70\u2E00-\u2E2E\u2E30-\u2E44\u3000-\u3003\u3008-\u3011\u3014-\u301F\u3030\u303D\u30A0\u30FB\uA4FE\uA4FF\uA60D-\uA60F\uA673\uA67E\uA6F2-\uA6F7\uA874-\uA877\uA8CE\uA8CF\uA8F8-\uA8FA\uA8FC\uA92E\uA92F\uA95F\uA9C1-\uA9CD\uA9DE\uA9DF\uAA5C-\uAA5F\uAADE\uAADF\uAAF0\uAAF1\uABEB\uFD3E\uFD3F\uFE10-\uFE19\uFE30-\uFE52\uFE54-\uFE61\uFE63\uFE68\uFE6A\uFE6B\uFF01-\uFF03\uFF05-\uFF0A\uFF0C-\uFF0F\uFF1A\uFF1B\uFF1F\uFF20\uFF3B-\uFF3D\uFF3F\uFF5B\uFF5D\uFF5F-\uFF65]|\uD800[\uDD00-\uDD02\uDF9F\uDFD0]|\uD801\uDD6F|\uD802[\uDC57\uDD1F\uDD3F\uDE50-\uDE58\uDE7F\uDEF0-\uDEF6\uDF39-\uDF3F\uDF99-\uDF9C]|\uD804[\uDC47-\uDC4D\uDCBB\uDCBC\uDCBE-\uDCC1\uDD40-\uDD43\uDD74\uDD75\uDDC5-\uDDC9\uDDCD\uDDDB\uDDDD-\uDDDF\uDE38-\uDE3D\uDEA9]|\uD805[\uDC4B-\uDC4F\uDC5B\uDC5D\uDCC6\uDDC1-\uDDD7\uDE41-\uDE43\uDE60-\uDE6C\uDF3C-\uDF3E]|\uD807[\uDC41-\uDC45\uDC70\uDC71]|\uD809[\uDC70-\uDC74]|\uD81A[\uDE6E\uDE6F\uDEF5\uDF37-\uDF3B\uDF44]|\uD82F\uDC9F|\uD836[\uDE87-\uDE8B]|\uD83A[\uDD5E\uDD5F]/u;

// The same thing, but with a ^.
const NON_BOUNDARY_CHARS =
    /[^\t-\r -#%-\*,-\/:;\?@\[-\]_\{\}\x85\xA0\xA1\xA7\xAB\xB6\xB7\xBB\xBF\u037E\u0387\u055A-\u055F\u0589\u058A\u05BE\u05C0\u05C3\u05C6\u05F3\u05F4\u0609\u060A\u060C\u060D\u061B\u061E\u061F\u066A-\u066D\u06D4\u0700-\u070D\u07F7-\u07F9\u0830-\u083E\u085E\u0964\u0965\u0970\u0AF0\u0DF4\u0E4F\u0E5A\u0E5B\u0F04-\u0F12\u0F14\u0F3A-\u0F3D\u0F85\u0FD0-\u0FD4\u0FD9\u0FDA\u104A-\u104F\u10FB\u1360-\u1368\u1400\u166D\u166E\u1680\u169B\u169C\u16EB-\u16ED\u1735\u1736\u17D4-\u17D6\u17D8-\u17DA\u1800-\u180A\u1944\u1945\u1A1E\u1A1F\u1AA0-\u1AA6\u1AA8-\u1AAD\u1B5A-\u1B60\u1BFC-\u1BFF\u1C3B-\u1C3F\u1C7E\u1C7F\u1CC0-\u1CC7\u1CD3\u2000-\u200A\u2010-\u2029\u202F-\u2043\u2045-\u2051\u2053-\u205F\u207D\u207E\u208D\u208E\u2308-\u230B\u2329\u232A\u2768-\u2775\u27C5\u27C6\u27E6-\u27EF\u2983-\u2998\u29D8-\u29DB\u29FC\u29FD\u2CF9-\u2CFC\u2CFE\u2CFF\u2D70\u2E00-\u2E2E\u2E30-\u2E44\u3000-\u3003\u3008-\u3011\u3014-\u301F\u3030\u303D\u30A0\u30FB\uA4FE\uA4FF\uA60D-\uA60F\uA673\uA67E\uA6F2-\uA6F7\uA874-\uA877\uA8CE\uA8CF\uA8F8-\uA8FA\uA8FC\uA92E\uA92F\uA95F\uA9C1-\uA9CD\uA9DE\uA9DF\uAA5C-\uAA5F\uAADE\uAADF\uAAF0\uAAF1\uABEB\uFD3E\uFD3F\uFE10-\uFE19\uFE30-\uFE52\uFE54-\uFE61\uFE63\uFE68\uFE6A\uFE6B\uFF01-\uFF03\uFF05-\uFF0A\uFF0C-\uFF0F\uFF1A\uFF1B\uFF1F\uFF20\uFF3B-\uFF3D\uFF3F\uFF5B\uFF5D\uFF5F-\uFF65]|\uD800[\uDD00-\uDD02\uDF9F\uDFD0]|\uD801\uDD6F|\uD802[\uDC57\uDD1F\uDD3F\uDE50-\uDE58\uDE7F\uDEF0-\uDEF6\uDF39-\uDF3F\uDF99-\uDF9C]|\uD804[\uDC47-\uDC4D\uDCBB\uDCBC\uDCBE-\uDCC1\uDD40-\uDD43\uDD74\uDD75\uDDC5-\uDDC9\uDDCD\uDDDB\uDDDD-\uDDDF\uDE38-\uDE3D\uDEA9]|\uD805[\uDC4B-\uDC4F\uDC5B\uDC5D\uDCC6\uDDC1-\uDDD7\uDE41-\uDE43\uDE60-\uDE6C\uDF3C-\uDF3E]|\uD807[\uDC41-\uDC45\uDC70\uDC71]|\uD809[\uDC70-\uDC74]|\uD81A[\uDE6E\uDE6F\uDEF5\uDF37-\uDF3B\uDF44]|\uD82F\uDC9F|\uD836[\uDE87-\uDE8B]|\uD83A[\uDD5E\uDD5F]/u;

/**
 * Searches the document for a given text fragment.
 *
 * @param textFragment - Text Fragment to highlight.
 * @param documentToProcess - document where to extract and mark fragments in.
 * @param root - the root element where to extract and mark fragments in.
 * @return Zero or more ranges within the document corresponding to the
 *     fragment. If the fragment corresponds to more than one location in the
 *     document (i.e., is ambiguous) then the first two matches will be
 *     returned (regardless of how many more matches there may be in the
 *     document).
 */
export const processTextFragmentDirective =
    (textFragment: TextFragment, documentToProcess: Document, root?: Node): Range[] => {
      const results: Range[] = [];

      const searchRange = documentToProcess.createRange();
      searchRange.selectNodeContents(root ?? documentToProcess);

      while (!searchRange.collapsed && results.length < 2) {
        let potentialMatch: Range | undefined;
        if (textFragment.prefix) {
          const prefixMatch = findTextInRange(textFragment.prefix, searchRange);
          if (prefixMatch == null) {
            break;
          }
          // Future iterations, if necessary, should start after the first
          // character of the prefix match.
          advanceRangeStartPastOffset(
              searchRange,
              prefixMatch.startContainer,
              prefixMatch.startOffset,
          );

          // The search space for textStart is everything after the prefix and
          // before the end of the top-level search range, starting at the next
          // non- whitespace position.
          const matchRange = documentToProcess.createRange();
          matchRange.setStart(prefixMatch.endContainer, prefixMatch.endOffset);
          matchRange.setEnd(searchRange.endContainer, searchRange.endOffset);

          advanceRangeStartToNonWhitespace(matchRange);
          if (matchRange.collapsed) {
            break;
          }

          potentialMatch = findTextInRange(textFragment.textStart, matchRange);
          // If textStart wasn't found anywhere in the matchRange, then there's
          // no possible match and we can stop early.
          if (potentialMatch == null) {
            break;
          }

          // If potentialMatch is immediately after the prefix (i.e., its start
          // equals matchRange's start), this is a candidate and we should keep
          // going with this iteration. Otherwise, we'll need to find the next
          // instance (if any) of the prefix.
          if (potentialMatch.compareBoundaryPoints(
                  Range.START_TO_START,
                  matchRange,
                  ) !== 0) {
            continue;
          }
        } else {
          // With no prefix, just look directly for textStart.
          potentialMatch = findTextInRange(textFragment.textStart, searchRange);
          if (potentialMatch == null) {
            break;
          }
          advanceRangeStartPastOffset(
              searchRange,
              potentialMatch.startContainer,
              potentialMatch.startOffset,
          );
        }

        if (textFragment.textEnd) {
          const textEndRange = documentToProcess.createRange();
          textEndRange.setStart(
              potentialMatch.endContainer, potentialMatch.endOffset);
          textEndRange.setEnd(searchRange.endContainer, searchRange.endOffset);

          // Keep track of matches of the end term followed by suffix term
          // (if needed).
          // If no matches are found then there's no point in keeping looking
          // for matches of the start term after the current start term
          // occurrence.
          let matchFound = false;

          // Search through the rest of the document to find a textEnd match.
          // This may take multiple iterations if a suffix needs to be found.
          while (!textEndRange.collapsed && results.length < 2) {
            const textEndMatch =
                findTextInRange(textFragment.textEnd, textEndRange);
            if (textEndMatch == null) {
              break;
            }

            advanceRangeStartPastOffset(
                textEndRange, textEndMatch.startContainer,
                textEndMatch.startOffset);

            potentialMatch.setEnd(
                textEndMatch.endContainer, textEndMatch.endOffset);

            if (textFragment.suffix) {
              // If there's supposed to be a suffix, check if it appears after
              // the textEnd we just found.
              const suffixResult = checkSuffix(
                  textFragment.suffix, potentialMatch, searchRange,
                  documentToProcess);
              if (suffixResult === CheckSuffixResult.NO_SUFFIX_MATCH) {
                break;
              } else if (suffixResult === CheckSuffixResult.SUFFIX_MATCH) {
                matchFound = true;
                results.push(potentialMatch.cloneRange());
                continue;
              } else if (suffixResult === CheckSuffixResult.MISPLACED_SUFFIX) {
                continue;
              }
            } else {
              // If we've found textEnd and there's no suffix, then it's a
              // match!
              matchFound = true;
              results.push(potentialMatch.cloneRange());
            }
          }
          // Stopping match search because suffix or textEnd are missing from
          // the rest of the search space.
          if (!matchFound) {
            break;
          }

        } else if (textFragment.suffix) {
          // If there's no textEnd but there is a suffix, search for the suffix
          // after potentialMatch
          const suffixResult = checkSuffix(
              textFragment.suffix, potentialMatch, searchRange,
              documentToProcess);
          if (suffixResult === CheckSuffixResult.NO_SUFFIX_MATCH) {
            break;
          } else if (suffixResult === CheckSuffixResult.SUFFIX_MATCH) {
            results.push(potentialMatch.cloneRange());
            advanceRangeStartPastOffset(
                searchRange, searchRange.startContainer,
                searchRange.startOffset);
            continue;
          } else if (suffixResult === CheckSuffixResult.MISPLACED_SUFFIX) {
            continue;
          }
        } else {
          results.push(potentialMatch.cloneRange());
        }
      }
      return results;
    };

/**
 * Enum indicating the result of the checkSuffix function.
 */
const CheckSuffixResult = {
  NO_SUFFIX_MATCH: 0,   // Suffix wasn't found at all. Search should halt.
  SUFFIX_MATCH: 1,      // The suffix matches the expectation.
  MISPLACED_SUFFIX: 2,  // The suffix was found, but not in the right place.
} as const;

/**
 * Checks to see if potentialMatch satisfies the suffix conditions of this
 * Text Fragment.
 * @param suffix - the suffix text to find
 * @param potentialMatch - the Range containing the match text.
 * @param searchRange - the Range in which to search for |suffix|.
 *     Regardless of the start boundary of this Range, nothing appearing before
 *     |potentialMatch| will be considered.
 * @param documentToProcess - document where to extract and mark fragments in.
 * @return enum value indicating that potentialMatch should be accepted, that
 *     the search should continue, or that the search should halt.
 */
const checkSuffix =
    (suffix: string, potentialMatch: Range, searchRange: Range, documentToProcess: Document): number => {
      const suffixRange = documentToProcess.createRange();
      suffixRange.setStart(
          potentialMatch.endContainer,
          potentialMatch.endOffset,
      );
      suffixRange.setEnd(searchRange.endContainer, searchRange.endOffset);
      advanceRangeStartToNonWhitespace(suffixRange);

      const suffixMatch = findTextInRange(suffix, suffixRange);
      // If suffix wasn't found anywhere in the suffixRange, then there's no
      // possible match and we can stop early.
      if (suffixMatch == null) {
        return CheckSuffixResult.NO_SUFFIX_MATCH;
      }

      // If suffixMatch is immediately after potentialMatch (i.e., its start
      // equals suffixRange's start), this is a match. If not, we have to
      // start over from the beginning.
      if (suffixMatch.compareBoundaryPoints(
              Range.START_TO_START, suffixRange) !== 0) {
        return CheckSuffixResult.MISPLACED_SUFFIX;
      }

      return CheckSuffixResult.SUFFIX_MATCH;
    };

/**
 * Sets the start of |range| to be the first boundary point after |offset| in
 * |node|--either at offset+1, or after the node.
 * @param range - the range to mutate
 * @param node - the node used to determine the new range start
 * @param offset - the offset immediately before the desired new boundary point
 */
const advanceRangeStartPastOffset = (range: Range, node: Node, offset: number): void => {
  try {
    range.setStart(node, offset + 1);
  } catch (err) {
    range.setStartAfter(node);
  }
};

/**
 * Modifies |range| to start at the next non-whitespace position.
 * @param range - the range to mutate
 */
const advanceRangeStartToNonWhitespace = (range: Range): void => {
  const walker = makeTextNodeWalker(range);

  let node = walker.nextNode() as Text | null;
  while (!range.collapsed && node != null) {
    if (node !== range.startContainer) {
      range.setStart(node, 0);
    }

    if (node.textContent!.length > range.startOffset) {
      const firstChar = node.textContent![range.startOffset];
      if (!firstChar.match(/\s/)) {
        return;
      }
    }

    try {
      range.setStart(node, range.startOffset + 1);
    } catch (err) {
      node = walker.nextNode() as Text | null;
      if (node == null) {
        range.collapse();
      } else {
        range.setStart(node, 0);
      }
    }
  }
};

/**
 * Creates a TreeWalker that traverses a range and emits visible text nodes in
 * the range.
 * @param range - Range to be traversed by the walker
 */
const makeTextNodeWalker = (range: Range): TreeWalker => {
  const doc = range.commonAncestorContainer.ownerDocument ?? (range.commonAncestorContainer as unknown as Document);
  return doc.createTreeWalker(
      range.commonAncestorContainer,
      NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
      {
        acceptNode: (node: Node) => acceptTextNodeIfVisibleInRange(node, range),
      },
  );
};

/**
 * Helper function to check if the element has attribute `hidden="until-found"`.
 * @param elt - the element to evaluate
 * @return true if the element has attribute `hidden="until-found"`
 */
const isHiddenUntilFound = (elt: Element): boolean => {
  if ((elt as unknown as { hidden: unknown }).hidden === 'until-found') {
    return true;
  }
  // Workaround for WebKit. See https://bugs.webkit.org/show_bug.cgi?id=238266
  const attributes = elt.attributes as unknown as Record<string, { value: string } | undefined>;
  if (attributes && attributes['hidden']) {
    const value = attributes['hidden']!.value;
    if (value === 'until-found') {
      return true;
    }
  }
  return false;
};

/**
 * Helper function to calculate the visibility of a Node based on its CSS
 * computed style. This function does not take into account the visibility of
 * the node's ancestors so even if the node is visible according to its style
 * it might not be visible on the page if one of its ancestors is not visible.
 * @param node - the Node to evaluate
 * @return true if the node is visible. A node will be visible if
 * its computed style meets all of the following criteria:
 *  - non zero height, width, height and opacity
 *  - visibility not hidden
 *  - display not none
 */
const isNodeVisible = (node: Node): boolean => {
  // Find an HTMLElement (this node or an ancestor) so we can check
  // visibility.
  let elt: Node | null = node;
  while (elt != null && !(elt instanceof HTMLElement)) elt = elt.parentNode;
  // A document parsed via DOMParser (as opposed to one attached to a
  // real browsing context) has no defaultView, and therefore no
  // rendering/layout at all — nothing to check visibility against, so
  // every node in it counts as visible.
  const win = elt?.ownerDocument?.defaultView;
  if (elt != null && win != null) {
    if (isHiddenUntilFound(elt)) {
      return true;
    }
    const nodeStyle = win.getComputedStyle(elt);
    // If the node is not rendered, just skip it.
    if (nodeStyle.visibility === 'hidden' || nodeStyle.display === 'none' ||
        parseInt(nodeStyle.height, 10) === 0 &&
            nodeStyle.overflowY != 'visible' ||
        parseInt(nodeStyle.width, 10) === 0 &&
            nodeStyle.overflowX != 'visible' ||
        parseInt(nodeStyle.opacity, 10) === 0) {
      return false;
    }
  }
  return true;
};

/**
 * Filter function for use with TreeWalkers. Rejects nodes that aren't in the
 * given range or aren't visible.
 * @param node - the Node to evaluate
 * @param range - the range in which node must fall. Optional; if null, the
 *     range check is skipped.
 * @return FILTER_ACCEPT or FILTER_REJECT, to be passed along to a TreeWalker.
 */
const acceptNodeIfVisibleInRange = (node: Node, range?: Range): number => {
  if (range != null && !range.intersectsNode(node))
    return NodeFilter.FILTER_REJECT;

  return isNodeVisible(node) ? NodeFilter.FILTER_ACCEPT :
                               NodeFilter.FILTER_REJECT;
};

/**
 * Filter function for use with TreeWalkers. Accepts only visible text nodes
 * that are in the given range. Other types of nodes visible in the given range
 * are skipped so a TreeWalker using this filter function still visits text
 * nodes in the node's subtree.
 * @param node - the Node to evaluate
 * @param range - the range in which node must fall. Optional; if null, the
 *     range check is skipped/
 * @return NodeFilter value to be passed along to a TreeWalker.
 * Values returned:
 *  - FILTER_REJECT: Node not in range or not visible.
 *  - FILTER_SKIP: Non Text Node visible and in range
 *  - FILTER_ACCEPT: Text Node visible and in range
 */
const acceptTextNodeIfVisibleInRange = (node: Node, range?: Range): number => {
  if (range != null && !range.intersectsNode(node))
    return NodeFilter.FILTER_REJECT;

  if (!isNodeVisible(node)) {
    return NodeFilter.FILTER_REJECT;
  }

  return node.nodeType === Node.TEXT_NODE ? NodeFilter.FILTER_ACCEPT :
                                            NodeFilter.FILTER_SKIP;
};

/**
 * Extracts all the text nodes within the given range.
 * @param root - the root node in which to search
 * @param range - a range restricting the scope of extraction
 * @return a list of lists of text nodes, in document order. Lists represent
 *     block boundaries; i.e., two nodes appear in the same list iff there are
 *     no block element starts or ends in between them.
 */
const getAllTextNodes = (root: Node, range?: Range): Text[][] => {
  const blocks: Text[][] = [];
  let tmp: Text[] = [];

  const nodes = Array.from(
      getElementsIn(
          root,
          (node) => {
            return acceptNodeIfVisibleInRange(node, range);
          }),
  );

  for (const node of nodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      tmp.push(node as Text);
    } else if (
        node instanceof HTMLElement &&
        BLOCK_ELEMENTS.includes(node.tagName.toUpperCase()) && tmp.length > 0) {
      // If this is a block element, the current set of text nodes in |tmp| is
      // complete, and we need to move on to a new one.
      blocks.push(tmp);
      tmp = [];
    }
  }
  if (tmp.length > 0) blocks.push(tmp);

  return blocks;
};

/**
 * Returns the textContent of all the textNodes and normalizes strings by
 * replacing duplicated spaces with single space.
 * @param nodes - TextNodes to get the textContent from.
 * @param startOffset - Where to start in the first TextNode.
 * @param endOffset - Where to end in the last TextNode.
 * @return Entire text content of all the nodes, with spaces normalized.
 */
const getTextContent = (nodes: Text[], startOffset: number, endOffset?: number): string => {
  let str = '';
  if (nodes.length === 1) {
    str = nodes[0]!.textContent!.substring(startOffset, endOffset);
  } else {
    str = nodes[0]!.textContent!.substring(startOffset) +
        nodes.slice(1, -1).reduce((s, n) => s + n.textContent, '') +
        nodes.slice(-1)[0]!.textContent!.substring(0, endOffset);
  }
  return str.replace(/[\t\n\r ]+/g, ' ');
};

/**
 * Returns all nodes inside root using the provided filter.
 * @param root - Node where to start the TreeWalker.
 * @param filter - Filter provided to the TreeWalker's acceptNode filter.
 * @yield All elements that were accepted by filter.
 */
function* getElementsIn(root: Node, filter: ElementFilterFunction): Generator<Node> {
  const doc = root.ownerDocument ?? (root as unknown as Document);
  const treeWalker = doc.createTreeWalker(
      root,
      NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
      {acceptNode: filter},
  );

  const finishedSubtrees = new Set<Node>();
  while (forwardTraverse(treeWalker, finishedSubtrees) !== null) {
    yield treeWalker.currentNode;
  }
}

/**
 * Returns a range pointing to the first instance of |query| within |range|.
 * @param query - the string to find
 * @param range - the range in which to search
 * @return The first found instance of |query| within |range|.
 */
const findTextInRange = (query: string, range: Range): Range | undefined => {
  const textNodeLists = getAllTextNodes(range.commonAncestorContainer, range);
  const segmenter = makeNewSegmenter(range.commonAncestorContainer.ownerDocument ?? undefined);

  for (const list of textNodeLists) {
    const found = findRangeFromNodeList(query, range, list, segmenter);
    if (found !== undefined) return found;
  }
  return undefined;
};

/**
 * Finds a range pointing to the first instance of |query| within |range|,
 * searching over the text contained in a list |nodeList| of relevant textNodes.
 * @param query - the string to find
 * @param range - the range in which to search
 * @param textNodes - the visible text nodes within |range|
 * @param segmenter - a segmenter to be used for finding word boundaries, if
 *     supported
 * @return the found range, or undefined if no such range could be found
 */
const findRangeFromNodeList = (query: string, range: Range, textNodes: Text[], segmenter?: Intl.Segmenter): Range | undefined => {
  if (!query || !range || !(textNodes || []).length) return undefined;
  const startOffset =
      textNodes[0] === range.startContainer ? range.startOffset : 0;
  const data =
      normalizeString(getTextContent(textNodes, startOffset, undefined));
  const normalizedQuery = normalizeString(query);
  let searchStart = 0;
  let start: BoundaryPoint | undefined;
  let end: BoundaryPoint | undefined;
  while (searchStart < data.length) {
    const matchIndex = data.indexOf(normalizedQuery, searchStart);
    if (matchIndex === -1) return undefined;
    if (isWordBounded(data, matchIndex, normalizedQuery.length, segmenter)) {
      const normalizedStartOffset =
          normalizeString(textNodes[0]!.data.slice(0, startOffset)).length;
      start = getBoundaryPointAtIndex(
          normalizedStartOffset + matchIndex, textNodes, /* isEnd=*/ false);
      end = getBoundaryPointAtIndex(
          normalizedStartOffset + matchIndex + normalizedQuery.length,
          textNodes,
          /* isEnd=*/ true,
      );
    }

    if (start != null && end != null) {
      const foundRange = new Range();
      foundRange.setStart(start.node, start.offset);
      foundRange.setEnd(end.node, end.offset);

      // Verify that |foundRange| is a subrange of |range|
      if (range.compareBoundaryPoints(Range.START_TO_START, foundRange) <= 0 &&
          range.compareBoundaryPoints(Range.END_TO_END, foundRange) >= 0) {
        return foundRange;
      }
    }
    searchStart = matchIndex + 1;
  }
  return undefined;
};

/**
 * Generates a boundary point pointing to the given text position.
 * @param index - the text offset indicating the start/end of a substring of
 *     the concatenated, normalized text in |textNodes|
 * @param textNodes - the text Nodes whose contents make up the search space
 * @param isEnd - indicates whether the offset is the start or end of the
 *     substring
 * @return a boundary point suitable for setting as the start or end of a
 *     Range, or undefined if it couldn't be computed.
 */
const getBoundaryPointAtIndex = (index: number, textNodes: Text[], isEnd: boolean): BoundaryPoint | undefined => {
  let counted = 0;
  let normalizedData: string | undefined;
  for (let i = 0; i < textNodes.length; i++) {
    const node = textNodes[i]!;
    if (!normalizedData) normalizedData = normalizeString(node.data);
    let nodeEnd = counted + normalizedData.length;
    if (isEnd) nodeEnd += 1;
    if (nodeEnd > index) {
      // |index| falls within this node, but we need to turn the offset in the
      // normalized data into an offset in the real node data.
      const normalizedOffset = index - counted;
      let denormalizedOffset = Math.min(index - counted, node.data.length);

      // Walk through the string until denormalizedOffset produces a substring
      // that corresponds to the target from the normalized data.
      const targetSubstring = isEnd ?
          normalizedData.substring(0, normalizedOffset) :
          normalizedData.substring(normalizedOffset);

      let candidateSubstring = isEnd ?
          normalizeString(node.data.substring(0, denormalizedOffset)) :
          normalizeString(node.data.substring(denormalizedOffset));

      // We will either lengthen or shrink the candidate string to approach the
      // length of the target string. If we're looking for the start, adding 1
      // makes the candidate shorter; if we're looking for the end, it makes the
      // candidate longer.
      const direction = (isEnd ? -1 : 1) *
          (targetSubstring.length > candidateSubstring.length ? -1 : 1);

      while (denormalizedOffset >= 0 &&
             denormalizedOffset <= node.data.length) {
        if (candidateSubstring.length === targetSubstring.length) {
          return {node: node, offset: denormalizedOffset};
        }

        denormalizedOffset += direction;

        candidateSubstring = isEnd ?
            normalizeString(node.data.substring(0, denormalizedOffset)) :
            normalizeString(node.data.substring(denormalizedOffset));
      }
    }
    counted += normalizedData.length;

    if (i + 1 < textNodes.length) {
      // Edge case: if this node ends with a whitespace character and the next
      // node starts with one, they'll be double-counted relative to the
      // normalized version. Subtract 1 from |counted| to compensate.
      const nextNormalizedData = normalizeString(textNodes[i + 1]!.data);
      if (normalizedData.slice(-1) === ' ' &&
          nextNormalizedData.slice(0, 1) === ' ') {
        counted -= 1;
      }
      // Since we already normalized the next node's data, hold on to it for the
      // next iteration.
      normalizedData = nextNormalizedData;
    }
  }
  return undefined;
};

/**
 * Checks if a substring is word-bounded in the context of a longer string.
 *
 * If an Intl.Segmenter is provided for locale-specific segmenting, it will be
 * used for this check. This is the most desirable option, but not supported in
 * all browsers.
 *
 * If one is not provided, a heuristic will be applied,
 * returning true iff:
 *  - startPos == 0 OR char before start is a boundary char, AND
 *  - length indicates end of string OR char after end is a boundary char
 * Where boundary chars are whitespace/punctuation defined in the const above.
 * This causes the known issue that some languages, notably Japanese, only match
 * at the level of roughly a full clause or sentence, rather than a word.
 *
 * @param text - the text to search
 * @param startPos - the index of the start of the substring
 * @param length - the length of the substring
 * @param segmenter - a segmenter to be used for finding word boundaries, if
 *     supported
 * @return true iff startPos and length point to a word-bounded substring of
 *     |text|.
 */
const isWordBounded = (text: string, startPos: number, length: number, segmenter?: Intl.Segmenter): boolean => {
  if (startPos < 0 || startPos >= text.length || length <= 0 ||
      startPos + length > text.length) {
    return false;
  }

  if (segmenter) {
    // If the Intl.Segmenter API is available on this client, use it for more
    // reliable word boundary checking.

    const segments = segmenter.segment(text);
    const startSegment = segments.containing(startPos);
    if (!startSegment) return false;
    // If the start index is inside a word segment but not the first character
    // in that segment, it's not word-bounded. If it's not a word segment, then
    // it's punctuation, etc., so that counts for word bounding.
    if (startSegment.isWordLike && startSegment.index != startPos) return false;

    // |endPos| points to the first character outside the target substring.
    const endPos = startPos + length;
    const endSegment = segments.containing(endPos);

    // If there's no end segment found, it's because we're at the end of the
    // text, which is a valid boundary. (Because of the preconditions we
    // checked above, we know we aren't out of range.)
    // If there's an end segment found but it's non-word-like, that's also OK,
    // since punctuation and whitespace are acceptable boundaries.
    // Lastly, if there's an end segment and it is word-like, then |endPos|
    // needs to point to the start of that new word, or |endSegment.index|.
    if (endSegment && endSegment.isWordLike && endSegment.index != endPos)
      return false;
  } else {
    // We don't have Intl.Segmenter support, so fall back to checking whether or
    // not the substring is flanked by boundary characters.

    // If the first character is already a boundary, move it once.
    if (text[startPos]!.match(BOUNDARY_CHARS)) {
      ++startPos;
      --length;
      if (!length) {
        return false;
      }
    }

    // If the last character is already a boundary, move it once.
    if (text[startPos + length - 1]!.match(BOUNDARY_CHARS)) {
      --length;
      if (!length) {
        return false;
      }
    }

    if (startPos !== 0 && (!text[startPos - 1]!.match(BOUNDARY_CHARS)))
      return false;

    if (startPos + length !== text.length &&
        !text[startPos + length]!.match(BOUNDARY_CHARS))
      return false;
  }

  return true;
};

/**
 * @param str - a string to be normalized
 * @return a normalized version of |str| with all consecutive whitespace chars
 *     converted to a single ' ' and all diacriticals removed (e.g., 'é' ->
 *     'e').
 */
const normalizeString = (str?: string): string => {
  // First, decompose any characters with diacriticals. Then, turn all
  // consecutive whitespace characters into a standard " ", and strip out
  // anything in the Unicode U+0300..U+036F (Combining Diacritical Marks) range.
  // This may change the length of the string.
  return (str || '')
      .normalize('NFKD')
      .replace(/\s+/g, ' ')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
};

/**
 * @param doc - document whose language governs segmentation.
 * @return a segmenter object suitable for finding word boundaries. Returns
 *     undefined on browsers/platforms that do not yet support the
 *     Intl.Segmenter API.
 */
const makeNewSegmenter = (doc?: Document): Intl.Segmenter | undefined => {
  if (Intl.Segmenter) {
    // Falls back to the runtime's default locale (undefined) rather than
    // upstream's navigator.language — doc.defaultView is null for a
    // detached, DOMParser-produced document, which is the common case here.
    const lang = doc?.documentElement?.lang || doc?.defaultView?.navigator?.language || undefined;
    return new Intl.Segmenter(lang, {granularity: 'word'});
  }
  return undefined;
};

/**
 * Performs traversal on a TreeWalker, visiting each subtree in document order.
 * When visiting a subtree not already visited (its root not in finishedSubtrees
 * ), first the root is emitted then the subtree is traversed, then the root is
 * emitted again and then the next subtree in document order is visited.
 *
 * Subtree's roots are emitted twice to signal the beginning and ending of
 * element nodes. This is useful for ensuring the ends of block boundaries are
 * found.
 * @param walker - the TreeWalker to be traversed
 * @param finishedSubtrees - set of subtree roots already visited
 * @return next node in the traversal
 */
const forwardTraverse = (walker: TreeWalker, finishedSubtrees: Set<Node>): Node | null => {
  // If current node's subtree is not already finished
  // try to go first down the subtree.
  if (!finishedSubtrees.has(walker.currentNode)) {
    const firstChild = walker.firstChild();
    if (firstChild !== null) {
      return firstChild;
    }
  }

  // If no subtree go to next sibling if any.
  const nextSibling = walker.nextSibling();
  if (nextSibling !== null) {
    return nextSibling;
  }

  // If no sibling go back to parent and mark it as finished.
  const parent = walker.parentNode();

  if (parent !== null) {
    finishedSubtrees.add(parent);
  }

  return parent;
};

/**
 * Performs backwards traversal on a TreeWalker, visiting each subtree in
 * backwards document order. When visiting a subtree not already visited (its
 * root not in finishedSubtrees ), first the root is emitted then the subtree is
 * backward traversed, then the root is emitted again and then the previous
 * subtree in document order is visited.
 *
 * Subtree's roots are emitted twice to signal the beginning and ending of
 * element nodes. This is useful for ensuring  block boundaries are found.
 * @param walker - the TreeWalker to be traversed
 * @param finishedSubtrees - set of subtree roots already visited
 * @return next node in the backwards traversal
 */
const backwardTraverse = (walker: TreeWalker, finishedSubtrees: Set<Node>): Node | null => {
  // If current node's subtree is not already finished
  // try to go first down the subtree.
  if (!finishedSubtrees.has(walker.currentNode)) {
    const lastChild = walker.lastChild();
    if (lastChild !== null) {
      return lastChild;
    }
  }

  // If no subtree go to previous sibling if any.
  const previousSibling = walker.previousSibling();
  if (previousSibling !== null) {
    return previousSibling;
  }

  // If no sibling go back to parent and mark it as finished.
  const parent = walker.parentNode();

  if (parent !== null) {
    finishedSubtrees.add(parent);
  }

  return parent;
};

/**
 * Should not be referenced except in the /test directory.
 */
export const forTesting = {
  advanceRangeStartPastOffset,
  advanceRangeStartToNonWhitespace,
  findRangeFromNodeList,
  findTextInRange,
  getBoundaryPointAtIndex,
  isWordBounded,
  makeNewSegmenter,
  normalizeString,
  forwardTraverse,
  backwardTraverse,
  getAllTextNodes,
  acceptTextNodeIfVisibleInRange,
};

/**
 * Should only be used by other files in this directory.
 */
export const internal = {
  BLOCK_ELEMENTS,
  BOUNDARY_CHARS,
  NON_BOUNDARY_CHARS,
  acceptNodeIfVisibleInRange,
  normalizeString,
  makeNewSegmenter,
  forwardTraverse,
  backwardTraverse,
  makeTextNodeWalker,
  isNodeVisible,
};
