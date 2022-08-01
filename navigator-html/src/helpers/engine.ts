export const ENGINE_MAP = {
    EdgeHTML: 'EdgeHTML',
    Blink: 'Blink',
    Trident: 'Trident',
    Presto: 'Presto',
    Gecko: 'Gecko',
    WebKit: 'WebKit',
};

class Utils {
    /**
     * Get first matched item for a string
     * @param {RegExp} regexp
     * @param {String} ua
     * @return {Array|{index: number, input: string}|*|boolean|string}
     */
    static getFirstMatch(regexp, ua) {
        const match = ua.match(regexp);
        return (match && match.length > 0 && match[1]) || '';
    }

    /**
     * Get version precisions count
     *
     * @example
     *   getVersionPrecision("1.10.3") // 3
     *
     * @param  {string} version
     * @return {number}
     */
    static getVersionPrecision(version) {
        return version.split('.').length;
    }

    /**
     * Calculate browser version weight
     *
     * @example
     *   compareVersions('1.10.2.1',  '1.8.2.1.90')    // 1
     *   compareVersions('1.010.2.1', '1.09.2.1.90');  // 1
     *   compareVersions('1.10.2.1',  '1.10.2.1');     // 0
     *   compareVersions('1.10.2.1',  '1.0800.2');     // -1
     *   compareVersions('1.10.2.1',  '1.10',  true);  // 0
     *
     * @param {String} versionA versions versions to compare
     * @param {String} versionB versions versions to compare
     * @param {boolean} [isLoose] enable loose comparison
     * @return {Number} comparison result: -1 when versionA is lower,
     * 1 when versionA is bigger, 0 when both equal
     */
    /* eslint consistent-return: 1 */
    static compareVersions(versionA, versionB, isLoose = false) {
        // 1) get common precision for both versions, for example for "10.0" and "9" it should be 2
        const versionAPrecision = Utils.getVersionPrecision(versionA);
        const versionBPrecision = Utils.getVersionPrecision(versionB);

        let precision = Math.max(versionAPrecision, versionBPrecision);
        let lastPrecision = 0;

        const chunks = Utils.map([versionA, versionB], (version) => {
            const delta = precision - Utils.getVersionPrecision(version);

            // 2) "9" -> "9.0" (for precision = 2)
            const _version = version + new Array(delta + 1).join('.0');

            // 3) "9.0" -> ["000000000"", "000000009"]
            return Utils.map(_version.split('.'), chunk => new Array(20 - chunk.length).join('0') + chunk).reverse();
        });

        // adjust precision for loose comparison
        if (isLoose) {
            lastPrecision = precision - Math.min(versionAPrecision, versionBPrecision);
        }

        // iterate in reverse order by reversed chunks array
        precision -= 1;
        while (precision >= lastPrecision) {
            // 4) compare: "000000009" > "000000010" = false (but "9" > "10" = true)
            if (chunks[0][precision] > chunks[1][precision]) {
                return 1;
            }

            if (chunks[0][precision] === chunks[1][precision]) {
                if (precision === lastPrecision) {
                    // all version chunks are same
                    return 0;
                }

                precision -= 1;
            } else if (chunks[0][precision] < chunks[1][precision]) {
                return -1;
            }
        }

        return undefined;
    }

    /**
     * Array::map polyfill
     *
     * @param  {Array} arr
     * @param  {Function} iterator
     * @return {Array}
     */
    static map(arr, iterator) {
        const result = [];
        let i;
        if (Array.prototype.map) {
            return Array.prototype.map.call(arr, iterator);
        }
        for (i = 0; i < arr.length; i += 1) {
            result.push(iterator(arr[i]));
        }
        return result;
    }

    /**
     * Array::find polyfill
     *
     * @param  {Array} arr
     * @param  {Function} predicate
     * @return {Array}
     */
    static find(arr, predicate) {
        let i;
        let l;
        if (Array.prototype.find) {
            return Array.prototype.find.call(arr, predicate);
        }
        for (i = 0, l = arr.length; i < l; i += 1) {
            const value = arr[i];
            if (predicate(value, i)) {
                return value;
            }
        }
        return undefined;
    }

    /**
     * Object::assign polyfill
     *
     * @param  {Object} obj
     * @param  {Object} ...objs
     * @return {Object}
     */
    static assign(obj, ...assigners) {
        const result = obj;
        let i;
        let l;
        if (Object.assign) {
            return Object.assign(obj, ...assigners);
        }
        for (i = 0, l = assigners.length; i < l; i += 1) {
            const assigner = assigners[i];
            if (typeof assigner === 'object' && assigner !== null) {
                const keys = Object.keys(assigner);
                keys.forEach((key) => {
                    result[key] = assigner[key];
                });
            }
        }
        return obj;
    }
}

/*
* More specific goes first
*/
export default [
    /* EdgeHTML */
    {
        test(parser) {
            return parser.getBrowserName(true) === 'microsoft edge';
        },
        describe(ua) {
            const isBlinkBased = /\sedg\//i.test(ua);

            // return blink if it's blink-based one
            if (isBlinkBased) {
                return {
                    name: ENGINE_MAP.Blink,
                };
            }

            // otherwise match the version and return EdgeHTML
            const version = Utils.getFirstMatch(/edge\/(\d+(\.?_?\d+)+)/i, ua);

            return {
                name: ENGINE_MAP.EdgeHTML,
                version,
            };
        },
    },

    /* Trident */
    {
        test: [/trident/i],
        describe(ua) {
            const engine = {
                name: ENGINE_MAP.Trident,
                version: undefined
            };

            const version = Utils.getFirstMatch(/trident\/(\d+(\.?_?\d+)+)/i, ua);

            if (version) {
                engine.version = version;
            }

            return engine;
        },
    },

    /* Presto */
    {
        test(parser) {
            return parser.test(/presto/i);
        },
        describe(ua) {
            const engine = {
                name: ENGINE_MAP.Presto,
                version: undefined
            };

            const version = Utils.getFirstMatch(/presto\/(\d+(\.?_?\d+)+)/i, ua);

            if (version) {
                engine.version = version;
            }

            return engine;
        },
    },

    /* Gecko */
    {
        test(parser) {
            const isGecko = parser.test(/gecko/i);
            const likeGecko = parser.test(/like gecko/i);
            return isGecko && !likeGecko;
        },
        describe(ua) {
            const engine = {
                name: ENGINE_MAP.Gecko,
                version: undefined
            };

            const version = Utils.getFirstMatch(/gecko\/(\d+(\.?_?\d+)+)/i, ua);

            if (version) {
                engine.version = version;
            }

            return engine;
        },
    },

    /* Blink */
    {
        test: [/(apple)?webkit\/537\.36/i],
        describe() {
            return {
                name: ENGINE_MAP.Blink,
                version: undefined
            };
        },
    },

    /* WebKit */
    {
        test: [/(apple)?webkit/i],
        describe(ua) {
            const engine = {
                name: ENGINE_MAP.WebKit,
                version: undefined
            };

            const version = Utils.getFirstMatch(/webkit\/(\d+(\.?_?\d+)+)/i, ua);

            if (version) {
                engine.version = version;
            }

            return engine;
        },
    },
];