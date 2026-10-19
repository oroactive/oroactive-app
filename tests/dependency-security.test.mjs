import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import proxyaddr from "proxy-addr";
import mammoth from "mammoth";
import qs from "qs";

test("IPv4-mapped IPv6 short trust prefixes cannot trust an arbitrary client IP", () => {
  const request = { connection: { remoteAddress: "203.0.113.8" }, headers: { "x-forwarded-for": "198.51.100.99" } };
  const trust = proxyaddr.compile("::ffff:10.0.0.0/8");
  assert.equal(proxyaddr(request, trust), "203.0.113.8");
});

test("updated document dependencies still extract an actual DOCX paragraph", async () => {
  const buffer = Buffer.from("UEsDBBQAAAAIALJxU13mdcR+0gAAAIsBAAATAAAAW0NvbnRlbnRfVHlwZXNdLnhtbH2QvVLDMAzHX8XnlasVGBh6SToAKzD0BXSOkvjw11luad++Sls6cIVR+n/8ZLebQ/BqT4Vdip1+NI3e9O32mImVKJE7Pdea1wBsZwrIJmWKooypBKwylgky2i+cCJ6a5hlsipViXdWlQ/ftK42481W9HWR9oRTyrNXLxbiwOo05e2exig77OPyirK4EI8mzh2eX+UEMGu4SFuVvwDX3Ic8ubiD1iaW+YxAXfKcywJDsLkjS/F9z5840js7SLb+05ZIsMbs4BW9uSkAXf+6H83f3J1BLAwQUAAAACACycVNdXzOVUpUAAAAHAQAACwAAAF9yZWxzLy5yZWxzjc87DsIwDAbgq0Q+QJ0yMKCmXVi6Ii4QJW5T0TzkhNftycBAEQOjf//6LHfDw6/iRpyXGBS0jYSh70606lKD7JaURW2ErMCVkg6I2TjyOjcxUaibKbLXpY48Y9LmomfCnZR75E8DtqYYrQIebQvi/Ez0jx2naTF0jObqKZQfJ74aVdY8U1Fwj2zRvuOmsoB9h5sX+xdQSwMEFAAAAAgAsnFTXXRTJViMAAAAwQAAABEAAAB3b3JkL2RvY3VtZW50LnhtbEWOQQ7CIBBFr0I4AIMuXDSUxhN4BqTYkhSGDFj09kKNcfMmk5f589X0ChvbHWWPceQnIfmkVR1mtM/gYmFNxzzUka+lpAEg29UFkwUmF5t7IAVT2koLVKQ5EVqXs49L2OAs5QWC8ZH3yDvO7z5TB3UUfSO82uJ3x9rhbtjvLQoF3XfSwXTwmwH/fvoDUEsBAhQDFAAAAAgAsnFTXeZ1xH7SAAAAiwEAABMAAAAAAAAAAAAAAIABAAAAAFtDb250ZW50X1R5cGVzXS54bWxQSwECFAMUAAAACACycVNdXzOVUpUAAAAHAQAACwAAAAAAAAAAAAAAgAEDAQAAX3JlbHMvLnJlbHNQSwECFAMUAAAACACycVNddFMlWIwAAADBAAAAEQAAAAAAAAAAAAAAgAHBAQAAd29yZC9kb2N1bWVudC54bWxQSwUGAAAAAAMAAwC5AAAAfAIAAAAA", "base64");
  const result = await mammoth.extractRawText({ buffer });
  assert.equal(result.value.trim(), "OroActive prova documento.");
});

test("Mammoth CLI keeps its v1 argument API through the compatible argparse override", () => {
  const cli = fileURLToPath(new URL("../node_modules/mammoth/bin/mammoth", import.meta.url));
  const result = spawnSync(process.execPath, [cli, "--help"], { encoding: "utf8", timeout: 5000, maxBuffer: 262144 });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /docx-path/);
});

test("query parser preserves normal parameters and rejects prototype pollution", () => {
  const result = qs.parse("safe=ok&__proto__[polluted]=1&constructor[prototype][polluted]=1");
  assert.equal(result.safe, "ok");
  assert.equal({}.polluted, undefined);
  assert.equal(Object.hasOwn(result, "constructor"), false);
});
