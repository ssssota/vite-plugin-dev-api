# vite-plugin-dev-api

A Vite plugin that provides a development API for mocking API, developing tools, and more.

## Usage

```sh
npm install vite-plugin-dev-api --save-dev
```

Then, add the plugin to your Vite configuration:

```typescript
import { defineConfig } from 'vite';
import { devApi } from 'vite-plugin-dev-api';

export default defineConfig({
  plugins: [
    devApi(async (request: Request, ctx: { next: () => never }) => {
      if (request.url === '/api/data') {
        return new Response(JSON.stringify({ message: 'Hello, world!' }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
      return ctx.next(); // Proceed to the next handler if not matched
    });
  ],
});
```

You can configure handler behavior:

```typescript
import { defineConfig } from 'vite';
import { devApi } from 'vite-plugin-dev-api';

export default defineConfig({
  plugins: [
    devApi({
      fetch: async (request, ctx) => {
        if (request.url === '/api/data') {
          return new Response(JSON.stringify({ message: 'Hello, world!' }), {
            headers: { 'Content-Type': 'application/json' }
          });
        }
        return new Response('Not Found', { status: 404 });
      },
      nextIf404: true, // Call next() if the response status is 404
    });
  ],
});
```

And you can use [Hono](https://hono.dev/) for the handler:

```typescript
import { Hono } from 'hono';
import { defineConfig } from 'vite';
import { devApi } from 'vite-plugin-dev-api';

const hono = new Hono();
hono.get('/api/data', (c) => {
  return c.json({ message: 'Hello, world!' });
});

export default defineConfig({
  plugins: [
    devApi(hono),
    // or
    devApi({ fetch: hono.fetch, nextIf404: true }),
  ],
});
```

## License

MIT
