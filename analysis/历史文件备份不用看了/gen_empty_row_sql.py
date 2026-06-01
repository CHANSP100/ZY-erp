# -*- coding: utf-8 -*-
from pathlib import Path

keep = Path(__file__).parent.joinpath("keep_tables_44.txt").read_text(encoding="utf-8").splitlines()
keep = [t.strip() for t in keep if t.strip()]

lines = [
    "SET NOCOUNT ON;",
    "IF OBJECT_ID('tempdb..#r') IS NOT NULL DROP TABLE #r;",
    "CREATE TABLE #r (Tbl sysname, Total bigint, EmptyRows bigint, KeepRows bigint);",
    "",
]

for tbl in keep:
    lines.append(f"-- {tbl}")
    lines.append(
        f"IF OBJECT_ID(N'dbo.{tbl}', N'U') IS NOT NULL BEGIN "
        f"INSERT #r SELECT N'{tbl}', COUNT(*), 0, 0 FROM dbo.[{tbl}]; END;"
    )
    # Simpler: use dynamic SQL in one block per table for empty detection
    lines.append(f"""
IF OBJECT_ID(N'dbo.{tbl}', N'U') IS NOT NULL
BEGIN
  DECLARE @t bigint, @e bigint;
  SELECT @t = COUNT(*) FROM dbo.[{tbl}];
  ;WITH cols AS (
    SELECT c.name, ty.name AS typ
    FROM sys.columns c
    JOIN sys.types ty ON c.user_type_id = ty.user_type_id
    WHERE c.object_id = OBJECT_ID(N'dbo.{tbl}')
  )
  SELECT @e = 0; -- placeholder
  UPDATE #r SET Total = @t, EmptyRows = 0, KeepRows = @t WHERE Tbl = N'{tbl}';
END;
""")

# Better approach: single Python-driven sqlcmd per table is slow.
# Generate dynamic SQL that builds AND clause for each column

import subprocess

out = Path(__file__).parent / "db11_row_empty_check.sql"
parts = [
    "SET NOCOUNT ON;",
    "IF OBJECT_ID('tempdb..#r') IS NOT NULL DROP TABLE #r;",
    "CREATE TABLE #r (Tbl sysname, Total bigint, EmptyRows bigint, KeepRows bigint);",
    "GO",
]

for tbl in keep:
    parts.append(f"""
IF OBJECT_ID(N'dbo.[{tbl}]', N'U') IS NOT NULL
BEGIN
  DECLARE @sql nvarchar(max), @total bigint, @empty bigint;
  SELECT @total = COUNT(*) FROM dbo.[{tbl}];
  SELECT @sql = N'SELECT @e = COUNT(*) FROM dbo.[{tbl}] WHERE ' + STUFF((
    SELECT N' AND (' + QUOTENAME(c.name) + N' IS NULL OR NULLIF(LTRIM(RTRIM(CAST(' + QUOTENAME(c.name) + N' AS nvarchar(max)))), N'''') IS NULL)'
    FROM sys.columns c
    WHERE c.object_id = OBJECT_ID(N'dbo.[{tbl}]')
    FOR XML PATH(''), TYPE).value('.','nvarchar(max)'), 1, 5, N'');
  IF @sql IS NULL SET @empty = 0;
  ELSE BEGIN
    DECLARE @e bigint;
    EXEC sp_executesql @sql, N'@e bigint OUT', @e OUT;
    SET @empty = ISNULL(@e, 0);
  END;
  INSERT #r VALUES (N'{tbl}', @total, @empty, @total - @empty);
END
ELSE INSERT #r VALUES (N'{tbl}', 0, 0, 0);
GO
""")

parts.append("SELECT * FROM #r ORDER BY Total DESC;")
out.write_text("\n".join(parts), encoding="utf-8")
print("written", out, "tables", len(keep))
