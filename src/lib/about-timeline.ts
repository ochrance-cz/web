import { renderMarkdown } from './markdown';

/** History page body uses level-two headings for years, followed by rich text. */
export async function renderAboutTimeline(body: string) {
  const headings = [...body.matchAll(/^##[ \t]+(.+?)[ \t]*$/gm)];
  return Promise.all(headings.map(async (heading, index) => {
    const start = (heading.index ?? 0) + heading[0].length;
    const end = headings[index + 1]?.index ?? body.length;
    return {
      time: heading[1],
      descHtml: await renderMarkdown(body.slice(start, end).trim()),
    };
  }));
}
