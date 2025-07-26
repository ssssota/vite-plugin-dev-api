import type { Plugin } from "vite";
import { createServer } from "vite";
import { expect, it } from "vitest";
import { devApi } from "./index.js";

async function startViteServer(plugins: Plugin[]): Promise<AsyncDisposable> {
	const server = await createServer({
		plugins,
		server: { port: 3000, strictPort: true },
	});
	await server.listen();

	return {
		[Symbol.asyncDispose]: async () => {
			await server.close();
		},
	};
}

it("should handle requests and responses", async () => {
	const plugin = devApi(async (request, next) => {
		if (request.url.endsWith("/test")) {
			return new Response("Test response", { status: 200 });
		}
		return next();
	});
	await using _ = await startViteServer([plugin]);

	const response = await fetch("http://localhost:3000/test");
	expect(response.status).toBe(200);
	expect(await response.text()).toBe("Test response");

	// Test for next handler
	const nextResponse = await fetch("http://localhost:3000/not-found");
	expect(nextResponse.status).toBe(404);
});

it("should handle multiple handlers", async () => {
	const plugin = devApi(
		async (request, next) => {
			if (request.url.endsWith("/first")) {
				return new Response("First handler response", { status: 200 });
			}
			return next();
		},
		async (request, next) => {
			if (request.url.endsWith("/second")) {
				return new Response("Second handler response", { status: 200 });
			}
			return next();
		},
	);

	await using _ = await startViteServer([plugin]);

	const firstResponse = await fetch("http://localhost:3000/first");
	expect(firstResponse.status).toBe(200);
	expect(await firstResponse.text()).toBe("First handler response");

	const secondResponse = await fetch("http://localhost:3000/second");
	expect(secondResponse.status).toBe(200);
	expect(await secondResponse.text()).toBe("Second handler response");
});

it("should handle multiple plugins", async () => {
  const plugin1 = devApi(async (request, next) => {
    if (request.url.endsWith("/plugin1")) {
      return new Response("Plugin 1 response", { status: 200 });
    }
    return next();
  });

  const plugin2 = devApi(async (request, next) => {
    if (request.url.endsWith("/plugin2")) {
      return new Response("Plugin 2 response", { status: 200 });
    }
    return next();
  });

  await using _ = await startViteServer([plugin1, plugin2]);

  const response1 = await fetch("http://localhost:3000/plugin1");
  expect(response1.status).toBe(200);
  expect(await response1.text()).toBe("Plugin 1 response");

  const response2 = await fetch("http://localhost:3000/plugin2");
  expect(response2.status).toBe(200);
  expect(await response2.text()).toBe("Plugin 2 response");
});

it("should handle errors in handlers", async () => {
  const plugin = devApi(async (request, next) => {
    if (request.url.endsWith("/error")) {
      throw new Error("Test error");
    }
    return next();
  });

  await using _ = await startViteServer([plugin]);

  const response = await fetch("http://localhost:3000/error");
  expect(response.status).toBe(500);
  expect(await response.text()).toBe("Internal Server Error");
});
