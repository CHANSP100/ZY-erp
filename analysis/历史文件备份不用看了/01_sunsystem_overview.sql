-- Run in VS Code MSSQL against profile "SUNSYSTEM" (active connection)
-- 01: Database overview

SET NOCOUNT ON;

SELECT DB_NAME() AS CurrentDatabase, @@VERSION AS SqlVersion;

SELECT
    s.name AS SchemaName,
    t.name AS TableName,
    SUM(p.rows) AS [RowCount]
FROM sys.tables t
JOIN sys.schemas s ON t.schema_id = s.schema_id
JOIN sys.partitions p ON t.object_id = p.object_id AND p.index_id IN (0, 1)
GROUP BY s.name, t.name
ORDER BY SUM(p.rows) DESC, s.name, t.name;

SELECT
    OBJECT_SCHEMA_NAME(v.object_id) AS SchemaName,
    v.name AS ViewName
FROM sys.views v
ORDER BY 1, 2;
