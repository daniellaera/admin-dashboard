# npm audit — committed state (origin/main @ ccfe293), lockfile-only scan, 2026-10-26

## backend

| scope | total | critical | high | moderate | low |
|---|---|---|---|---|---|
| all deps | 42 | 4 | 22 | 8 | 8 |
| prod deps only | 24 | 3 | 12 | 4 | 5 |

### Critical and high advisories (direct dependencies marked)

| severity | package | vulnerable range | direct? | advisories |
|---|---|---|---|---|
| high | axios | 1.0.0 - 1.19.0 | transitive | Axios Cross-Site Request Forgery Vulnerability; Axios has Unrestricted Cloud Metadata Exfiltration via Header Injection Chain; Axios has a NO_PROXY Hostname Nor |
| high | body-parser | <=1.20.8 || 2.0.0-beta.1 - 2.0.2 | transitive | body-parser vulnerable to Denial of Service via trailing bytes after a compressed request body; body-parser vulnerable to denial of service when invalid limit v |
| high | brace-expansion | <=1.1.20 | transitive | brace-expansion Regular Expression Denial of Service vulnerability; brace-expansion: DoS via exponential-time expansion of consecutive non-expanding {} groups;  |
| high | braces | <3.0.3 | transitive | Uncontrolled resource consumption in braces |
| high | browserslist | <=4.28.6 | transitive | Browserslist: Unbounded memory growth (no cache eviction) via distinct query results, leading to eventual OOM; Browserslist: Uncaught crash / prototype write vi |
| high | cross-spawn | 7.0.0 - 7.0.4 | transitive | Regular Expression Denial of Service (ReDoS) in cross-spawn |
| high | engine.io | 0.7.8 - 0.7.9 || 1.8.0 - 6.6.6 | transitive | Socket.IO: Engine.IO Polling Transport Connection Exhaustion; engine.io Uncaught Exception vulnerability; via cookie; via ws |
| high | express | <=4.22.2 || 5.0.0-alpha.1 - 5.0.1 | **direct** | Express.js Open Redirect in malformed URLs; express vulnerable to XSS via response.redirect(); via body-parser; via cookie; via path-to-regexp; via qs; via send |
| high | flatted | <=3.4.1 | transitive | Prototype Pollution via parse() in NodeJS flatted; flatted vulnerable to unbounded recursion DoS in parse() revive phase |
| high | js-yaml | <=3.15.1 || 4.0.0 - 4.3.1 | transitive | JS-YAML: Quadratic CPU consumption in !!omap resolution (3.x and 4.x) — CVE-2026-59870 fix not backported; JS-YAML: Quadratic-complexity DoS in merge key handli |
| high | jws | <3.2.3 | transitive | auth0/node-jws Improperly Verifies HMAC Signature |
| high | lodash | <=4.17.23 | transitive | Lodash has Prototype Pollution Vulnerability in `_.unset` and `_.omit` functions; lodash vulnerable to Code Injection via `_.template` imports key names; lodash |
| high | minimatch | <=3.1.3 | transitive | minimatch ReDoS: nested *() extglobs generate catastrophically backtracking regular expressions; minimatch has ReDoS: matchOne() combinatorial backtracking via  |
| high | nodemon | 2.0.19 - 2.0.22 | **direct** | via simple-update-notifier |
| high | path-to-regexp | <=0.1.12 | transitive | path-to-regexp contains a ReDoS; path-to-regexp outputs backtracking regular expressions; path-to-regexp vulnerable to Regular Expression Denial of Service via  |
| high | picomatch | <=2.3.1 | transitive | Picomatch has a ReDoS vulnerability via extglob quantifiers; Picomatch: Method Injection in POSIX Character Classes causes incorrect Glob Matching |
| high | semver | 2.0.0-alpha - 5.7.1 || 6.0.0 - 6.3.0 || 7.0.0 - 7.5.1 | transitive | semver vulnerable to Regular Expression Denial of Service |
| high | simple-update-notifier | 1.0.7 - 1.1.0 | transitive | via semver |
| high | socket.io-adapter | 2.5.2 - 2.5.4 | transitive | via ws |
| high | socket.io-parser | 4.0.0 - 4.2.6 | transitive | Insufficient validation when decoding a Socket.IO packet; Socket.IO: Zero-attachment Memory Exhaustion; socket.io allows an unbounded number of binary attachmen |
| high | validator | <=13.15.20 | transitive | Validator is Vulnerable to Incomplete Filtering of One or More Instances of Special Elements; validator.js has a URL validation bypass vulnerability in its isUR |
| high | ws | 8.0.0 - 8.20.1 | transitive | ws affected by a DoS when handling a request with many HTTP headers; ws: Memory exhaustion DoS from tiny fragments and data chunks; ws: Uninitialized memory dis |
| critical | @babel/traverse | <7.23.2 | transitive | Babel vulnerable to arbitrary code execution when compiling specifically crafted malicious code |
| critical | form-data | 4.0.0 - 4.0.5 | transitive | form-data uses unsafe random function in form-data for choosing boundary; form-data: CRLF injection in form-data via unescaped multipart field names and filenam |
| critical | handlebars | 3.0.0 - 4.7.9 | transitive | Handlebars.js has Denial of Service via Malformed Decorator Syntax in Template Compilation; Handlebars.js has JavaScript Injection in CLI Precompiler via Unesca |
| critical | proxy-addr | 1.1.0 - 2.0.7 | transitive | proxy-addr vulnerable to IP spoofing via IPv4-mapped IPv6 trust subnet |

