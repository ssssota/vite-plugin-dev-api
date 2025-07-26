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
    devApi(async (request: Request, next: () => never) => {
      if (request.url === '/api/data') {
        return new Response(JSON.stringify({ message: 'Hello, world!' }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
      return next(); // Proceed to the next handler if not matched
    });
  ],
});
```

## License

MIT
