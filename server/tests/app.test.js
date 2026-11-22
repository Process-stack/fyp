import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createApp } from "../app.js";

test("health endpoint reports database readiness without exposing configuration", async () => {
  const response = await request(createApp()).get("/api/health").expect(200);
  assert.deepEqual(response.body, { status: "ok", database: "disconnected" });
});

test("unknown API paths return a JSON 404", async () => {
  const response = await request(createApp()).get("/api/not-a-route").expect(404);
  assert.deepEqual(response.body, { error: "Endpoint was not found." });
});

test("comparison requires exactly two valid analysis IDs", async () => {
  const response = await request(createApp())
    .post("/api/analyses/compare")
    .send({ ids: ["invalid"] })
    .expect(400);
  assert.equal(response.body.error, "Provide exactly two valid analysis IDs.");
});

test("resume upload rejects unsupported extensions before analysis", async () => {
  const response = await request(createApp())
    .post("/api/analyses")
    .field("jobDescription", "A sufficiently long job description to validate the request.")
    .attach("resume", Buffer.from("not a supported file"), "resume.txt")
    .expect(415);
  assert.equal(response.body.error, "Only PDF and DOCX resumes are supported.");
});
