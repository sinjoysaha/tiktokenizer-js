let textArea = document.getElementById('message');
let output = document.getElementById('output');
let tokenIds = document.getElementById('tokenIds');
let tokenCount = document.getElementById('tokenCount');
// let tokenPrice = document.getElementById('tokenPrice');

let cache = {}, NUM_COLORS = 25, colArr = [];
let textEncoder = new TextEncoder();
let textDecoder = new TextDecoder();
let encoder = null, bpe_ranks = {}, decoder = {};

async function onLoadGetData() {
    try {
        const response = await fetch("./data/encoder.json");
        if (!response.ok) {
            throw new Error
                (`HTTP error! Status: ${response.status}`);
        }
        encoder = await response.json();
        for (let key in encoder) {
            decoder[encoder[key]] = key;
        }
        NUM_COLORS = encoder.length;
        for (var i = 1; i < NUM_COLORS; i++) colArr.push(random_rgba());
        console.log("numcol", NUM_COLORS);
    }
    catch (error) {
        console.error("Unable to fetch data:", error);
    }

    try {
        const response = await fetch("./data/vocab.bpe");
        if (!response.ok) {
            throw new Error
                (`HTTP error! Status: ${response.status}`);
        }
        const data = await response.text();
        var v = data.split('\n');
        for (var i = 1; i < v.length - 1; i++) {
            bpe_ranks[v[i]] = i - 1;
        }
    }
    catch (error) {
        console.error("Unable to fetch data:", error);
    }
}


const regexp = /'s|'t|'re|'ve|'m|'ll|'d| ?\p{L}+| ?\p{N}+| ?[^\s\p{L}\p{N}]+|\s+(?!\S)|\s+/gu;

textArea.addEventListener('input', updateValue)

function random_rgba() {
    var o = Math.round, r = Math.random, s = 255;
    return 'rgba(' + o(r() * s) + ',' + o(r() * s) + ',' + o(r() * s) + ',' + (r() / 1.5).toFixed(1) + ')';
}

async function fetchData(file) {
    return fetch(file)
        .then((res) => {
            if (!res.ok) {
                throw new Error
                    (`HTTP error! Status: ${res.status}`);
            }
            return res;
        })
        .then((data) =>
            console.log(data))
        .catch((error) =>
            console.error("Unable to fetch data:", error));
}

function updateValue(e) {
    if (e)
        rawStr = e.target.value;
    else
        rawStr = "";
    // console.log(rawStr);

    const arr = [...rawStr.matchAll(regexp)];
    ids = [];
    for (var i = 0; i < arr.length; i++) {
        strToTokenize = arr[i][0];
        // console.log(strToTokenize);
        ids.push(...encode(strToTokenize));
    }
    // console.log(ids);

    // colorize
    const [colStr, colIds] = colorize(ids);
    output.innerHTML = colStr;
    tokenIds.innerHTML = colIds;
    tokenCount.innerHTML = ids.length;
    // tokenPrice.innerHTML = "$" + (ids.length * 0.00001).toFixed(4);
}

function encode(strToTokenize) {
    var enc = textEncoder.encode(strToTokenize);
    var byteEnc = "";
    for (var i = 0; i < enc.length; i++) {
        byteEnc += byteEncoder[enc[i]];
    }
    // console.log(enc);
    // console.log("byteEnc", byteEnc);
    bpe_tokens = bpe(byteEnc);
    // console.log("bpe_tokens", bpe_tokens);
    bpe_tokens = bpe_tokens.split(" ");
    // console.log("bpe_tokens", bpe_tokens);
    bpe_tokens = bpe_tokens.map((x) => encoder[x]);
    // console.log("bpe_tokens", bpe_tokens);

    return bpe_tokens // [strToTokenize.length, 0, 0, 0, 0];
}

