CREATE USER db_admin WITH LOGIN PASSWORD 'rotateme';

GRANT CONNECT ON DATABASE postgres TO db_admin;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO db_admin;

CREATE TABLE IF NOT EXISTS public.test_item(
    id VARCHAR(100) UNIQUE NOT NULL,
    description VARCHAR(100),
    created timestamptz DEFAULT current_timestamp,
    PRIMARY KEY (id)
);
