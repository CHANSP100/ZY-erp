# -*- coding: utf-8 -*-
import subprocess
from pathlib import Path

base = Path(__file__).parent
keep = [t.strip() for t in (base / "keep_tables_44.txt").read_text(encoding="utf-8").splitlines() if t.strip()]
lines_out = ["Tbl|Total|EmptyRows|KeepRows", "---|---:|---:|---:"]

for tbl in keep:
    sql = f"""
SET QUOTED_IDENTIFIER ON;
SET NOCOUNT ON;
IF OBJECT_ID(N'dbo.[{tbl}]', N'U') IS NULL
  SELECT N'{tbl}' AS Tbl, 0 AS Total, 0 AS EmptyRows, 0 AS KeepRows;
ELSE
BEGIN
  DECLARE @sql nvarchar(max), @total bigint, @empty bigint, @e bigint;
  SELECT @total = COUNT(*) FROM dbo.[{tbl}];
  SELECT @sql = N'SELECT @e = COUNT(*) FROM dbo.[{tbl}] WHERE ' + STUFF((
    SELECT N' AND (' + QUOTENAME(c.name) + N' IS NULL OR LEN(LTRIM(RTRIM(CONVERT(nvarchar(max), ' + QUOTENAME(c.name) + N')))) = 0)'
    FROM sys.columns c WHERE c.object_id = OBJECT_ID(N'dbo.[{tbl}]')
    FOR XML PATH(''), TYPE).value('.','nvarchar(max)'), 1, 5, N'');
  IF @sql IS NULL SET @empty = 0;
  ELSE BEGIN EXEC sp_executesql @sql, N'@e bigint OUT', @e OUT; SET @empty = ISNULL(@e, 0); END;
  SELECT N'{tbl}' AS Tbl, @total AS Total, @empty AS EmptyRows, @total - @empty AS KeepRows;
END
"""
    r = subprocess.run(
        [
            "sqlcmd", "-S", "127.0.0.1", "-d", "DB_11", "-U", "SA", "-P", "2285", "-C",
            "-W", "-s", "|", "-Q", sql,
        ],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="ignore",
    )
    for line in r.stdout.splitlines():
        if "|" not in line or line.startswith("-") or line.startswith("Tbl"):
            continue
        parts = [p.strip() for p in line.split("|")]
        if len(parts) >= 4 and parts[0].upper() == tbl.upper():
            try:
                int(parts[1].replace(",", ""))
                lines_out.append(f"{parts[0]}|{parts[1]}|{parts[2]}|{parts[3]}")
            except ValueError:
                pass
            break
    else:
        err = (r.stderr or r.stdout or "")[:200].replace("\n", " ")
        lines_out.append(f"{tbl}|?|?|?  # parse_fail {err}")

out = base / "db11_row_empty_stats.txt"
out.write_text("\n".join(lines_out) + "\n", encoding="utf-8")
print("done", len(lines_out) - 2, "tables")
