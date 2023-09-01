/*
Token is an object like:

{
    "value": "text content",

    // Position of the index
    "index": 0,

    // Length of the token
    "offset": "text content".length
}
*/

// Return a string ID to represent a list of tokens
function tokensId(tokens, prepend) {
    if (!prepend) return null;

    return tokens.reduce(function(prev, token) {
        var tokId = [
            token.index,
            token.offset,
            token.value
        ].join('-');

        return [prev, tokId].join(':');
    }, prepend);
}

// Return properties for a token
function tokenProperties(tok) {
    const { index, offset, value, ...rest } = tok;
    return rest;
}

// Normalize and resolve a list of tokens relative to a token
function normalizeTokens(relative, tokens) {
    var _index = 0;

    // Force as an array
    if (!Array.isArray(tokens)) tokens = [tokens];

    return tokens.map(function(subtoken) {
        if (subtoken === null) return null;
        if (typeof subtoken === 'string') {
            subtoken = {
                value: subtoken,
                index: _index,
                offset: subtoken.length
            };
        }

        if (typeof subtoken === 'object') {
            subtoken.index = subtoken.index || 0;
            _index = _index + subtoken.index + subtoken.offset;

            // Transform as an absolute token
            subtoken.index = relative.index + subtoken.index;
            subtoken.offset = subtoken.offset || subtoken.value.length;
        }

        return subtoken;
    });
}

// Merge tokens
function mergeTokens(tokens, mergeWith) {
    if (tokens.length == 0) return null;

    var value = '';
    var offset = 0;

    var firstIndex = tokens[0]?.index;

    tokens.forEach(function(token, i) {
        var prev = tokens[i - 1];
        var next = tokens[i + 1];

        var toFill = prev ? (token.index + 1 - (prev.index + prev.offset)): 0;
        value = value + new Array(toFill).join(mergeWith) + token.value;

        var absoluteOffset = (token.index - firstIndex) + token.offset;
        if (absoluteOffset > offset) offset = absoluteOffset;
    });

    return {
        // Index equal is the one from the first token
        index: firstIndex,

        value: value,
        offset: Math.max(offset, value.length)
    }
}

export default {
    tokensId: tokensId,
    normalize: normalizeTokens,
    properties: tokenProperties,
    merge: mergeTokens
};
