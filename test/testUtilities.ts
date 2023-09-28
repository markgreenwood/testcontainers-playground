import path from "path";
import { Pool, PoolConfig } from "pg";
import { GenericContainer, Network, Wait } from "testcontainers";
import { PostgreSqlContainer } from "@testcontainers/postgresql";

/**
 * Creates external containerized Postgres DB using testcontainers
 *   and initializes it by running migrations with Flyway.
 *
 * @param {PoolConfig} config - Configuration to pass to Postgres. Info like host and
 *   port will be ignored because those will be obtained from the running
 *   container.
 * @param migrationRelativePath - Relative path to the directory for DB
 *   migrations to be read and executed by Flyway.
 * @returns {PoolConfig} - Modified pool config to use when obtaining
 *   clients for your tests. It will have the port set to the port of the
 *   running DB container.
 */
export const createTestDatabaseWithTestContainers = async (
  config: PoolConfig,
  migrationRelativePath: string,
): Promise<PoolConfig> => {
  const network = await new Network().start();

  const dbContainer = await new PostgreSqlContainer()
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

  const migrationPath = path.resolve(migrationRelativePath);
  const migrateCommand = [
    `-url=jdbc:postgresql://${dbContainerIp}:${dbContainerPort}/postgres`,
    "-schemas=public",
    "-user=postgres",
    "-password=postgres",
    "migrate",
  ];
  await new GenericContainer("flyway/flyway:7")
    .withNetwork(network)
    .withWaitStrategy(Wait.forLogMessage("Successfully applied"))
    .withDefaultLogDriver()
    .withCommand(migrateCommand)
    .withCopyDirectoriesToContainer([
      { source: migrationPath, target: "/flyway/sql" },
    ])
    .withStartupTimeout(180000)
    .start();

  // Get a connection pool to the Postgres container
  const poolConfig = {
    ...config,
    port: dbContainer.getMappedPort(5432),
  };

  return poolConfig;
};

export const baseTestPoolConfig = {
  user: "postgres",
  password: "postgres",
  database: "postgres",
};

/**
 * This should do whatever you need to do to clear the database between
 *   tests to insure test isolation (no coupling via side effects).
 *
 * The name of the method should emphasize to be careful when using
 *   it. You *are* wiping out anything in whatever database this points to,
 *   so beware and don't point it at the wrong thing!
 *
 * @param {Pool} client - A handle (connection pool) to the target database.
 */
export const dangerouslyClearTestDatabase = async (client: Pool) => {
  await client.query({
    text: "TRUNCATE public.test_item CASCADE",
  });
};
