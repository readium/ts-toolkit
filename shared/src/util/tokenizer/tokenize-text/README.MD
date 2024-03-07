This is a copy of https://github.com/textlint-rule/rousseau/tree/master/packages/tokenize-text
which is also available as the npm package `@textlint-rule/tokenize-text`.

It has been modified to remove the lodash dependency so it doesn't have to be
included directly in our dependencies, since it becomes incredibly large with
lodash, especially since the entire lodash lib was imported.