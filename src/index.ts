import { createRequest, sendResponse } from "@remix-run/node-fetch-server";
import type { Connect, Plugin } from "vite";

type PromiseOr<T> = T | Promise<T>;
export type HandlerContext = {
	next: () => never;
};
export type Handler = (
	request: Request,
	context: HandlerContext,
) => PromiseOr<Response>;
/**
 * HandlerObject allows customization of the handler behavior.
 */
export type HandlerObject = {
	fetch: Handler;
	/**
	 * If true, the handler will call next() if the response status is 404.
	 * This allows other handlers to process the request.
	 * @default false
	 */
	nextIf404?: boolean;
};
const nextSymbol = Symbol("next");
const handlerContext: HandlerContext = {
	next: () => {
		throw nextSymbol;
	}
}

export function devApi(...handlers: (Handler | HandlerObject)[]): Plugin {
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

function createMiddleware(
	handler: Handler | HandlerObject,
): Connect.NextHandleFunction {
	const handlerFn = "fetch" in handler ? handler.fetch : handler;
	const nextIf404 = "nextIf404" in handler ? handler.nextIf404 : false;
	return async (req, res, next) => {
		const request = createRequest(req, res);
		let response: Response | undefined;
		try {
			response = await handlerFn(request, handlerContext);
		} catch (error) {
			if (error === nextSymbol) return next();
		}
		if (response?.status === 404 && nextIf404) return next();
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
