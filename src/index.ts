declare global {
  namespace CSS {
    /**
     * CSS Object Interface
     */
    interface Object {
      selector: string;
      type?: string;
      children?: CSS.Object[];
      comments?: string;
      styles?: string;
      rules?: any;
    }

    /**
     * CSS Rule Interface
     */
    interface Rule {
      key: string;
      value: string;
      defective?: boolean;
    }
  }
}

const regexStringsAddComments = /(?:"(?:\\[\s\S]|[^"])*"|'(?:\\[\s\S]|[^'])*')|(\/\*([\s\S]*?)\*\/)/gi;
const regexCodeBlock = /{[^{}"']*}/gi;
const regexComments = /\0c\d+\0/g;
const regexImport = /@import .*?;/gi;
const regexCharset = /@charset .*?;/gi;

/**
 * Parse Rules
 * @param in_rules
 * @returns {CSS.Rule[]}
 * @param replace
 */
function parseRules(in_rules: string, replace: (text: string) => string) {
  let result: CSS.Rule[] = [];

  const rules = in_rules.split(';').map(rule => rule.trim()).filter(rule => rule);

  for (let i = 0; i < rules.length; i++) {
    let line = rules[i];

    if (line.indexOf(':') >= 0) {
      const data = line.split(':');
      const key = data[0].trim();
      const value = replace(data.slice(1).join(':').replace(/\n/g, ' ')).trim();

      if (key && value) {
        result.push({key, value});
      }
    } else {
      result.push({key: '', value: replace(line), defective: true});
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
function regexEach(pattern: RegExp, source: string, callback: (match: RegExpExecArray) => void) {
  for (let match, loc = new RegExp(pattern); (match = loc.exec(source)) !== null;) {
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
function parseNode(name: string, source: string, pattern: RegExp, nodes: CSS.Object[], replace: (text: string) => string): string {
  for (let match; (match = pattern.exec(source)) !== null;) {
    nodes.push({selector: `@${name}`, type: name, styles: replace(match[0])});
  }
  return source.replace(pattern, '');
}

/**
 * Parse CSS
 * @param source
 * @returns {CSS.Object[]}
 */
export function parseCSS(source: string): CSS.Object[] {
  let code: string[] = [];

  const pushCode = (text: string): string => `\0${text[0] === '{' ? 'b' : text[0] === '/' ? 'c' : ''}${code.push(text) - 1}\0`;
  const popCode = (text: string): string => text.replace(/\0.?\d+\0/gi, v => (v = v.slice(1, -1), v[0] === 'b' || v[0] === 'c') ? code[+v.substr(1)] : code[+v]);
  const popCodeRecursive = (text: string): string => {
    for (let index = -1; (index = text.indexOf('\0', index)) >= 0;) {
      text = popCode(text);
    }
    return text;
  };

  source = source
    .replace(/\r\n/g, '\n')
    .replace(regexStringsAddComments, pushCode)
    .split('\n').map(rule => rule.trim()).filter(rule => rule).join('\n');

  while (source.search(regexCodeBlock) >= 0) {
    source = source.replace(regexCodeBlock, pushCode);
  }

  const parseCode = (source: string) => {
    const result: CSS.Object[] = [];

    source = parseNode('charset', source, regexCharset, result, popCode);
    source = parseNode('imports', source, regexImport, result, popCode);

    regexEach(/([\s\S]*?)\0b(\d+)\0/gi, source, (match) => {
      let [full, selector, blockId] = match;
      const comments = regexComments.exec(selector);
      selector = selector.replace(regexComments, '').trim();

      let node: CSS.Object = {selector};
      result.push(node);
      if (comments !== null) {
        node.comments = popCodeRecursive(comments[0]);
      }

      regexEach(/@([a-z_\-][a-z\d_\-]*)/g, selector, (match) => {
        node.type = match[1];
      });

      const codeData = code[+blockId].slice(1, -1).replace(regexComments, '');
      if (node.type && ['media', 'supports', 'keyframes', 'page'].indexOf(node.type) >= 0) {
        node.children = parseCode(codeData);
      } else {
        node.rules = parseRules(codeData, popCodeRecursive);
      }
    });
    return result;
  };
  return parseCode(source);
}

