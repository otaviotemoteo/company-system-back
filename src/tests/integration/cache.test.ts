import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { buildApp } from "../../app";
import { FastifyInstance } from "fastify";
import { TestHelpers } from "../helpers/test-helpers";
import { getCache, invalidatePattern } from "../../config/redis";

describe("Redis Cache — comportamento visual", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  beforeEach(async () => {
    await TestHelpers.clearDatabase();
    await invalidatePattern("projects:*");
    await invalidatePattern("dashboard:*");
  });

  afterAll(async () => {
    await TestHelpers.clearDatabase();
    await app.close();
  });

  it("deve mostrar queda de tempo nos cache hits e dado atualizado após invalidação", async () => {
    // ── Setup ──────────────────────────────────────────────────────────────
    const admin = await TestHelpers.createUser({ role: "ADMIN" });
    const gerente = await TestHelpers.createUser({ role: "GERENTE" });
    const adminToken = TestHelpers.generateToken(app, admin);
    const gerenteToken = TestHelpers.generateToken(app, gerente);

    const project = await TestHelpers.createProject(gerente.id, {
      title: "Projeto Original",
      description: "Descrição original",
    });

    const cacheKey = `projects:detail:${project.id}`;

    console.log("\n══════════════════════════════════════════════");
    console.log("  REDIS CACHE BEHAVIOR TEST");
    console.log("══════════════════════════════════════════════");
    console.log(`\nProjeto criado: { id: "${project.id.slice(0, 8)}...", title: "${project.title}" }\n`);

    // ── [1] CACHE MISS ─────────────────────────────────────────────────────
    const t1Start = performance.now();
    const res1 = await app.inject({
      method: "GET",
      url: `/api/projects/${project.id}`,
      headers: { authorization: `Bearer ${gerenteToken}` },
    });
    const t1 = performance.now() - t1Start;

    expect(res1.statusCode).toBe(200);
    const data1 = JSON.parse(res1.body);

    const cachedAfterFirst = await getCache(cacheKey);

    console.log(`[1] GET /api/projects/:id — CACHE MISS`);
    console.log(`    Tempo : ${t1.toFixed(2)}ms`);
    console.log(`    Dados : { title: "${data1.title}", status: "${data1.status}" }`);
    console.log(`    Redis : ${cachedAfterFirst ? "✅ chave gravada" : "❌ não gravada"}\n`);

    // ── [2] CACHE HIT ──────────────────────────────────────────────────────
    const t2Start = performance.now();
    const res2 = await app.inject({
      method: "GET",
      url: `/api/projects/${project.id}`,
      headers: { authorization: `Bearer ${gerenteToken}` },
    });
    const t2 = performance.now() - t2Start;

    expect(res2.statusCode).toBe(200);
    const data2 = JSON.parse(res2.body);
    const speedup2 = t1 > 0 ? ((1 - t2 / t1) * 100).toFixed(0) : "N/A";

    console.log(`[2] GET /api/projects/:id — CACHE HIT`);
    console.log(`    Tempo : ${t2.toFixed(2)}ms  (${speedup2}% mais rápido)`);
    console.log(`    Dados : { title: "${data2.title}", status: "${data2.status}" }\n`);

    // ── [3] CACHE HIT (de novo) ────────────────────────────────────────────
    const t3Start = performance.now();
    const res3 = await app.inject({
      method: "GET",
      url: `/api/projects/${project.id}`,
      headers: { authorization: `Bearer ${gerenteToken}` },
    });
    const t3 = performance.now() - t3Start;

    expect(res3.statusCode).toBe(200);
    const data3 = JSON.parse(res3.body);
    const speedup3 = t1 > 0 ? ((1 - t3 / t1) * 100).toFixed(0) : "N/A";

    console.log(`[3] GET /api/projects/:id — CACHE HIT (de novo)`);
    console.log(`    Tempo : ${t3.toFixed(2)}ms  (${speedup3}% mais rápido)`);
    console.log(`    Dados : { title: "${data3.title}", status: "${data3.status}" }\n`);

    // ── [4] WRITE — invalida cache ─────────────────────────────────────────
    const updateRes = await app.inject({
      method: "PUT",
      url: `/api/projects/${project.id}`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        title: "Projeto ATUALIZADO",
        description: "Descrição nova após update",
      },
    });

    expect(updateRes.statusCode).toBe(200);

    const cachedAfterWrite = await getCache(cacheKey);

    console.log(`[4] PUT /api/projects/:id — UPDATE (invalida cache)`);
    console.log(`    Status: ${updateRes.statusCode}`);
    console.log(`    Redis : ${cachedAfterWrite ? "⚠️  ainda em cache (erro!)" : "✅ cache invalidado"}\n`);

    // ── [5] CACHE MISS — dado novo ─────────────────────────────────────────
    const t4Start = performance.now();
    const res4 = await app.inject({
      method: "GET",
      url: `/api/projects/${project.id}`,
      headers: { authorization: `Bearer ${gerenteToken}` },
    });
    const t4 = performance.now() - t4Start;

    expect(res4.statusCode).toBe(200);
    const data4 = JSON.parse(res4.body);

    console.log(`[5] GET /api/projects/:id — CACHE MISS (após invalidação)`);
    console.log(`    Tempo : ${t4.toFixed(2)}ms`);
    console.log(`    Dados : { title: "${data4.title}", status: "${data4.status}" }`);
    console.log(`\n    Título mudou: "${data1.title}" → "${data4.title}"`);
    console.log("\n✅ Cache funcionando corretamente!\n");
    console.log("══════════════════════════════════════════════\n");

    // ── Assertions ─────────────────────────────────────────────────────────
    expect(cachedAfterFirst).not.toBeNull();         // chave foi gravada no Redis
    expect(t2).toBeLessThan(t1);                     // hit < miss
    expect(t3).toBeLessThan(t1);                     // hit < miss
    expect(cachedAfterWrite).toBeNull();             // cache foi invalidado após PUT
    expect(data1.title).toBe("Projeto Original");
    expect(data4.title).toBe("Projeto ATUALIZADO");
  });
});
