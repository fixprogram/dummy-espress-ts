import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { ParsedUrlQuery } from "node:querystring";
import { parse } from "node:url";
import { DEFAULT_PORT } from "./consts";
import { matchRoute } from "./utils/matchRoute";
import { parseBody } from "./utils/parseBody";

type RouteMethodType = "GET" | "POST" | "PUT" | "DELETE";
type RouteHandler = (req: ExtendedRequest, res: ServerResponse) => void | Promise<void>;

interface Route {
  method: RouteMethodType;
  path: string;
  handler: RouteHandler;
}

type Middleware = (req: ExtendedRequest, res: ServerResponse, next: (error?: any) => void) => void | Promise<void>;
type ErrorMiddleware = (err: any, req: ExtendedRequest, res: ServerResponse, next: (err?: any) => void) => void;

export interface ExtendedRequest extends IncomingMessage {
  query?: ParsedUrlQuery;
  pathname?: string;
  params?: Record<string, string>;
  body?: any;
}

const routes: Route[] = [];
const middlewares: (Middleware | ErrorMiddleware)[] = [];

async function listenServer(port: number = DEFAULT_PORT) {
  try {
    createServer(async (req: ExtendedRequest, res) => {
      const parsedUrl = parse(req.url || "", true);
      req.query = parsedUrl.query;
      req.pathname = parsedUrl.pathname || "";

      let index = 0;

      // Unified next function to process middleware and routes
      const next = async (err?: any) => {
        if (index >= middlewares.length) {
          // No more middleware, proceed to route handling or error response
          if (!err) {
            // Route handling after middlewares
            for (const route of routes) {
              const match = matchRoute(route.path, req.pathname || "");
              if (req.method === route.method && match) {
                req.params = match.params;
                return route.handler(req, res);
              }
            }

            // If no route matches, return 404
            res.statusCode = 404;
            return res.end("Page Not Found");
          } else {
            // If no error handler, respond with 500 Internal Server Error
            res.statusCode = 500;
            return res.end("Internal Server Error");
          }
        }

        const middleware = middlewares[index++];

        if (err) {
          // If an error exists, only process error-handling middlewares
          if (isErrorMiddleware(middleware)) {
            return middleware(err, req, res, next);
          } else {
            // Skip regular middleware if there's an error
            next(err);
          }
        } else {
          // Process regular middleware
          if (isRegularMiddleware(middleware)) {
            return middleware(req, res, next);
          } else {
            // Skip error-handling middleware if no error
            next();
          }
        }
      };

      next();
    }).listen(port, () => console.log(`The server is listening to http://localhost:${port}`));
  } catch (err) {
    console.error(err);
  }
}

const app = {
  get: (path: string, handler: RouteHandler) => addRoute({ method: "GET", path, handler }),
  post: (path: string, handler: RouteHandler) => addRoute({ method: "POST", path, handler }),
  use,
  listen: (port?: number) => listenServer(port),
};

function addRoute(route: Route) {
  routes.push(route);
}

function use(middleware: Middleware | ErrorMiddleware) {
  middlewares.push(middleware);
}

app.get("/", (req, res) => {
  res.end("Hello Dummy Express!");
});

app.get("/dummies/:id", (req, res) => {
  const { id } = req.params ?? {};

  res.end(`Dummy with id=${id}`);
});

app.post("/dummies", (req, res) => {
  const body = req.body;
  console.log("body: ", req.body);

  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ body }));
});

app.use(bodyParser);
app.use((err, req: ExtendedRequest, res: ServerResponse, next: (err?: any) => void) => {
  if (err) {
    res.statusCode = 400;
    res.end(`Error: ${err.message || "Invalid JSON format"}`);
  } else {
    next();
  }
});

app.listen();

async function bodyParser(req: ExtendedRequest, res: ServerResponse, next: (err?: any) => void) {
  if (["POST", "PUT"].includes(req.method || "")) {
    try {
      await parseBody(req);
      next();
    } catch (err) {
      next(err);
    }
  } else {
    next();
  }
}

function isErrorMiddleware(middleware: Middleware | ErrorMiddleware): middleware is ErrorMiddleware {
  return middleware.length === 4;
}

function isRegularMiddleware(middleware: Middleware | ErrorMiddleware): middleware is Middleware {
  return middleware.length === 3;
}
