import type { APIRoute, GetStaticPaths } from 'astro';
import { getNav } from '../../../lib/qig';
import { pageMarkdown } from '../../../lib/ai';

/** Every guidelines page as plain Markdown, for agents and for "Copy Page". */
export const getStaticPaths = (async () => {
  const nav = await getNav();
  return nav.flatMap((section) => section.pages.map((page) => ({ params: { slug: page.id }, props: { page, section } })));
}) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props }) =>
  new Response(pageMarkdown(props.page, props.section), {
    headers: { 'content-type': 'text/markdown; charset=utf-8' },
  });
