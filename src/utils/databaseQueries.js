/**
 * Database metadata queries for different database types
 * These queries extract table structure, columns, and relationships
 */

/**
 * Get the appropriate metadata query for the selected database type
 * @param {string} dbType - The database type (snowflake, mysql, postgresql, sqlserver, oracle)
 * @returns {string} - The metadata query for the selected database
 */
export const getMetadataQuery = (dbType) => {
  switch (dbType) {
    case 'snowflake':
      return getSnowflakeQuery();
    case 'mysql':
      return getMySQLQuery();
    case 'postgresql':
      return getPostgreSQLQuery();
    case 'sqlserver':
      return getSQLServerQuery();
    case 'oracle':
      return getOracleQuery();
    default:
      return getSnowflakeQuery();
  }
};

/**
 * Get the metadata query for Snowflake
 * @returns {string} - The Snowflake metadata query
 */
const getSnowflakeQuery = () => {
  return `SELECT 
    'snowflake' AS dbms,
    CURRENT_DATABASE() AS DATABASE_NAME,
    t.TABLE_SCHEMA,
    t.TABLE_NAME,
    c.COLUMN_NAME,
    c.ORDINAL_POSITION,
    c.DATA_TYPE,
    c.CHARACTER_MAXIMUM_LENGTH
FROM 
    INFORMATION_SCHEMA.TABLES t
JOIN 
    INFORMATION_SCHEMA.COLUMNS c
    ON t.TABLE_SCHEMA = c.TABLE_SCHEMA 
    AND t.TABLE_NAME = c.TABLE_NAME
WHERE 
    t.TABLE_TYPE = 'BASE TABLE'
    AND t.TABLE_SCHEMA NOT IN ('INFORMATION_SCHEMA')
ORDER BY 
    t.TABLE_SCHEMA,
    t.TABLE_NAME,
    c.ORDINAL_POSITION;`;
};

/**
 * Get the metadata query for MySQL
 * @returns {string} - The MySQL metadata query
 */
const getMySQLQuery = () => {
  return `SELECT
    'mysql' AS dbms,
    c.TABLE_SCHEMA,
    c.TABLE_NAME,
    c.COLUMN_NAME,
    c.ORDINAL_POSITION,
    c.DATA_TYPE,
    c.CHARACTER_MAXIMUM_LENGTH,
    tc.CONSTRAINT_TYPE,
    kcu.REFERENCED_TABLE_SCHEMA,
    kcu.REFERENCED_TABLE_NAME,
    kcu.REFERENCED_COLUMN_NAME
FROM
    INFORMATION_SCHEMA.COLUMNS c
JOIN
    INFORMATION_SCHEMA.TABLES t
    ON c.TABLE_SCHEMA = t.TABLE_SCHEMA
    AND c.TABLE_NAME = t.TABLE_NAME
LEFT JOIN
    INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
    ON c.TABLE_SCHEMA = kcu.TABLE_SCHEMA
    AND c.TABLE_NAME = kcu.TABLE_NAME
    AND c.COLUMN_NAME = kcu.COLUMN_NAME
LEFT JOIN
    INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
    ON kcu.CONSTRAINT_SCHEMA = tc.CONSTRAINT_SCHEMA
    AND kcu.CONSTRAINT_NAME = tc.CONSTRAINT_NAME
    AND kcu.TABLE_SCHEMA = tc.TABLE_SCHEMA
    AND kcu.TABLE_NAME = tc.TABLE_NAME
WHERE
    t.TABLE_TYPE = 'BASE TABLE'
    AND c.TABLE_SCHEMA NOT IN ('information_schema', 'mysql', 'performance_schema', 'sys')
ORDER BY
    c.TABLE_SCHEMA, c.TABLE_NAME, c.ORDINAL_POSITION;`;
};

/**
 * Get the metadata query for PostgreSQL
 * @returns {string} - The PostgreSQL metadata query
 */
const getPostgreSQLQuery = () => {
  return `SELECT
    'postgresql' AS dbms,
    c.table_schema,
    c.table_name,
    c.column_name,
    c.ordinal_position,
    c.data_type,
    c.character_maximum_length,
    tc.constraint_type,
    ccu.table_schema AS referenced_table_schema,
    ccu.table_name AS referenced_table_name,
    ccu.column_name AS referenced_column_name
FROM
    information_schema.columns c
JOIN
    information_schema.tables t
    ON c.table_schema = t.table_schema
    AND c.table_name = t.table_name
LEFT JOIN
    information_schema.key_column_usage kcu
    ON c.table_schema = kcu.table_schema
    AND c.table_name = kcu.table_name
    AND c.column_name = kcu.column_name
LEFT JOIN
    information_schema.table_constraints tc
    ON kcu.constraint_schema = tc.constraint_schema
    AND kcu.constraint_name = tc.constraint_name
    AND kcu.table_schema = tc.table_schema
    AND kcu.table_name = tc.table_name
LEFT JOIN
    information_schema.constraint_column_usage ccu
    ON tc.constraint_schema = ccu.constraint_schema
    AND tc.constraint_name = ccu.constraint_name
    AND tc.constraint_type = 'FOREIGN KEY'
WHERE
    t.table_type = 'BASE TABLE'
    AND c.table_schema NOT IN ('information_schema', 'pg_catalog')
ORDER BY
    c.table_schema, c.table_name, c.ordinal_position;`;
};

