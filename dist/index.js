"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var regexStringsAddComments = /(?:"(?:\\[\s\S]|[^"])*"|'(?:\\[\s\S]|[^'])*')|(\/\*([\s\S]*?)\*\/)/gi;
var regexCodeBlock = /{[^{}"']*}/gi;
var regexComments = /\0c\d+\0/g;
var regexImport = /@import .*?;/gi;
var regexCharset = /@charset .*?;/gi;
/**
 * Parse Rules
 * @param in_rules
 * @returns {CSS.Rule[]}
 * @param replace
 */
function parseRules(in_rules, replace) {
    var result = [];
    var rules = in_rules.split(';').map(function (rule) { return rule.trim(); }).filter(function (rule) { return rule; });
    for (var i = 0; i < rules.length; i++) {
        var line = rules[i];
        if (line.indexOf(':') >= 0) {
            var data = line.split(':');
            var key = data[0].trim();
            var value = replace(data.slice(1).join(':').replace(/\n/g, ' ')).trim();
            if (key && value) {
                result.push({ key: key, value: value });
            }
        }
        else {
            result.push({ key: '', value: replace(line), defective: true });
        }
    }
    return result;
}
/**
 * Executes a search for a match in a specified string
 * @param pattern
 * @param source
 * @param callback
 */
function regexEach(pattern, source, callback) {
    for (var match = void 0, loc = new RegExp(pattern); (match = loc.exec(source)) !== null;) {
        callback(match);
    }
}
/**
 * Parse CSS by mask
 * @param name
 * @param source
 * @param pattern
 * @param nodes
 * @returns {string}
 * @param replace
 */
function parseNode(name, source, pattern, nodes, replace) {
    for (var match = void 0; (match = pattern.exec(source)) !== null;) {
        nodes.push({ selector: "@" + name, type: name, styles: replace(match[0]) });
    }
    return source.replace(pattern, '');
}
/**
 * Parse CSS
 * @param source
 * @returns {CSS.Object[]}
 */
function parseCSS(source) {
    var code = [];
    var pushCode = function (text) { return "\0" + (text[0] === '{' ? 'b' : text[0] === '/' ? 'c' : '') + (code.push(text) - 1) + "\0"; };
    var popCode = function (text) { return text.replace(/\0.?\d+\0/gi, function (v) { return (v = v.slice(1, -1), v[0] === 'b' || v[0] === 'c') ? code[+v.substr(1)] : code[+v]; }); };
    var popCodeRecursive = function (text) {
        for (var index = -1; (index = text.indexOf('\0', index)) >= 0;) {
            text = popCode(text);
        }
        return text;
    };
    source = source
        .replace(/\r\n/g, '\n')
        .replace(regexStringsAddComments, pushCode)
        .split('\n').map(function (rule) { return rule.trim(); }).filter(function (rule) { return rule; }).join('\n');
    while (source.search(regexCodeBlock) >= 0) {
        source = source.replace(regexCodeBlock, pushCode);
    }
    var parseCode = function (source) {
        var result = [];
        source = parseNode('charset', source, regexCharset, result, popCode);
        source = parseNode('imports', source, regexImport, result, popCode);
        regexEach(/([\s\S]*?)\0b(\d+)\0/gi, source, function (match) {
            var full = match[0], selector = match[1], blockId = match[2];
            var comments = regexComments.exec(selector);
            selector = selector.replace(regexComments, '').trim();
            var node = { selector: selector };
            result.push(node);
            if (comments !== null) {
                node.comments = popCodeRecursive(comments[0]);
            }
            regexEach(/@([a-z_\-][a-z\d_\-]*)/g, selector, function (match) {
                node.type = match[1];
            });
            var codeData = code[+blockId].slice(1, -1).replace(regexComments, '');
            if (node.type && ['media', 'supports', 'keyframes', 'page'].indexOf(node.type) >= 0) {
                node.children = parseCode(codeData);
            }
            else {
                node.rules = parseRules(codeData, popCodeRecursive);
            }
        });
        return result;
    };
    return parseCode(source);
}
exports.parseCSS = parseCSS;
