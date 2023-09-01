import tokenUtils from './tokens';

var WORD_BOUNDARY_CHARS = '\t\r\n\u00A0 !\"#$%&()*+,\-.\\/:;<=>?@\[\\\]^_`{|}~';
var WORD_BOUNDARY_REGEX = new RegExp('[' + WORD_BOUNDARY_CHARS + ']');
var SPLIT_REGEX = new RegExp(
'([^' + WORD_BOUNDARY_CHARS + ']+)');

function Tokenizer(opts) {
    if (!(this instanceof Tokenizer)) return new Tokenizer(opts);

    this.opts = Object.assign({
        cacheGet: function(key) { return null; },
        cacheSet: function(key, value) { }
    }, opts);
}

Tokenizer.prototype.split = function tokenizeSplit(fn, opts = {}) {
    var that = this;
    opts = Object.assign({ preserveProperties: true, cache: () => null }, opts);

    return function(text, tok) {
        if (arguments.length === 6) return fn.apply(null, arguments);

        var prev;
        var cacheId, cacheValue;

        if(text === undefined) return [];

        if (typeof text === "string") {
            text = [{
                value: text,
                index: 0,
                offset: text.length
            }];
        } else if (!Array.isArray(text)) {
            text = [text];
        }

        cacheId = tokenUtils.tokensId(text, opts.cache());
        if (cacheId) {
            cacheValue = that.opts.cacheGet(cacheId);
            if (cacheValue) {
                return cacheValue;
            }
        }

        var result = text.map(function(token, i) {
            var next = text[i + 1];
            var tokens = fn(
                token.value,
                Object.assign({}, token),
                prev ? Object.assign({}, prev) : null,
                next ? Object.assign({}, next) : null,
                i,
                text
            ) || [];

            tokens = tokenUtils.normalize(token, tokens);

            if (opts.preserveProperties) {
                var props = tokenUtils.properties(token);
                tokens = tokens.map(function(_tok) {
                    return Object.assign({}, _tok, props);
                });
            }

            prev = token;

            return tokens;
        }).filter(Boolean).flat();

        if (cacheId) {
            that.opts.cacheSet(cacheId, result);
        }

        return result;
    };
};

// Tokenize a text using a RegExp
Tokenizer.prototype.re = function tokenizeRe(re, opts = {}) {
    opts = Object.assign({ split: false }, opts);

    return this.split(function(text, tok) {
        var originalText = text;
        var tokens = [];
        var match;
        var start = 0;
        var lastIndex = 0;

        while (match = re.exec(text)) {
            // Index in the current text section
            var index = match.index;

            // Index in the original text
            var absoluteIndex = start + index;

            var value = match[0] || "";
            var offset = value.length;

            // If splitting, push missed text
            if (opts.split && start < absoluteIndex) {
                var beforeText = originalText.slice(start, absoluteIndex);
                tokens.push({
                    value: beforeText,
                    index: start,
                    offset: beforeText.length
                });
            }

            tokens.push({
                value: value,
                index: absoluteIndex,
                offset: offset,
                match: match
            });

            text = text.slice(index + offset);
            start = absoluteIndex + offset;
        }

        // If splitting, push left text
        if (opts.split && text) {
            tokens.push({
                value: text,
                index: start,
                offset: text.length
            });
        }

        return tokens;
    }, {
        cache: function() {
            return re.toString();
        }
    });
};

// Split and merge tokens
Tokenizer.prototype.splitAndMerge = function tokenizeSplitAndMerge(fn, opts = {}) {
    var that = this;
    opts = Object.assign({ mergeWith: '' }, opts);

    return function(tokens) {
        var result = [];
        var accu = [];

        function pushAccu() {
            if (accu.length == 0) return;

            // Merge accumulator into one token
            var tok = tokenUtils.merge(accu, opts.mergeWith);

            result.push(tok);
            accu = [];
        }

        that.split(function(word, token) {
            var toks = fn.apply(null, arguments);

            // Normalize tokens
            toks = tokenUtils.normalize(token, toks);

            // Accumulate tokens and push to final results
            toks.forEach(function(tok) {
                if (tok === null) {
                    pushAccu();
                } else {
                    accu.push(tok);
                }
            });
        })(tokens);

        // Push tokens left in accumulator
        pushAccu();

        return result;
    };
};

// Filter when tokenising
Tokenizer.prototype.filter = function tokenizeFilter(fn) {
    return this.split(function(text, tok) {
        if (fn.apply(null, arguments)) {
            return {
                value: tok.value,
                index: 0,
                offset: tok.offset
            };
        }
        return undefined;
    });
};

// Extend a token properties
Tokenizer.prototype.extend = function tokenizeExtend(fn) {
    return this.split(function(text, tok) {
        var o = typeof fn === 'function' ? fn.apply(null, arguments) : fn;
        return Object.assign({
            value: tok.value,
            index: 0,
            offset: tok.offset
        }, o);
    });
};

// Condition for tokenizing flow
Tokenizer.prototype.ifthen = function(condition, then) {
    return this.split(function(text, tok) {
        if (condition.apply(null, arguments)) {
            return then.apply(null, arguments);
        }
        const {index, ...rest} = tok; // Omit 'index'
        return rest;
    });
};

// Filter by testing a regex
Tokenizer.prototype.test = function tokenizeTest(re) {
    return this.filter(function(text, tok) {
        return re.test(text);
    }, {
        cache: re.toString()
    });
};

// Process token by all arguments
Tokenizer.prototype.flow = function tokenizeFlow(...args) {
    const fn = args.reduce((acc, cur) => (...args) => cur(acc(...args)));
    return this.split(fn);
};

// Group and process a token as a group
Tokenizer.prototype.serie = function tokenizeFlow(...args) {
    return args.reduce((acc, cur) => (...args) => cur(acc(...args)));
};

// Merge all tokens into one
Tokenizer.prototype.merge = function() {
    return this.splitAndMerge(token => [token]);
};

Tokenizer.prototype.sections = function() {
    return this.re(/([^\n\.,;!?]+)/i, { split: false });
};

Tokenizer.prototype.words = function() {
    return this.re(SPLIT_REGEX);
};

Tokenizer.prototype.characters = function() {
    return this.re(/[^\s]/);
};

export default Tokenizer;

