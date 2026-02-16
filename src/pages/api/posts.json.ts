import { getCollection } from 'astro:content';

export async function GET() {
  const posts = (await getCollection('blog')).sort(
    (a, b) => b.data.date.valueOf() - a.data.date.valueOf()
  );

  const data = posts.map(p => ({
    slug: p.id.replace(/\.mdx?$/, ''),
    title: p.data.title,
    date: p.data.date.toISOString(),
    description: p.data.description,
    tags: p.data.tags || [],
    featured: p.data.featured || false,
    image: p.data.image || null,
  }));

  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
  });
}