/**
 * Get the metadata query for SQL Server
 * @returns {string} - The SQL Server metadata query
 */
const getSQLServerQuery = () => {
  return `SELECT
    'sqlserver' AS dbms,
    SCHEMA_NAME(t.schema_id) AS TABLE_SCHEMA,
    t.name AS TABLE_NAME,
    c.name AS COLUMN_NAME,
    c.column_id AS ORDINAL_POSITION,
    typ.name AS DATA_TYPE,
    CASE WHEN typ.name IN ('char', 'varchar', 'nchar', 'nvarchar') THEN c.max_length ELSE NULL END AS CHARACTER_MAXIMUM_LENGTH,
    CASE 
        WHEN fk.name IS NOT NULL THEN 'FOREIGN KEY'
        WHEN pk.name IS NOT NULL THEN 'PRIMARY KEY'
        WHEN uk.name IS NOT NULL THEN 'UNIQUE'
        ELSE NULL
    END AS CONSTRAINT_TYPE,
    SCHEMA_NAME(rt.schema_id) AS REFERENCED_TABLE_SCHEMA,
    rt.name AS REFERENCED_TABLE_NAME,
    rc.name AS REFERENCED_COLUMN_NAME
FROM
    sys.tables t
INNER JOIN
    sys.columns c ON t.object_id = c.object_id
INNER JOIN
    sys.types typ ON c.user_type_id = typ.user_type_id
LEFT JOIN
    sys.key_constraints pk ON t.object_id = pk.parent_object_id AND pk.type = 'PK'
LEFT JOIN
    sys.key_constraints uk ON t.object_id = uk.parent_object_id AND uk.type = 'UQ'
LEFT JOIN
    sys.index_columns ic ON pk.parent_object_id = ic.object_id AND pk.unique_index_id = ic.index_id AND c.column_id = ic.column_id
LEFT JOIN
    sys.foreign_keys fk ON t.object_id = fk.parent_object_id
LEFT JOIN
    sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id AND c.column_id = fkc.parent_column_id
LEFT JOIN
    sys.tables rt ON fk.referenced_object_id = rt.object_id
LEFT JOIN
    sys.columns rc ON fk.referenced_object_id = rc.object_id AND fkc.referenced_column_id = rc.column_id
WHERE
    t.is_ms_shipped = 0
ORDER BY
    TABLE_SCHEMA, TABLE_NAME, ORDINAL_POSITION;`;
};

/**
 * Get the metadata query for Oracle
 * @returns {string} - The Oracle metadata query
 */
const getOracleQuery = () => {
  return `SELECT
    'oracle' AS dbms,
    c.OWNER AS TABLE_SCHEMA,
    c.TABLE_NAME,
    c.COLUMN_NAME,
    c.COLUMN_ID AS ORDINAL_POSITION,
    c.DATA_TYPE,
    c.CHAR_LENGTH AS CHARACTER_MAXIMUM_LENGTH,
    CASE
        WHEN cc.CONSTRAINT_TYPE = 'P' THEN 'PRIMARY KEY'
        WHEN cc.CONSTRAINT_TYPE = 'U' THEN 'UNIQUE'
        WHEN cc.CONSTRAINT_TYPE = 'R' THEN 'FOREIGN KEY'
        ELSE NULL
    END AS CONSTRAINT_TYPE,
    r.OWNER AS REFERENCED_TABLE_SCHEMA,
    r.TABLE_NAME AS REFERENCED_TABLE_NAME,
    r.COLUMN_NAME AS REFERENCED_COLUMN_NAME
FROM
    ALL_TAB_COLUMNS c
JOIN
    ALL_TABLES t ON c.OWNER = t.OWNER AND c.TABLE_NAME = t.TABLE_NAME
LEFT JOIN
    ALL_CONS_COLUMNS cc ON c.OWNER = cc.OWNER AND c.TABLE_NAME = cc.TABLE_NAME AND c.COLUMN_NAME = cc.COLUMN_NAME
LEFT JOIN
    ALL_CONSTRAINTS con ON cc.OWNER = con.OWNER AND cc.CONSTRAINT_NAME = con.CONSTRAINT_NAME
LEFT JOIN
    ALL_CONS_COLUMNS r ON con.R_OWNER = r.OWNER AND con.R_CONSTRAINT_NAME = r.CONSTRAINT_NAME
WHERE
    c.OWNER NOT IN ('SYS', 'SYSTEM', 'OUTLN', 'DBSNMP')
ORDER BY
    c.OWNER, c.TABLE_NAME, c.COLUMN_ID;`;
};
