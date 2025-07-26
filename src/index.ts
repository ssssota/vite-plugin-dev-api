import { createRequest, sendResponse } from "@remix-run/node-fetch-server";
import type { Connect, Plugin } from "vite";

type PromiseOr<T> = T | Promise<T>;
type Handler = (request: Request, next: () => never) => PromiseOr<Response>;
const nextSymbol = Symbol("next");
const throwToNext = () => {
	throw nextSymbol;
};

export function devApi(...handlers: Handler[]): Plugin {
	return {
		name: "dev-api",
		configureServer(server) {
			const middlewares = handlers.map(createMiddleware);
			for (const middleware of middlewares) {
				server.middlewares.use(middleware);
			}
		},
	};
}

function createMiddleware(handler: Handler): Connect.NextHandleFunction {
	return async (req, res, next) => {
		const request = createRequest(req, res);
		let response: Response | undefined;
		try {
			response = await handler(request, throwToNext);
		} catch (error) {
			if (error === nextSymbol) return next();
		}
		return await sendResponse(res, response ?? internalServerError());
	};
}

function internalServerError(): Response {
	return new Response("Internal Server Error", {
		status: 500,
		statusText: "Internal Server Error",
		headers: { "Content-Type": "text/plain" },
	});
}
