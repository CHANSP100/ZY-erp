# -*- coding: utf-8 -*-
import subprocess
from pathlib import Path

base = Path(__file__).parent
keep = sorted(t.strip().upper() for t in (base / "keep_tables_44.txt").read_text().splitlines() if t.strip())
inl = ",".join(f"N'{t}'" for t in keep)
sql = f"""SET NOCOUNT ON;
SELECT REPLACE(f.TAB_NAME,'.DB','') AS TabName, f.FLD_NO, f.FLD_NAME, f.FLD_TYPE, f.FLD_LEN, f.ISPK, f.NOTE
FROM DICT_FLD f
WHERE REPLACE(f.TAB_NAME,'.DB','') IN ({inl})
ORDER BY TabName, f.FLD_NO"""
out = base / "dict_fld_keep44.txt"
subprocess.run(
    ["sqlcmd", "-S", "127.0.0.1", "-d", "SunSystem", "-U", "SA", "-P", "2285", "-C", "-s", "|", "-W", "-o", str(out), "-Q", sql],
    check=True,
)
print("exported", len(keep), "tables ->", out)
