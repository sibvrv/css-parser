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
/**
 * Parse CSS
 * @param source
 * @returns {CSS.Object[]}
 */
export declare function parseCSS(source: string): CSS.Object[];
