function endsWithChar(word, c) {
    if (c.length > 1) {
        return c.indexOf(word.slice(-1)) > -1;
    }

    return word.slice(-1) === c;
}

function endsWith(word, end) {
    return word.slice(word.length - end.length) === end;
}

export default {
    endsWith: endsWith,
    endsWithChar: endsWithChar
};
