import { DROPPED, droppedMask, removeDropped } from "../src/emptyPairs.ts";

const removed = (plain: string, lang?: string) =>
  droppedMask(plain.replaceAll("␀", DROPPED), lang).flatMap((isRemoved, i) => (isRemoved ? [i] : []));

test("droppedMask removes the pair a dropped object leaves empty, not a mark next to it", () => {
  expect(removed("(␀)(")).toEqual([0, 1, 2]);
  expect(removed("(␀))")).toEqual([0, 1, 2]);
  expect(removed("((␀)")).toEqual([1, 2, 3]);
});

test("droppedMask removes nested pairs and keeps the first space of a run", () => {
  expect(removed("a ([␀]) b")).toEqual([2, 3, 4, 5, 6, 7]);
  expect(removeDropped(`a ([${DROPPED}]) b`, undefined)).toBe("a b");
});

test("droppedMask keeps no space before binding punctuation", () => {
  expect(removed("a (␀).")).toEqual([1, 2, 3, 4]);
});

test("droppedMask removes straight quotes", () => {
  expect(removed('The word "␀" here.')).toEqual([9, 10, 11, 12]);
});

test("droppedMask removes the quotes of the text's language", () => {
  expect(removed("Das Wort „␀“ hier", "de")).toEqual([9, 10, 11, 12]);
  expect(removed("Das Wort „␀“ hier", "en")).toEqual([10]);
  expect(removed("Le mot « ␀ » ici.", "fr")).toEqual([7, 8, 9, 10, 11, 12]);
  expect(removed("Ordet ”␀” här.", "sv")).toEqual([6, 7, 8, 9]);
  expect(removed("前“␀”后", "zh")).toEqual([1, 2, 3]);
});
