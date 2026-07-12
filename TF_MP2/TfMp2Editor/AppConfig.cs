namespace TfMp2Editor;

internal static class AppConstants
{
    public const string AppTitle = "TF_MP2 视图数据维护";
    public const string ViewName = "VIEW_TF_MP2";
    public const string TableName = "TF_MP2";
    public const string ChkField = "PRD_NO_CHG";
    public const string KeyMpNo = "MP_NO";
    public const string KeyItm = "ITM";
    public const string ChkColumnName = "__CHK__";

    public static readonly string[] MpNoCandidates = { "MP_NO", "分析单号", "mp_no" };
    public static readonly string[] SoNoCandidates = { "OS_NO", "订单号", "SO_NO", "so_no" };
}

internal sealed class DbConfig
{
    public string Server { get; set; } = "127.0.0.1";
    public string Port { get; set; } = "1433";
    public string Database { get; set; } = "DB_11";
    public string User { get; set; } = "SA1";
    public string Password { get; set; } = "2285";

    public string ConnectionString
    {
        get
        {
            var host = Server.Trim();
            var port = Port.Trim();
            if (!string.IsNullOrEmpty(port) && !host.Contains(',') && !host.Contains('\\'))
                host = $"{host},{port}";

            return new Microsoft.Data.SqlClient.SqlConnectionStringBuilder
            {
                DataSource = host,
                InitialCatalog = Database.Trim(),
                UserID = User.Trim(),
                Password = Password,
                TrustServerCertificate = true,
                ConnectTimeout = 8,
            }.ConnectionString;
        }
    }
}

internal static class LoginConfigStore
{
    private static readonly string ConfigPath = Path.Combine(
        AppContext.BaseDirectory,
        "login_config.json");

    public static DbConfig Load()
    {
        var cfg = new DbConfig();
        if (!File.Exists(ConfigPath)) return cfg;
        try
        {
            var json = File.ReadAllText(ConfigPath);
            using var doc = System.Text.Json.JsonDocument.Parse(json);
            var root = doc.RootElement;
            if (root.TryGetProperty("server", out var s)) cfg.Server = s.GetString() ?? cfg.Server;
            if (root.TryGetProperty("port", out var p)) cfg.Port = p.GetString() ?? cfg.Port;
            if (root.TryGetProperty("database", out var d)) cfg.Database = d.GetString() ?? cfg.Database;
            if (root.TryGetProperty("user", out var u)) cfg.User = u.GetString() ?? cfg.User;
            if (root.TryGetProperty("password", out var pw)) cfg.Password = pw.GetString() ?? cfg.Password;
        }
        catch
        {
            // ignore
        }
        return cfg;
    }

    public static void Save(DbConfig cfg)
    {
        var json = System.Text.Json.JsonSerializer.Serialize(new
        {
            server = cfg.Server,
            port = cfg.Port,
            database = cfg.Database,
            user = cfg.User,
            password = cfg.Password,
        }, new System.Text.Json.JsonSerializerOptions { WriteIndented = true });
        File.WriteAllText(ConfigPath, json);
    }
}
