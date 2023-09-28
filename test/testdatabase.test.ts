import { Pool, PoolConfig } from "pg";
import {
  baseTestPoolConfig,
  createTestDatabaseWithTestContainers,
} from "./testUtilities";

describe("The database", () => {
  jest.setTimeout(30000);

  let testConnectionPool: Pool;
  let testPoolConfig: PoolConfig;

  beforeAll(async () => {
    testPoolConfig = await createTestDatabaseWithTestContainers(
      baseTestPoolConfig,
      "migrations",
    );
  });

  beforeEach(() => {
    testConnectionPool = new Pool(testPoolConfig);
  });

  afterEach(async () => {
    await testConnectionPool.end();
  });

  it("spins up and responds to an SQL command", async () => {
    await testConnectionPool.query({
      text: "INSERT INTO public.test_item (id, description) VALUES ($1, $2)",
      values: ["id-1", "Description of item 1"],
    });
    const records = await testConnectionPool.query<{
      id: string;
      description: string;
    }>("SELECT * FROM public.test_item");
    expect(records.rows.length).toBe(1);
    expect(records.rows[0].description).toBe("Description of item 1");
  });
});
