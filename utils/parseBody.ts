import { ExtendedRequest } from "..";

export async function parseBody(req: ExtendedRequest): Promise<void> {
  let data: string = "";
  for await (const chunk of req) {
    data += chunk;
  }
  req.body = JSON.parse(data);
}
