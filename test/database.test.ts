import {
  GenericContainer,
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
  StartedTestContainer,
  Wait,
} from "testcontainers";
import { Pool } from "pg";
import path from "path";

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
    // Create the Postgres container
    dbContainer = await new PostgreSqlContainer()
      .withDefaultLogDriver()
      .withExposedPorts(5432)
      .withWaitStrategy(
        Wait.forLogMessage("database system is ready to accept connections"),
      )
      .withUsername("postgres")
      .withPassword("postgres")
      .withDatabase("postgres")
      .withStartupTimeout(180000)
      .start();

    // Get the container IP for Postgres DB
    const databaseContainerIp = await getContainerActualIp(dbContainer);
    if (!databaseContainerIp) {
      await dbContainer.stop({ removeVolumes: true });
      throw new Error("Unable to determine test Postgres container IP address");
    }
    const migrationPath = path.resolve("migrations");
    const migrateCommand = "";
    // Use a generic container for Flyway (migrations)
    await new GenericContainer("flyway/flyway:7")
      .withDefaultLogDriver()
      .withWaitStrategy(Wait.forLogMessage("Successfully applied"))
      .withCommand([migrateCommand])
      .withBindMounts([{ source: migrationPath, target: "/flyway/sql" }])
      .withStartupTimeout(180000)
      .start();

    // Get a connection pool to the Postgres container
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

const getContainerActualIp = async (container: StartedTestContainer) => {
  const getIpCmd = await container.exec(["hostname", "-I"]);
  const matches = /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/.exec(
    getIpCmd.output.trim(),
  );
  return matches ? matches[0] : undefined;
};
