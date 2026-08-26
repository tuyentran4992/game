import { Hono } from 'hono';

const menu = new Hono();

menu.post('/post-create', async (c) => {
  const { createPost } = await import('@devvit/web/client');
  await createPost({ title: 'Juicy Merge', text: 'Drop fruits and merge them!' });
  return c.json({ success: true });
});

export { menu };