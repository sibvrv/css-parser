import {expect} from 'chai';
import {parseCSS} from './index';

describe('CSS Parser Tests', function () {

  it('CSS comments', function () {
    const result = parseCSS('\n\n.test\t\t /* .data } */ \n{/* here */margin/* here */:/* here */0/* here*/}\n');
    expect(result).to.deep.equal([{
      selector: ".test",
      rules: [{
        key: "margin", value: '0'
      }],
      comments: "/* .data } */"
    }]);
  });

  it('CSS Rules', function () {
    const result = parseCSS('.test\t\t\n{margin:0\n\n;\nborder: none\n}\n');
    expect(result).to.deep.equal([{
      selector: ".test",
      rules: [
        {key: "margin", value: '0'},
        {key: "border", value: 'none'}
      ]
    }]);
  });

  it('CSS Test semicolon in strings', function () {
    const result = parseCSS('.test\t\t\n{border:url("background:1;position:absolute"); margin:0;}\n');
    expect(result).to.deep.equal([
      {
        "selector": ".test",
        rules: [
          {
            key: "border",
            value: "url(\"background:1;position:absolute\")"
          },
          {
            key: "margin",
            value: "0"
          }
        ]
      }
    ]);
  });

  it('CSS Import', function () {
    const result = parseCSS('@import "/style/main.css" screen;\n\n@import "/style/palm.css"\thandheld,\tprint;\n\n\n .test\t\t\n{margin:0\n\n;\nborder: none\n}\n');

    expect(result).to.deep.equal([
      {
        selector: '@imports',
        type: "imports",
        styles: "@import \"/style/main.css\" screen;"
      },
      {
        selector: '@imports',
        type: "imports",
        styles: "@import \"/style/palm.css\"\thandheld,\tprint;"
      },
      {
        selector: ".test",
        rules: [
          {key: "margin", value: '0'},
          {key: "border", value: 'none'}
        ]
      }
    ]);
  });

  it('CSS KeyFrames', function () {
    const result = parseCSS(`@keyframes mymove {\n    from {top: 0px;}\n    to {top: 200px;}\n}`);
    expect(result).to.deep.equal([
      {
        selector: "@keyframes mymove",
        type: "keyframes",
        children: [
          {
            "selector": "from",
            "rules": [
              {
                "key": "top",
                "value": "0px"
              }
            ]
          },
          {
            "selector": "to",
            "rules": [
              {
                "key": "top",
                "value": "200px"
              }
            ]
          }

        ]
      }
    ]);
  });

  it('CSS comment inside a string', function () {
    const result = parseCSS(`.someSelector:after { content: '/*broken'; content: 'broken*/'; border: 0 }`);
    expect(result).to.deep.equal([
      {
        selector: ".someSelector:after",
        rules: [
          {
            key: "content",
            value: "'/*broken'"
          },
          {
            key: "content",
            value: "'broken*/'"
          },
          {
            key: "border",
            value: "0"
          }]
      }
    ]);
  });

  it('CSS brackets in content', function () {
    const result = parseCSS(`.someSelector:after { content: '} broken :) @media (screen) { lol }'; }`);
    expect(result).to.deep.equal([
      {
        "selector": ".someSelector:after",
        "rules": [
          {
            "key": "content",
            "value": "'} broken :) @media (screen) { lol }'"
          }
        ]
      }
    ]);
  });

  it('CSS Font Face', function () {
    const result = parseCSS(`@font-face {\n    font-family: "Open Sans";\n    src: url("/fonts/OpenSans-Regular-webfont.woff2") format("woff2"), \nurl("/fonts/OpenSans-Regular-webfont.woff") format("woff");\n}`);
    expect(result).to.deep.equal([{
      selector: "@font-face",
      type: "font-face",
      rules: [
        {key: "font-family", value: '"Open Sans"'},
        {key: "src", value: 'url("/fonts/OpenSans-Regular-webfont.woff2") format("woff2"), url("/fonts/OpenSans-Regular-webfont.woff") format("woff")'}
      ]
    }]);
  });

  it('CSS charset', function () {
    const result = parseCSS("@charset \"windows-1251\";\n  body {\n     font: 11pt Arial, Helvetica, sans-serif;\n    margin: 0;\n    color: #000;\n   }\n  p.new:after {\n    content: \"Demo!\";\n  }");
    expect(result).to.deep.equal([
      {
        selector: "@charset",
        type: "charset",
        styles: "@charset \"windows-1251\";"
      },
      {
        selector: "body",
        "rules": [
          {
            key: "font",
            value: "11pt Arial, Helvetica, sans-serif"
          },
          {
            key: "margin",
            value: "0"
          },
          {
            key: "color",
            value: "#000"
          }
        ]
      },
      {
        "selector": "p.new:after",
        "rules": [
          {
            key: "content",
            value: "\"Demo!\""
          }
        ]
      }
    ]);
  });

  it('CSS Supports', function () {
    const result = parseCSS(`@supports (display: flex) {\n  @media screen and (min-width: 900px) {\n    article {\n      display: flex;\n    }\n  }\n}`);
    expect(result).to.deep.equal([
      {
        "selector": "@supports (display: flex)",
        "type": "supports",
        "children": [
          {
            "selector": "@media screen and (min-width: 900px)",
            "type": "media",
            "children": [
              {
                "selector": "article",
                "rules": [
                  {
                    "key": "display",
                    "value": "flex"
                  }
                ]
              }
            ]
          }
        ]
      }
    ]);
  });

  it('CSS Media Query', function () {
    const result = parseCSS(`/* On screens that are 992px or less, set the background color to blue */\n@media screen and (max-width: 992px) {\n  body {\n    background-color: blue;\n  }\n}\n\n/* On screens that are 600px or less, set the background color to olive */\n@media screen and (max-width: 600px) {\n  body {\n    background-color: olive;\n  }\n}\n`);
    expect(result).to.deep.equal([
      {
        comments: "/* On screens that are 992px or less, set the background color to blue */",
        type: "media",
        selector: "@media screen and (max-width: 992px)",
        children: [
          {
            selector: "body",
            rules: [
              {
                key: "background-color",
                value: "blue"
              }
            ]
          }
        ]
      },
      {
        comments: "/* On screens that are 600px or less, set the background color to olive */",
        type: "media",
        selector: "@media screen and (max-width: 600px)",
        children: [
          {
            selector: "body",
            rules: [
              {
                key: "background-color",
                value: "olive"
              }
            ]
          }
        ]
      }
    ]);

  });

});
