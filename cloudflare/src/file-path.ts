// Pages end with a slash; only a path with a file extension can be a file on the CDN.
// The build applies the same rule (src/lib/own-origin-files.ts), so it never points
// a link at the site that the Worker would not look up.
export const FILE_PATH = /\/[^/]+\.[a-z0-9]{1,8}$/i;
