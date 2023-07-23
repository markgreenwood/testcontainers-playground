import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from "testcontainers";
import { Pool } from "pg";

describe("The database", () => {
  jest.setTimeout(30000);

  let dbContainer: StartedPostgreSqlContainer;
  let pool: Pool;

  const testDbConfig = {
    user: "postgres",
    password: "postgres",
    database: "postgres",
  };

  beforeEach(async () => {
    console.log("Before...");
    dbContainer = await new PostgreSqlContainer()
      .withUsername("postgres")
      .withPassword("postgres")
      .withDatabase("postgres")
      .start();
    pool = new Pool({
      ...testDbConfig,
      port: dbContainer.getMappedPort(5432),
    });
  });

  afterEach(() => {
    console.log("After...");
  });

  it("spins up and responds to an SQL command", async () => {
    const records = await pool.query<{ pointId: string }>(
      "SELECT * FROM public.point",
    );
    expect(records.rows.length).toBe(1);
  });
});
