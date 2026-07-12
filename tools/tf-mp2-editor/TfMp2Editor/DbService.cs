using Microsoft.Data.SqlClient;

namespace TfMp2Editor;

internal sealed class ViewMetadata
{
    public List<string> Columns { get; init; } = [];
    public string MpNoColumn { get; init; } = "";
    public string SoNoColumn { get; init; } = "";
    public string KeyMpColumn { get; init; } = "";
    public string KeyItmColumn { get; init; } = "";
    public string ChkColumn { get; init; } = "";
}

internal sealed class GridRowModel
{
    public Dictionary<string, object?> Raw { get; init; } = new(StringComparer.OrdinalIgnoreCase);
    public bool Checked { get; set; }
    public bool OrigChecked { get; set; }
    public bool DeleteMark { get; set; }
    public string OrigPrdNoChg { get; set; } = "";

    public object? MpNo => Raw.TryGetValue(KeyMp, out var v) ? v : null;
    public object? Itm => Raw.TryGetValue(KeyItm, out var v) ? v : null;

    internal string KeyMp { get; set; } = AppConstants.KeyMpNo;
    internal string KeyItm { get; set; } = AppConstants.KeyItm;

    public bool CheckboxDirty => Checked != OrigChecked;

    public string DisplayValue(string column)
    {
        if (!Raw.TryGetValue(column, out var val) || val is null || val is DBNull)
            return "";
        if (val is DateTime dt) return dt.ToString("yyyy-MM-dd HH:mm:ss");
        return Convert.ToString(val) ?? "";
    }
}

internal sealed class DbService
{
    private readonly DbConfig _cfg;
    public ViewMetadata Meta { get; private set; } = new();

    public DbService(DbConfig cfg)
    {
        _cfg = cfg;
    }

    private SqlConnection Open() => new(_cfg.ConnectionString);

    private static string? PickColumn(IReadOnlyList<string> columns, IEnumerable<string> candidates)
    {
        var map = columns.ToDictionary(c => c, c => c, StringComparer.OrdinalIgnoreCase);
        foreach (var name in candidates)
            if (map.TryGetValue(name, out var actual))
                return actual;
        return null;
    }

    public void TestConnection()
    {
        using var conn = Open();
        conn.Open();
    }

    public void InitMetadata()
    {
        using var conn = Open();
        conn.Open();
        var columns = LoadViewColumns(conn);
        var mp = PickColumn(columns, AppConstants.MpNoCandidates)
            ?? throw new InvalidOperationException("视图中未找到「分析单号」或 MP_NO 字段");
        var so = PickColumn(columns, AppConstants.SoNoCandidates)
            ?? throw new InvalidOperationException("视图中未找到「订单号」或 SO_NO 字段");
        var keyMp = PickColumn(columns, new[] { AppConstants.KeyMpNo, "mp_no" })
            ?? throw new InvalidOperationException("视图中未找到 MP_NO 关联字段");
        var keyItm = PickColumn(columns, new[] { AppConstants.KeyItm, "itm" })
            ?? throw new InvalidOperationException("视图中未找到 ITM 关联字段");
        var chk = PickColumn(columns, new[] { AppConstants.ChkField, "prd_no_chg" })
            ?? throw new InvalidOperationException("视图中未找到 PRD_NO_CHG 字段");

        Meta = new ViewMetadata
        {
            Columns = columns,
            MpNoColumn = mp,
            SoNoColumn = so,
            KeyMpColumn = keyMp,
            KeyItmColumn = keyItm,
            ChkColumn = chk,
        };
    }

    private static List<string> LoadViewColumns(SqlConnection conn)
    {
        var cols = new List<string>();
        using (var cmd = conn.CreateCommand())
        {
            cmd.CommandText = """
                SELECT c.COLUMN_NAME
                FROM INFORMATION_SCHEMA.COLUMNS c
                WHERE c.TABLE_NAME = @table
                ORDER BY c.ORDINAL_POSITION
                """;
            cmd.Parameters.AddWithValue("@table", AppConstants.ViewName);
            using var reader = cmd.ExecuteReader();
            while (reader.Read())
                cols.Add(reader.GetString(0));
        }

        if (cols.Count == 0)
        {
            using var cmd = conn.CreateCommand();
            cmd.CommandText = $"SELECT TOP 0 * FROM {AppConstants.ViewName}";
            using var reader = cmd.ExecuteReader();
            for (var i = 0; i < reader.FieldCount; i++)
                cols.Add(reader.GetName(i));
        }

        if (cols.Count == 0)
            throw new InvalidOperationException($"视图 {AppConstants.ViewName} 不存在或无法读取列信息");

        return cols;
    }

    public List<string> FetchDistinctMpNos()
    {
        return FetchDistinct(Meta.MpNoColumn);
    }

    public List<string> FetchDistinctSoNos()
    {
        return FetchDistinct(Meta.SoNoColumn);
    }

