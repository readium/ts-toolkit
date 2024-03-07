This is a copy of https://github.com/textlint-rule/rousseau/tree/master/packages/tokenize-english
which is also available as the npm package `@textlint-rule/tokenize-english`.

It has been included here because a slight modification needs to be made since
the code does not run in JavaScript's strict mode due to a poor global variable declaration.
It has also been modified to remove the lodash dependency so it doesn't have to be
included directly in our dependencies.