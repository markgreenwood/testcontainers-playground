import {
  GenericContainer,
  Network,
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
  StartedTestContainer,
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

    // TODO: Do I need to create a Docker network for these two containers?
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

    // const dbLogs = await dbContainer.logs();
    // dbLogs.on("data", console.log);

    const dbContainerIp = dbContainer.getIpAddress(network.getName());
    const dbContainerPort = dbContainer.getPort();

    // Get the container IP for Postgres DB
    // const databaseContainerIp = await getContainerActualIp(dbContainer);
    // if (!databaseContainerIp) {
    //   await dbContainer.stop({ removeVolumes: true });
    //   throw new Error("Unable to determine test Postgres container IP address");
    // }
    const migrationPath = path.resolve("migrations");
    // -url=jdbc:postgresql://test-db:5432/postgres -schemas=public -user=postgres -password=postgres -connectRetries=60 migrate
    const migrateCommand = `flyway -url=jdbc:postgresql://${dbContainerIp}:${dbContainerPort}/postgres -schemas=public -user=postgres -password=postgres migrate`;
    // Use a generic container for Flyway (migrations)
    const flywayContainer = await new GenericContainer("flyway/flyway:7")
      .withNetwork(network)
      .withWaitStrategy(Wait.forLogMessage("Successfully applied"))
      .withDefaultLogDriver()
      .withCommand([migrateCommand])
        // Use instead of .withBindMounts (no longer recommended)
      .withCopyDirectoriesToContainer([
        { source: migrationPath, target: "/flyway/sql" },
      ])
      .withStartupTimeout(180000)
      .start();

    console.log("Flyway container started...");

    // const migrationLogs = await flywayContainer.logs();
    // migrationLogs.on("data", console.log);

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
      "SELECT * FROM public.test_item",
    );
    expect(records.rows.length).toBe(1);
  });
});

const getContainerActualIp = async (container: StartedTestContainer) => {
  const getIpCmd = await container.exec(["hostname", "-I"]);
  console.log(getIpCmd);
  const logs = await container.logs();
  logs.on("data", console.log);
  const matches = /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/.exec(
    getIpCmd.output.trim(),
  );
  return matches ? matches[0] : undefined;
};
