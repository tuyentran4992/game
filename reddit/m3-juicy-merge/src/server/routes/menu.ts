import { Hono } from 'hono';
import { reddit } from '@devvit/web/server';

const menu = new Hono();

menu.post('/post-create', async (c) => {
  try {
    const currentSubreddit = await reddit.getCurrentSubreddit();
    const post = await currentSubreddit.submitCustomPost({
      title: '🍉 Juicy Merge — Drop • Merge • Grow!',
    });
    return c.json({
      navigateTo: post.url,
      showToast: {
        text: '🍉 Juicy Merge game post created successfully!',
        appearance: 'success',
      },
    });
  } catch (err) {
    console.error('Error creating post from menu:', err);
    return c.json({
      showToast: {
        text: `Failed to create game post: ${String(err)}`,
      },
    });
  }
});

export { menu };
