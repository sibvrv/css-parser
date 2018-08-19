CSS Parser 
===============================

A lightweight CSS parser in JavaScript / TypeScript.

The returned structure
```js
[
  {
    selector: string;
    type?: string;
    children?: [...];
    comments?: string;
    styles?: string;
    rules?: [
      {
        key: string;
        value: string;
        defective?: boolean;
      }, ...
    ]
  }, ...
]
```

## Quick Start

Install the **css-parser** from the **github** repo.
```shell
npm install sibvrv/css-parser
```

## Development

### Build

```shell
npm run build
```

### How to test
```shell
npm run test
```