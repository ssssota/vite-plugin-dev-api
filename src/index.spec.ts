import { Hono } from "hono";
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
	const plugin = devApi(async (request, ctx) => {
		if (request.url.endsWith("/test")) {
			return new Response("Test response", { status: 200 });
		}
		return ctx.next();
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
		async (request, ctx) => {
			if (request.url.endsWith("/first")) {
				return new Response("First handler response", { status: 200 });
			}
			return ctx.next();
		},
		async (request, ctx) => {
			if (request.url.endsWith("/second")) {
				return new Response("Second handler response", { status: 200 });
			}
			return ctx.next();
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
	const plugin1 = devApi(async (request, ctx) => {
		if (request.url.endsWith("/plugin1")) {
			return new Response("Plugin 1 response", { status: 200 });
		}
		return ctx.next();
	});

	const plugin2 = devApi(async (request, ctx) => {
		if (request.url.endsWith("/plugin2")) {
			return new Response("Plugin 2 response", { status: 200 });
		}
		return ctx.next();
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
	const plugin = devApi(async (request, ctx) => {
		if (request.url.endsWith("/error")) {
			throw new Error("Test error");
		}
		return ctx.next();
	});

	await using _ = await startViteServer([plugin]);

	const response = await fetch("http://localhost:3000/error");
	expect(response.status).toBe(500);
	expect(await response.text()).toBe("Internal Server Error");
});

it("should handle nextIf404 option", async () => {
	const plugin = devApi(
		{
			fetch: async () => {
				return new Response("First fetch", { status: 404 });
			},
			nextIf404: true,
		},
		{
			fetch: (request, ctx) => {
				if (request.url.endsWith("/next-if-404")) {
					return new Response("Second fetch", { status: 404 });
				}
				return ctx.next();
			},
		},
		{
			fetch: () => {
				return new Response("Third fetch", { status: 200 });
			},
		},
	);

	await using _ = await startViteServer([plugin]);

	const res404 = await fetch("http://localhost:3000/next-if-404");
	expect(res404.status).toBe(404);
	expect(await res404.text()).toBe("Second fetch");

	const res200 = await fetch("http://localhost:3000/fallback");
	expect(res200.status).toBe(200);
	expect(await res200.text()).toBe("Third fetch");
});

it("should handle with Hono", async () => {
	const app = new Hono();
	app.get("/hono", (c) => c.text("Hono response"));

	const plugin = devApi(app);

	await using _ = await startViteServer([plugin]);

	const response = await fetch("http://localhost:3000/hono");
	expect(response.status).toBe(200);
	expect(await response.text()).toBe("Hono response");
});