## frontend

| scope | total | critical | high | moderate | low |
|---|---|---|---|---|---|
| all deps | 84 | 6 | 42 | 21 | 15 |
| prod deps only | 84 | 6 | 42 | 21 | 15 |

### Critical and high advisories (direct dependencies marked)

| severity | package | vulnerable range | direct? | advisories |
|---|---|---|---|---|
| high | @babel/plugin-transform-modules-systemjs | 7.12.0 - 7.29.0 | transitive | @babel/plugin-transform-modules-systemjs generates arbitrary code when compiling malicious input |
| high | @novu/notification-center | 0.10.0-alpha.0 - 0.18.0 | **direct** | via socket.io-client |
| high | @remix-run/router | <=1.23.2 | transitive | React Router vulnerable to XSS via Open Redirects; React Router's same-origin redirect with path starting // causes open redirect via protocol-relative URL rein |
| high | @svgr/plugin-svgo | <=5.5.0 | transitive | via svgo |
| high | @svgr/webpack | 4.0.0 - 5.5.0 | transitive | via @svgr/plugin-svgo |
| high | axios | 1.0.0 - 1.19.0 | **direct** | Axios Cross-Site Request Forgery Vulnerability; Axios has Unrestricted Cloud Metadata Exfiltration via Header Injection Chain; Axios has a NO_PROXY Hostname Nor |
| high | body-parser | <=1.20.8 || 2.0.0-beta.1 - 2.0.2 | transitive | body-parser vulnerable to Denial of Service via trailing bytes after a compressed request body; body-parser vulnerable to denial of service when invalid limit v |
| high | brace-expansion | <=1.1.20 || 2.0.0 - 2.1.6 | transitive | brace-expansion Regular Expression Denial of Service vulnerability; brace-expansion: DoS via exponential-time expansion of consecutive non-expanding {} groups;  |
| high | braces | <3.0.3 | transitive | Uncontrolled resource consumption in braces |
| high | browserslist | <=4.28.6 | transitive | Browserslist: Unbounded memory growth (no cache eviction) via distinct query results, leading to eventual OOM; Browserslist: Uncaught crash / prototype write vi |
| high | compression | <=1.8.1 | transitive | compression vulnerable to Denial of Service via memory leak on premature response close; via on-headers |
| high | cross-spawn | 7.0.0 - 7.0.4 | transitive | Regular Expression Denial of Service (ReDoS) in cross-spawn |
| high | css-select | <=3.1.0 | transitive | via nth-check |
| high | engine.io-client | 0.7.0 || 0.7.8 - 0.7.9 || 6.0.0 - 6.5.3 | transitive | via ws |
| high | express | <=4.22.2 || 5.0.0-alpha.1 - 5.0.1 | transitive | Express.js Open Redirect in malformed URLs; express vulnerable to XSS via response.redirect(); via body-parser; via cookie; via path-to-regexp; via qs; via send |
| high | flatted | <=3.4.1 | transitive | Prototype Pollution via parse() in NodeJS flatted; flatted vulnerable to unbounded recursion DoS in parse() revive phase |
| high | http-proxy-middleware | <=2.0.10-beta.0 | transitive | Denial of service in http-proxy-middleware; http-proxy-middleware `router` host+path substring matching allows Host-header-driven backend routing bypass; http-p |
| high | js-yaml | <=3.15.1 || 4.0.0 - 4.3.1 | transitive | JS-YAML: Quadratic CPU consumption in !!omap resolution (3.x and 4.x) — CVE-2026-59870 fix not backported; JS-YAML: Quadratic-complexity DoS in merge key handli |
| high | lodash | <=4.17.23 | transitive | Lodash has Prototype Pollution Vulnerability in `_.unset` and `_.omit` functions; lodash vulnerable to Code Injection via `_.template` imports key names; lodash |
| high | minimatch | <=3.1.3 || 5.0.0 - 5.1.7 | transitive | minimatch ReDoS: nested *() extglobs generate catastrophically backtracking regular expressions; minimatch has ReDoS: matchOne() combinatorial backtracking via  |
| high | nanoid | <=3.3.17 | transitive | Predictable results in nanoid generation when given non-integer values; nanoid: Integer Overflow or Wraparound; nanoid: custom generators can loop indefinitely  |
| high | node-forge | * | transitive | Forge has Denial of Service via Infinite Loop in BigInteger.modInverse() with Zero Input; Forge has a basicConstraints bypass in its certificate chain verificat |
| high | nth-check | <2.0.1 | transitive | Inefficient Regular Expression Complexity in nth-check |
| high | path-to-regexp | <=0.1.12 | transitive | path-to-regexp contains a ReDoS; path-to-regexp outputs backtracking regular expressions; path-to-regexp vulnerable to Regular Expression Denial of Service via  |
| high | picomatch | <=2.3.1 | transitive | Picomatch has a ReDoS vulnerability via extglob quantifiers; Picomatch: Method Injection in POSIX Character Classes causes incorrect Glob Matching |
| high | postcss | <=8.5.22 | transitive | PostCSS has XSS via Unescaped </style> in its CSS Stringify Output; PostCSS line return parsing error; PostCSS: Arbitrary file read and information disclosure v |
| high | react-router | 6.0.0 - 7.17.0 | transitive | React Router has unexpected external redirect via untrusted paths; React Router's same-origin redirect with path starting // causes open redirect via protocol-r |
| high | react-router-dom | 6.0.0-alpha.0 - 6.30.2 | **direct** | via @remix-run/router; via react-router |
| high | react-scripts | >=0.1.0 | **direct** | via @svgr/webpack; via css-minimizer-webpack-plugin; via jest; via resolve-url-loader; via webpack-dev-server; via workbox-webpack-plugin |
| high | rollup | <=2.79.2 | transitive | DOM Clobbering Gadget found in rollup bundled scripts that leads to XSS; Rollup 4 has Arbitrary File Write via Path Traversal |
| high | rollup-plugin-terser | 3.0.0 || >=4.0.4 | transitive | via serialize-javascript |
| high | semver | 6.0.0 - 6.3.0 || 7.0.0 - 7.5.1 | transitive | semver vulnerable to Regular Expression Denial of Service |
| high | serialize-javascript | <=7.1.2 | transitive | Cross-site Scripting (XSS) in serialize-javascript; Serialize JavaScript has CPU Exhaustion Denial of Service via crafted array-like objects; Serialize JavaScri |
| high | socket.io-client | 4.3.0 - 4.6.2 | **direct** | via engine.io-client |
| high | socket.io-parser | 4.0.0 - 4.2.6 | transitive | Insufficient validation when decoding a Socket.IO packet; Socket.IO: Zero-attachment Memory Exhaustion; socket.io allows an unbounded number of binary attachmen |
| high | source-map-js | 1.0.0 - 1.2.1 | transitive | source-map-js allows event-loop denial of service through indexed source-map section offsets |
| high | svgo | 1.0.0 - 2.8.3 | transitive | SVGO DoS through entity expansion in DOCTYPE (Billion Laughs); SVGO removeScripts plugin leaves some executable scripts intact; SVGO: removeScripts allows execu |
| high | validator | <=13.15.20 | transitive | Validator is Vulnerable to Incomplete Filtering of One or More Instances of Special Elements; validator.js has a URL validation bypass vulnerability in its isUR |
| high | webpack-dev-middleware | <=7.4.4 | transitive | Path traversal in webpack-dev-middleware; webpack-dev-middleware vulnerable to Path Traversal via non-slash-terminated publicPath |
| high | workbox-build | 5.0.0-alpha.0 - 7.0.0 | transitive | via rollup-plugin-terser |
| high | workbox-webpack-plugin | 5.0.0-alpha.0 - 7.0.0 | transitive | via workbox-build |
| high | ws | 7.0.0 - 7.5.10 || 8.0.0 - 8.20.1 | transitive | ws affected by a DoS when handling a request with many HTTP headers; ws: Memory exhaustion DoS from tiny fragments and data chunks; ws: Uninitialized memory dis |
| critical | @babel/traverse | <7.23.2 | transitive | Babel vulnerable to arbitrary code execution when compiling specifically crafted malicious code |
| critical | form-data | 3.0.0 - 3.0.4 || 4.0.0 - 4.0.5 | transitive | form-data uses unsafe random function in form-data for choosing boundary; form-data: CRLF injection in form-data via unescaped multipart field names and filenam |
| critical | proxy-addr | 1.1.0 - 2.0.7 | transitive | proxy-addr vulnerable to IP spoofing via IPv4-mapped IPv6 trust subnet |
| critical | shell-quote | <=1.8.4 | transitive | shell-quote quote() does not escape newlines in object .op values; shell-quote: Quadratic-complexity Denial of Service in `parse()` (CWE-407) |
| critical | webpack | 5.0.0-alpha.0 - 5.104.0 | transitive | Cross-realm object access in Webpack 5; Webpack's AutoPublicPathRuntimeModule has a DOM Clobbering Gadget that leads to XSS; webpack buildHttp HttpUriPlugin all |
| critical | websocket-driver | <=0.7.4 | transitive | websocket-driver: Message corruption via abuse of protocol length headers; websocket-driver: Resource limit bypass via message compression |