    private List<string> FetchDistinct(string column)
    {
        using var conn = Open();
        conn.Open();
        using var cmd = conn.CreateCommand();
        cmd.CommandText = $"""
            SELECT DISTINCT CAST([{column}] AS nvarchar(100)) AS v
            FROM {AppConstants.ViewName}
            WHERE [{column}] IS NOT NULL AND CAST([{column}] AS nvarchar(100)) <> ''
            ORDER BY v
            """;
        var list = new List<string>();
        using var reader = cmd.ExecuteReader();
        while (reader.Read())
        {
            var v = reader.IsDBNull(0) ? "" : reader.GetString(0).Trim();
            if (!string.IsNullOrEmpty(v)) list.Add(v);
        }
        return list;
    }

    public List<GridRowModel> QueryRows(string? mpNo, string? soNo)
    {
        using var conn = Open();
        conn.Open();
        using var cmd = conn.CreateCommand();
        var where = new List<string>();
        if (!string.IsNullOrWhiteSpace(mpNo))
        {
            where.Add($"CAST([{Meta.MpNoColumn}] AS nvarchar(100)) = @mp_no");
            cmd.Parameters.AddWithValue("@mp_no", mpNo.Trim());
        }
        if (!string.IsNullOrWhiteSpace(soNo))
        {
            where.Add($"CAST([{Meta.SoNoColumn}] AS nvarchar(100)) = @so_no");
            cmd.Parameters.AddWithValue("@so_no", soNo.Trim());
        }

        cmd.CommandText = $"SELECT * FROM {AppConstants.ViewName}";
        if (where.Count > 0)
            cmd.CommandText += " WHERE " + string.Join(" AND ", where);
        cmd.CommandText += $" ORDER BY [{Meta.KeyMpColumn}], [{Meta.KeyItmColumn}]";

        var rows = new List<GridRowModel>();
        using var reader = cmd.ExecuteReader();
        while (reader.Read())
        {
            var raw = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);
            for (var i = 0; i < reader.FieldCount; i++)
                raw[reader.GetName(i)] = reader.IsDBNull(i) ? null : reader.GetValue(i);

            var chkVal = raw.TryGetValue(Meta.ChkColumn, out var c) ? c : null;
            var checkedState = IsChecked(chkVal);
            rows.Add(new GridRowModel
            {
                Raw = raw,
                Checked = checkedState,
                OrigChecked = checkedState,
                OrigPrdNoChg = FormatVal(chkVal),
                KeyMp = Meta.KeyMpColumn,
                KeyItm = Meta.KeyItmColumn,
            });
        }
        return rows;
    }

    public int DeleteRows(IEnumerable<(object? MpNo, object? Itm)> keys)
    {
        var keyList = keys.ToList();
        if (keyList.Count == 0) return 0;

        using var conn = Open();
        conn.Open();
        using var tx = conn.BeginTransaction();
        var deleted = 0;
        try
        {
            foreach (var (mpNo, itm) in keyList)
            {
                using var cmd = conn.CreateCommand();
                cmd.Transaction = tx;
                cmd.CommandText = $"""
                    DELETE FROM {AppConstants.TableName}
                    WHERE [{AppConstants.KeyMpNo}] = @mp_no AND [{AppConstants.KeyItm}] = @itm
                    """;
                cmd.Parameters.AddWithValue("@mp_no", mpNo ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@itm", itm ?? DBNull.Value);
                deleted += cmd.ExecuteNonQuery();
            }
            tx.Commit();
            return deleted;
        }
        catch
        {
            tx.Rollback();
            throw;
        }
    }

    public void UpdatePrdNoChg(object? mpNo, object? itm, string value)
    {
        using var conn = Open();
        conn.Open();
        using var cmd = conn.CreateCommand();
        cmd.CommandText = $"""
            UPDATE {AppConstants.TableName}
            SET [{AppConstants.ChkField}] = @val
            WHERE [{AppConstants.KeyMpNo}] = @mp_no AND [{AppConstants.KeyItm}] = @itm
            """;
        cmd.Parameters.AddWithValue("@val", value);
        cmd.Parameters.AddWithValue("@mp_no", mpNo ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@itm", itm ?? DBNull.Value);
        cmd.ExecuteNonQuery();
    }

    public static bool IsChecked(object? val)
    {
        if (val is null or DBNull) return false;
        return !string.IsNullOrWhiteSpace(Convert.ToString(val));
    }

    public static string CheckedValue(object? original, bool wantChecked)
    {
        if (!wantChecked) return "";
        var s = original is null or DBNull ? "" : Convert.ToString(original)?.Trim() ?? "";
        return string.IsNullOrEmpty(s) ? "Y" : s;
    }

    private static string FormatVal(object? val)
    {
        if (val is null or DBNull) return "";
        return Convert.ToString(val) ?? "";
    }
}