function colorize(ids) {
    var colStr = "", colIds = "";
    console.log("ids", ids);
    var i = 0, b = 1; 
    var td = new TextDecoder();
    var bufferArr = new Array();
    var b = 0;
    colcnt = 0;
    
    while (i < ids.length) {
        if (b==0)
            color = colArr[colcnt++ % NUM_COLORS];
        colIds += `<span style="background-color: ${color}">${ids[i]}</span>` + ", ";
        var byteDecArr = Array.from(decoder[ids[i]]).map((x) => byteDecoder[x]);
        // console.log("byteDecArr", byteDecArr);
        var j = 0;
        while (j < byteDecArr.length) {
            if ((byteDecArr[j] >> 6) == 2 && (b>0)) {
                // continue adding to buffer
                // console.log("continue appending char b:", b);
                // console.log("read byte: ", byteDecArr[j])
                b -= 1;
                // console.log(b, "more bytes to read")
            }
            else if (byteDecArr[j] <= 127) {//>> 6 == 1) {
                if (b==0) {
                    // console.log("single ascii char");
                    // b = 0;
                }
                else {
                    console.log("should not be here - byteDecArr[j]:", byteDecArr[j]);
                }
            }
            else {
                if (byteDecArr[j] >> 3 == 30) {
                    // console.log("4 bytes to read");
                    // console.log("read byte: ", byteDecArr[j]);
                    b = 3;
                }
                else if (byteDecArr[j] >> 4 == 14) {
                    // console.log("3 bytes to read");
                    // console.log("read byte: ", byteDecArr[j])
                    b = 2;
                }
                else if (byteDecArr[j] >> 5 == 6) {
                    // console.log("2 bytes to read");
                    // console.log("read byte: ", byteDecArr[j])
                    b = 1;
                }
                else {
                    console.log("Unknown start of unicode : ", byteDecArr[j]);
                }
            }
            bufferArr.push(byteDecArr[j]);
            if (b==0) {
                // no more bytes to read
                // console.log("bufferArr", bufferArr);
                var byteDecodedStr = td.decode(Uint8Array.from(bufferArr));
                bufferArr = new Array();
                // console.log("byteDecodedStr", byteDecodedStr)
                colStr += `<span style="background-color: ${color}">${byteDecodedStr}</span>`;
            }
            j++;
        }
        // color = colArr[ids[i] % NUM_COLORS];
        // colIds += `<span style="background-color: ${color}">${ids[i]}</span>` + (i==ids.length-1?"":", ");
        // byteDecodedStr = Array.from(decoder[ids[i]]).map((x) => String.fromCharCode(byteDecoder[x])).join("");
        // colStr += `<span style="background-color: ${color}">${ids[i]}</span>` + (i==ids.length-1?"":", "); //`<span style="background-color: ${color}">${byteDecodedStr}</span>`;
        // console.log("decode", decoder[ids[i]]);
        // console.log("b dec", byteDecoder[decoder[ids[i]]]);
        // console.log("arr dec", Array.from(decoder[ids[i]]).map(textEncoder.encode()));
        // console.log("arr map b dec", Array.from(decoder[ids[i]]).map((x) => byteDecoder[x]));
        // console.log("outside inner while b : ", b);
        i++;
    }
    colIds = colIds.substring(0, colIds.length-2);
    // console.log(colStr);
    // console.log(colIds);

    return [colStr, colIds];
}

function ord(a) { return a.charCodeAt(); }

function bytesToUnicode() {
    // console.log(ord('!'), ord('~'), ord('¡'), ord('¬'), ord('®'), ord('ÿ'));
    var byteEncoder = {};
    var n = 0;
    for (var i = 0; i < Math.pow(2, 8); i++) {
        if ((i >= ord('!') && i <= ord('~')) || (i >= ord('¡') && i <= ord('¬')) || (i >= ord('®') && i <= ord('ÿ'))) {
            byteEncoder[i] = String.fromCharCode(i);
        }
        else {
            byteEncoder[i] = String.fromCharCode(Math.pow(2, 8) + n);
            n += 1;
        }
    }
    // console.log(byteEncoder);
    byteDecoder = unicodeToByte(byteEncoder);
    return byteEncoder;
}

function unicodeToByte(byteEncoder) {
    var byteDecoder = {};
    for (let key in byteEncoder) {
        byteDecoder[byteEncoder[key]] = key;
    }
    // console.log(byteDecoder);
    return byteDecoder;
}

function getPairs(word) {
    var pairs = new Set();
    for (var i = 0; i < word.length - 1; i++)
        pairs.add(word[i] + " " + word[i + 1]);
    return [...pairs];
}

function bpe(token) {
    if (token in cache)
        return cache[token];
    var word = Array.from(token);
    // console.log("word", word);

    var pairs = getPairs(word);
    // console.log("pairs", pairs);

    if (pairs.length == 0) {
        // console.log("no pairs, returning token");
        return token;
    }
    while (true) {
        // console.log(bpe_ranks);
        var bigram = pairs.reduce((acc, x) => (acc in bpe_ranks ? bpe_ranks[acc] : Infinity) < (x in bpe_ranks ? bpe_ranks[x] : Infinity) ? acc : x );
        // console.log("bigram", bigram);
        if (!(bigram in bpe_ranks))
            break;

        [first, second] = bigram.split(" ");
        // console.log(first, "-f s-", second);
        new_word = [];
        i = 0;
        while (i < word.length) {
            if ((word[i]==first) && (i < word.length-1) && (word[i+1]==second)) {
                new_word.push(first+second);
                i += 2;
            }
            else {
                new_word.push(word[i]);
                i += 1;
            }
        }
        word = [...new_word];
        if (word.length==1)
            break;
        else
            pairs = getPairs(word);
    }
    word = word.join(" ");
    // cache
    return word;
}

onLoadGetData().then(() => {
    console.log("encoder", encoder);
    console.log("decoder", decoder);
    console.log("bpe_ranks", bpe_ranks);
});

updateValue();
let byteDecoder = {};
let byteEncoder = bytesToUnicode();
console.log("byte Dec", byteDecoder);
// getPairs([12,2,54,4,13,68,4,23,16,54,2]);