import {
  GenericContainer,
  Network,
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
  Wait,
} from "testcontainers";
import { Pool } from "pg";
import * as path from "path";

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

    const network = await new Network().start();

    // Create the Postgres container
    dbContainer = await new PostgreSqlContainer()
      .withNetwork(network)
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

    const dbContainerIp = dbContainer.getIpAddress(network.getName());
    const dbContainerPort = 5432;

    const migrationPath = path.resolve("migrations");
    const migrateCommand = [
      `-url=jdbc:postgresql://${dbContainerIp}:${dbContainerPort}/postgres`,
      "-schemas=public",
      "-user=postgres",
      "-password=postgres",
      "migrate",
    ];
    // Use a generic container for Flyway (migrations)
    await new GenericContainer("flyway/flyway:7")
      .withNetwork(network)
      .withWaitStrategy(Wait.forLogMessage("Successfully applied"))
      .withDefaultLogDriver()
      .withLogConsumer(logstream => logstream.on("data", console.log))
      .withCommand(migrateCommand)
      // Use instead of .withBindMounts (no longer recommended)
      .withCopyDirectoriesToContainer([
        { source: migrationPath, target: "/flyway/sql" },
      ])
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
    await pool.query({
      text: "INSERT INTO public.test_item (id, description) VALUES ($1, $2)",
      values: ["id-1", "Description of item 1"],
    });
    const records = await pool.query<{ id: string; description: string }>(
      "SELECT * FROM public.test_item",
    );
    expect(records.rows.length).toBe(1);
    expect(records.rows[0].description).toBe("Description of item 1");
  });
});
